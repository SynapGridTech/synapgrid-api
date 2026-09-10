import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  APP_NAME: Joi.string().default('SynapGrid API'),
  API_PREFIX: Joi.string().default('api'),
  GLOBAL_PREFIX_VERSION: Joi.string().default('v1'),

  // CORS
  CORS_ORIGINS: Joi.string().default('*'),

  // Database
  DB_TYPE: Joi.string().valid('sqlite', 'postgres').default('sqlite'),
  DB_DATABASE: Joi.string().default('./data/synapgrid.sqlite'),
  DB_HOST: Joi.string().when('DB_TYPE', { is: 'postgres', then: Joi.required() }),
  DB_PORT: Joi.number().when('DB_TYPE', { is: 'postgres', then: Joi.required() }),
  DB_USERNAME: Joi.string().when('DB_TYPE', { is: 'postgres', then: Joi.required() }),
  DB_PASSWORD: Joi.string().when('DB_TYPE', { is: 'postgres', then: Joi.required() }),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_SSL: Joi.boolean().default(false),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).default(Joi.ref('JWT_ACCESS_SECRET')),
  JWT_ACCESS_EXPIRES: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES: Joi.string().default('7d'),

  // Seed admin
  SEED_ADMIN_EMAIL: Joi.string().email().default('admin@synapgrid.net'),
  SEED_ADMIN_PASSWORD: Joi.string().min(8).default('Admin@123!'),

  // Throttle
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),

  // Mailer
  MAIL_ENABLED: Joi.boolean().default(false),
  SMTP_HOST: Joi.string().allow('').default(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().allow('').default(''),
  SMTP_PASS: Joi.string().allow('').default(''),
  MAIL_FROM: Joi.string().default('SynapGrid <no-reply@synapgrid.net>'),
});
