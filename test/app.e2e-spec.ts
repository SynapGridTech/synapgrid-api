import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/modules/users/users.service';
import { NewsletterSubscriber } from '../src/modules/newsletter/entities/newsletter-subscriber.entity';
import { generateSecureToken, sha256Hex } from '../src/common/utils/strings.util';

describe('SynapGrid API (e2e)', () => {
  let app: INestApplication;
  let dbFile: string;
  let adminAccessToken: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_SECRET = 'e2e-access-secret-0123456789abcdef0123456789';
    process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret-0123456789abcdef012345678';
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_SYNCHRONIZE = 'true';
    dbFile = path.join(os.tmpdir(), `synapgrid-e2e-${Date.now()}-${process.pid}.sqlite`);
    process.env.DB_DATABASE = dbFile;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, validationError: { target: false } }),
    );
    await app.init();

    // Bootstrap an admin account directly through the service layer.
    const usersService = app.get(UsersService);
    await usersService.create({
      email: 'admin@synapgrid.net',
      password: 'Admin@123!',
      role: 'admin',
      name: 'E2E Admin',
    });
  });

  afterAll(async () => {
    await app.close();
    try {
      fs.unlinkSync(dbFile);
    } catch {
      /* best effort cleanup */
    }
  });

  it('GET /api/v1/health → 200 with database up', () =>
    request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.details.typeorm.status).toBe('up');
      }));

  it('POST /api/v1/auth/login → 200 with tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@synapgrid.net', password: 'Admin@123!' })
      .expect(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    adminAccessToken = res.body.accessToken;
  });

  it('POST /api/v1/auth/login with wrong password → 401', () =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@synapgrid.net', password: 'WrongPass1!' })
      .expect(401));

  it('GET /api/v1/auth/me → 200 without passwordHash', () =>
    request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe('admin@synapgrid.net');
        expect(res.body.passwordHash).toBeUndefined();
      }));

  it('GET /api/v1/auth/me without token → 401', () =>
    request(app.getHttpServer()).get('/api/v1/auth/me').expect(401));

  describe('Tickets', () => {
    let trackingToken: string;
    let reference: string;

    it('POST /api/v1/tickets (public) → 201 with reference and tracking token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tickets')
        .send({
          requesterName: 'Jane Customer',
          requesterEmail: 'jane@example.com',
          subject: 'Gateway integration failing',
          body: 'We keep getting 502 errors from the webhook endpoint after deploying.',
        })
        .expect(201);
      expect(res.body.ticket.reference).toMatch(/^SG-[A-Z0-9]{6}$/);
      expect(res.body.trackingToken).toBeDefined();
      trackingToken = res.body.trackingToken;
      reference = res.body.ticket.reference;
    });

    it('POST /api/v1/tickets with invalid payload → 400', () =>
      request(app.getHttpServer())
        .post('/api/v1/tickets')
        .send({ requesterName: 'X', requesterEmail: 'not-an-email', subject: 'hi', body: 'short' })
        .expect(400));

    it('POST /api/v1/tickets/track → 200 on reference + email match', () =>
      request(app.getHttpServer())
        .post('/api/v1/tickets/track')
        .send({ reference, requesterEmail: 'jane@example.com' })
        .expect(200)
        .expect((res) => {
          expect(res.body.trackingTokenHash).toBeUndefined();
          expect(res.body.messages).toHaveLength(1);
        }));

    it('POST /api/v1/tickets/track → 404 on email mismatch', () =>
      request(app.getHttpServer())
        .post('/api/v1/tickets/track')
        .send({ reference, requesterEmail: 'attacker@example.com' })
        .expect(404));

    it('GET /api/v1/tickets/:trackingToken → 200 full thread', () =>
      request(app.getHttpServer())
        .get(`/api/v1/tickets/${trackingToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.reference).toBe(reference);
          expect(res.body.trackingTokenHash).toBeUndefined();
        }));

    it('POST /api/v1/tickets/:trackingToken/replies (public) → 201', () =>
      request(app.getHttpServer())
        .post(`/api/v1/tickets/${trackingToken}/replies`)
        .send({ body: 'Additional details: the errors started after the v2 migration.' })
        .expect(201));

    it('GET /api/v1/tickets (admin) → 200 paginated envelope', () =>
      request(app.getHttpServer())
        .get('/api/v1/tickets?page=1&limit=10')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.meta).toBeDefined();
          expect(res.body.links).toBeDefined();
          expect(res.body.items.length).toBeGreaterThanOrEqual(1);
        }));

    it('GET /api/v1/tickets (admin) without token → 401', () =>
      request(app.getHttpServer()).get('/api/v1/tickets').expect(401));

    it('GET /api/v1/tickets/stats/summary (admin) → 200', () =>
      request(app.getHttpServer())
        .get('/api/v1/tickets/stats/summary')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBeGreaterThanOrEqual(1);
        }));
  });

  describe('Newsletter', () => {
    it('POST /api/v1/newsletter/subscribe → 202 with neutral message', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/newsletter/subscribe')
        .send({ email: 'reader@example.com', name: 'Ada Reader' })
        .expect(202);
      expect(res.body.message).toContain('confirm');
    });

    it('POST /api/v1/newsletter/subscribe is idempotent and never leaks existence', () =>
      request(app.getHttpServer())
        .post('/api/v1/newsletter/subscribe')
        .send({ email: 'reader@example.com' })
        .expect(202));

    it('POST /api/v1/newsletter/confirm with a valid token → 200', async () => {
      const token = generateSecureToken(24);
      const dataSource = app.get(DataSource);
      await dataSource
        .getRepository(NewsletterSubscriber)
        .update({ email: 'reader@example.com' }, { confirmationTokenHash: sha256Hex(token) });

      await request(app.getHttpServer())
        .post('/api/v1/newsletter/confirm')
        .send({ token })
        .expect(200);
    });

    it('POST /api/v1/newsletter/confirm with unknown token → 404', () =>
      request(app.getHttpServer())
        .post('/api/v1/newsletter/confirm')
        .send({ token: 'totally-invalid-token-value' })
        .expect(404));

    it('GET /api/v1/newsletter/stats (admin) → 200', () =>
      request(app.getHttpServer())
        .get('/api/v1/newsletter/stats')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.total).toBe(1);
          expect(res.body.confirmed).toBe(1);
        }));
  });

  describe('Services', () => {
    it('GET /api/v1/services (public) → 200 empty catalog', () =>
      request(app.getHttpServer())
        .get('/api/v1/services')
        .expect(200)
        .expect((res) => expect(Array.isArray(res.body.items)).toBe(true)));

    it('POST /api/v1/services/admin (admin) → 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/services/admin')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          title: 'Software & Digital Product Development',
          summary: 'Robust, scalable products from concept to deployment.',
          features: ['Web apps', 'Mobile apps'],
        })
        .expect(201);
      expect(res.body.slug).toBe('software-digital-product-development');
    });

    it('POST /api/v1/services/admin duplicate slug → 409', () =>
      request(app.getHttpServer())
        .post('/api/v1/services/admin')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ title: 'Another one', slug: 'software-digital-product-development', summary: 'Duplicate slug test.' })
        .expect(409));

    it('POST /api/v1/services/admin without auth → 401', () =>
      request(app.getHttpServer())
        .post('/api/v1/services/admin')
        .send({ title: 'Nope', summary: 'Should not be allowed at all.' })
        .expect(401));

    it('GET /api/v1/services/slug/:slug (public) → 200', () =>
      request(app.getHttpServer())
        .get('/api/v1/services/slug/software-digital-product-development')
        .expect(200)
        .expect((res) => expect(res.body.title).toContain('Software')));
  });

  it('Unknown route → 404 problem envelope', () =>
    request(app.getHttpServer())
      .get('/api/v1/does-not-exist')
      .expect(404)
      .expect((res) => {
        expect(res.body.statusCode).toBe(404);
        expect(res.body.path).toBe('/api/v1/does-not-exist');
        expect(res.body.timestamp).toBeDefined();
      }));
});
