import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';
import { buildDataSourceOptions } from './config/database.config';

config({ path: resolve(process.cwd(), '.env') });

export const dataSourceOptions = buildDataSourceOptions(process.env);

export default new DataSource(dataSourceOptions);
