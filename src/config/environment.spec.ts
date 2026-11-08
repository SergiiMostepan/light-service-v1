import { validateEnvironment } from './environment.js';

describe('environment configuration', () => {
  const production = {
    NODE_ENV: 'production',
    DEYE_APP_ID: 'app',
    DEYE_APP_SECRET: 'secret',
    DEYE_EMAIL: 'user@example.com',
    DEYE_PASSWORD: 'password',
  };

  it('accepts complete production settings', () => {
    expect(validateEnvironment(production)).toMatchObject({
      NODE_ENV: 'production',
    });
  });

  it.each(['DEYE_APP_ID', 'DEYE_APP_SECRET', 'DEYE_EMAIL', 'DEYE_PASSWORD'])(
    'fails startup if production is missing %s',
    (name) => {
      expect(() => validateEnvironment({ ...production, [name]: '' })).toThrow(
        /required in production/,
      );
    },
  );

  it('starts without Deye credentials and applies defaults', () => {
    expect(validateEnvironment({})).toMatchObject({
      PORT: 3000,
      DEYE_API_BASE_URL: 'https://eu1-developer.deyecloud.com',
      DEYE_API_TIMEOUT_MS: 10000,
    });
  });

  it('parses environment values', () => {
    expect(
      validateEnvironment({
        PORT: '4000',
        DEYE_API_BASE_URL: 'https://example.com',
        DEYE_API_TIMEOUT_MS: '5000',
      }),
    ).toMatchObject({ PORT: 4000, DEYE_API_TIMEOUT_MS: 5000 });
  });

  it.each(['0', '-1', '65536', 'abc', '3.5', ''])(
    'rejects invalid port %s',
    (PORT) => {
      expect(() => validateEnvironment({ PORT })).toThrow();
    },
  );

  it.each(['0', '-1', 'abc', ''])(
    'rejects invalid timeout %s',
    (DEYE_API_TIMEOUT_MS) => {
      expect(() => validateEnvironment({ DEYE_API_TIMEOUT_MS })).toThrow();
    },
  );

  it.each([
    'not-a-url',
    'ftp://example.com',
    'http://example.com',
    'https://user:pass@example.com',
    'https://example.com/path',
    'https://example.com?token=abc',
    'https://example.com#fragment',
  ])('rejects invalid API URL %s', (DEYE_API_BASE_URL) => {
    expect(() => validateEnvironment({ DEYE_API_BASE_URL })).toThrow();
  });
  it('accepts an uppercase hash and parses a business company ID', () => {
    expect(
      validateEnvironment({
        DEYE_PASSWORD_SHA256: 'AB'.repeat(32),
        DEYE_COMPANY_ID: '42',
      }),
    ).toMatchObject({ DEYE_COMPANY_ID: 42 });
  });

  it.each([
    { DEYE_PASSWORD_SHA256: 'not-a-sha256-hash' },
    { DEYE_PASSWORD: 'password', DEYE_PASSWORD_SHA256: 'ab'.repeat(32) },
    { DEYE_EMAIL: 'user@example.com', DEYE_USERNAME: 'username' },
    { DEYE_MOBILE: '123456' },
    { DEYE_COMPANY_ID: '-1' },
    { DEYE_COMPANY_ID: 'abc' },
  ])('rejects invalid Deye configuration %j', (settings) => {
    expect(() => validateEnvironment(settings)).toThrow();
  });
});
