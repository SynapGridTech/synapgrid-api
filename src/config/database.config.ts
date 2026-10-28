import { DataSourceOptions } from 'typeorm';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { SnakeNamingStrategy } from '../common/database/snake-naming.strategy';

/**
 * Builds TypeORM connection options from an environment record.
 * Shared by the NestJS app, the CLI data-source and migration tooling
 * so schema definitions never drift between them.
 */
export function buildDataSourceOptions(env: Record<string, string | undefined>): DataSourceOptions {
  const databaseUrl = env.DATABASE_URL ?? env.DB_DATABASE;
  const hasPostgresUrl = /^postgres(?:ql)?:\/\//i.test(databaseUrl ?? '');
  const isPostgres = env.DB_TYPE === 'postgres' || hasPostgresUrl;

  const common = {
    entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
    synchronize: env.DB_SYNCHRONIZE === 'true',
    logging: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    namingStrategy: new SnakeNamingStrategy(),
    migrations: [join(__dirname, '../database/migrations/*{.ts,.js}')],
  };

  if (isPostgres) {
    const url = env.DATABASE_URL ?? (hasPostgresUrl ? env.DB_DATABASE : undefined);
    const requiresSsl = env.DB_SSL === 'true' || url?.includes('sslmode=require');
    return {
      ...common,
      type: 'postgres',
      ...(url
        ? { url }
        : {
            host: env.DB_HOST ?? 'localhost',
            port: parseInt(env.DB_PORT ?? '5432', 10),
            username: env.DB_USERNAME,
            password: env.DB_PASSWORD,
            database: env.DB_DATABASE ?? 'synapgrid',
          }),
      ssl: requiresSsl ? { rejectUnauthorized: false } : false,
    } as DataSourceOptions;
  }

  const database = env.DB_DATABASE ?? './data/synapgrid.sqlite';
  if (database !== ':memory:' && !database.includes('://')) {
    const databasePath = resolve(database);
    const databaseDirectory = dirname(databasePath);
    if (!existsSync(databaseDirectory)) mkdirSync(databaseDirectory, { recursive: true });
  }
  return {
    ...common,
    type: 'sqlite',
    database,
  } as DataSourceOptions;
}
