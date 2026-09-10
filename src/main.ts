import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

// Load .env before anything reads config.
loadEnv({ path: resolve(process.cwd(), '.env') });

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  // Fall back to 3000 when PORT is unset or not a usable positive integer
  // (e.g. empty/0 injected by some sandboxed shells). Real deployments that
  // set PORT deliberately always win.
  const configuredPort = Number(configService.get('PORT'));
  const port = Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : 3000;
  const isProd = configService.get('NODE_ENV') === 'production';
  const apiPrefix = configService.get('API_PREFIX') ?? 'api';
  const version = configService.get('GLOBAL_PREFIX_VERSION') ?? 'v1';

  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: isProd ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression() as unknown as (req: unknown, res: unknown, next: () => void) => void);
  app.enable('trust proxy'); // needed for correct client IPs behind proxies/load balancers

  // CORS
  const corsOrigins = (configService.get<string>('CORS_ORIGINS') ?? '*')
    .split(',')
    .map((o: string) => o.trim());
  app.enableCors({
    origin: corsOrigins.includes('*') ? true : corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: false,
      transform: true, // enable DTO type coercion (query params to numbers etc.)
      transformOptions: { enableImplicitConversion: false },
      disableErrorMessages: isProd,
      validationError: { target: false, value: false },
    }),
  );

  // RFC7807-style error envelope (also registered via APP_FILTER in AppModule;
  // kept global registration single-source in AppModule — this is a no-op safeguard)
  // app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger (disabled in production by default)
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('SynapGrid API')
      .setDescription(
        'REST API for SynapGrid Technologies: support tickets, newsletter subscriptions, services catalog and administration.\n\n' +
          'Auth: POST /api/v1/auth/login → use the returned accessToken as a Bearer token.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Auth', 'Login, refresh, logout and user administration')
      .addTag('Tickets', 'Public ticket creation/tracking and staff management')
      .addTag('Newsletter', 'Double opt-in subscriptions')
      .addTag('Services', 'Public services catalog and admin CRUD')
      .addTag('Health', 'Liveness and readiness')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(port);
  console.log(`🚀 ${configService.get('APP_NAME')} listening on http://localhost:${port}/${apiPrefix}/${version}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}

void bootstrap();
