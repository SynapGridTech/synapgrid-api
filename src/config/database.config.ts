import { DataSourceOptions } from 'typeorm';
import { join } from 'path';
import { SnakeNamingStrategy } from '../common/database/snake-naming.strategy';

/**
 * Builds TypeORM connection options from an environment record.
 * Shared by the NestJS app, the CLI data-source and migration tooling
 * so schema definitions never drift between them.
 */
export function buildDataSourceOptions(env: Record<string, string | undefined>): DataSourceOptions {
  const isPostgres = env.DB_TYPE === 'postgres';

  const common = {
    entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
    synchronize: env.DB_SYNCHRONIZE === 'true',
    logging: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    namingStrategy: new SnakeNamingStrategy(),
    migrations: [join(__dirname, '../database/migrations/*{.ts,.js}')],
  };

  if (isPostgres) {
    return {
      ...common,
      type: 'postgres',
      host: env.DB_HOST ?? 'localhost',
      port: parseInt(env.DB_PORT ?? '5432', 10),
      username: env.DB_USERNAME,
      password: env.DB_PASSWORD,
      database: env.DB_DATABASE ?? 'synapgrid',
      ssl: env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    } as DataSourceOptions;
  }

  return {
    ...common,
    type: 'sqlite',
    database: env.DB_DATABASE ?? './data/synapgrid.sqlite',
  } as DataSourceOptions;
}
