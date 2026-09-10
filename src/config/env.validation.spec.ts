import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  const validEnv = {
    NODE_ENV: 'development',
    PORT: '3000',
    DB_TYPE: 'sqlite',
    DB_DATABASE: './data/test.sqlite',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
  };

  it('accepts a minimal valid sqlite configuration', () => {
    const { error, value } = envValidationSchema.validate(validEnv, { stripUnknown: true });
    expect(error).toBeUndefined();
    expect(value.DB_TYPE).toBe('sqlite');
    expect(value.JWT_REFRESH_SECRET).toBe(validEnv.JWT_ACCESS_SECRET);
  });

  it('rejects JWT secrets shorter than 32 chars', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      JWT_ACCESS_SECRET: 'short',
    });
    expect(error).toBeDefined();
    expect(error?.details[0].message).toContain('at least 32 characters');
  });

  it('rejects an unknown DB_TYPE', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      DB_TYPE: 'mysql',
    });
    expect(error).toBeDefined();
  });

  it('requires postgres connection fields when DB_TYPE=postgres', () => {
    const { error } = envValidationSchema.validate(
      { ...validEnv, DB_TYPE: 'postgres' },
      { abortEarly: false },
    );
    expect(error).toBeDefined();
    expect(error?.details.map((d) => d.path[0])).toEqual(
      expect.arrayContaining(['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD']),
    );
  });

  it('requires NODE_ENV to be one of the known values', () => {
    const { error } = envValidationSchema.validate({ ...validEnv, NODE_ENV: 'staging' });
    expect(error).toBeDefined();
  });
});
