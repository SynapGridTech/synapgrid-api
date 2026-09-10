import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema: users, refresh_tokens, tickets, ticket_messages,
 * newsletter_subscribers, services.
 * Dialect-aware: SQLite (dev default) and PostgreSQL (production).
 */
export class InitialSchema1757500000000 implements MigrationInterface {
  name = 'InitialSchema1757500000000';

  private isPostgres(queryRunner: QueryRunner): boolean {
    return queryRunner.connection.options.type === 'postgres';
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    const pg = this.isPostgres(queryRunner);
    const id = pg
      ? '"id" uuid PRIMARY KEY DEFAULT gen_random_uuid()'
      : '"id" varchar PRIMARY KEY';
    const ts = pg ? 'TIMESTAMP' : 'datetime';
    const now = 'CURRENT_TIMESTAMP';

    await queryRunner.query(`
      CREATE TABLE "users" (
        ${id},
        "email" varchar(255) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "name" varchar(255),
        "role" varchar(20) NOT NULL DEFAULT 'support',
        "is_active" boolean NOT NULL DEFAULT ${pg ? 'true' : '1'},
        "created_at" ${ts} NOT NULL DEFAULT ${now},
        "updated_at" ${ts} NOT NULL DEFAULT ${now}
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        ${id},
        "token_hash" varchar(255) NOT NULL,
        "revoked" boolean NOT NULL DEFAULT ${pg ? 'false' : '0'},
        "expires_at" ${ts},
        "created_at" ${ts} NOT NULL DEFAULT ${now},
        "revoked_at" ${ts},
        "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_token_hash" ON "refresh_tokens" ("token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "tickets" (
        ${id},
        "tracking_token_hash" varchar(64) NOT NULL,
        "reference" varchar(20) NOT NULL,
        "requester_email" varchar(255) NOT NULL,
        "requester_name" varchar(255) NOT NULL,
        "subject" varchar(255) NOT NULL,
        "body" text NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'open',
        "priority" varchar(20) NOT NULL DEFAULT 'normal',
        "category" varchar(100),
        "assigned_to_id" varchar,
        "created_at" ${ts} NOT NULL DEFAULT ${now},
        "updated_at" ${ts} NOT NULL DEFAULT ${now}
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_tickets_tracking_token_hash" ON "tickets" ("tracking_token_hash")`,
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_tickets_reference" ON "tickets" ("reference")`);
    await queryRunner.query(`CREATE INDEX "IDX_tickets_status" ON "tickets" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_tickets_priority" ON "tickets" ("priority")`);
    await queryRunner.query(`CREATE INDEX "IDX_tickets_requester_email" ON "tickets" ("requester_email")`);

    await queryRunner.query(`
      CREATE TABLE "ticket_messages" (
        ${id},
        "ticket_id" varchar NOT NULL REFERENCES "tickets"("id") ON DELETE CASCADE,
        "body" text NOT NULL,
        "is_staff_reply" boolean NOT NULL DEFAULT ${pg ? 'false' : '0'},
        "author_name" varchar(255),
        "author_user_id" varchar,
        "created_at" ${ts} NOT NULL DEFAULT ${now}
      )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_ticket_messages_ticket_id" ON "ticket_messages" ("ticket_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "newsletter_subscribers" (
        ${id},
        "email" varchar(255) NOT NULL,
        "name" varchar(255),
        "is_confirmed" boolean NOT NULL DEFAULT ${pg ? 'false' : '0'},
        "is_active" boolean NOT NULL DEFAULT ${pg ? 'true' : '1'},
        "confirmation_token_hash" varchar(128),
        "unsubscribed_token_hash" varchar(128),
        "confirmed_at" ${ts},
        "unsubscribed_at" ${ts},
        "source_ip" varchar(45),
        "created_at" ${ts} NOT NULL DEFAULT ${now},
        "updated_at" ${ts} NOT NULL DEFAULT ${now}
      )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_newsletter_subscribers_email" ON "newsletter_subscribers" ("email")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_newsletter_subscribers_conf_token" ON "newsletter_subscribers" ("confirmation_token_hash")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_newsletter_subscribers_unsub_token" ON "newsletter_subscribers" ("unsubscribed_token_hash")`,
    );

    await queryRunner.query(`
      CREATE TABLE "services" (
        ${id},
        "slug" varchar(160) NOT NULL,
        "title" varchar(255) NOT NULL,
        "summary" text NOT NULL,
        "description" text,
        "icon" varchar(100),
        "is_published" boolean NOT NULL DEFAULT ${pg ? 'true' : '1'},
        "display_order" integer NOT NULL DEFAULT 0,
        "features" text,
        "created_at" ${ts} NOT NULL DEFAULT ${now},
        "updated_at" ${ts} NOT NULL DEFAULT ${now}
      )`);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_services_slug" ON "services" ("slug")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_services_published_order" ON "services" ("is_published", "display_order")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "services"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "newsletter_subscribers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ticket_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tickets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
  }
}
