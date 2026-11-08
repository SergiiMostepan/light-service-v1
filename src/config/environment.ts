function positiveInteger(
  value: unknown,
  fallback: number,
  name: string,
): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export function validateEnvironment(env: Record<string, unknown>) {
  const port = positiveInteger(env.PORT, 3000, 'PORT');
  if (port > 65535) throw new Error('PORT must not exceed 65535');

  const baseUrl =
    env.DEYE_API_BASE_URL || 'https://eu1-developer.deyecloud.com';
  if (typeof baseUrl !== 'string')
    throw new Error('DEYE_API_BASE_URL must be a URL string');
  const url = new URL(baseUrl);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error(
      'DEYE_API_BASE_URL must be an HTTPS origin without credentials, path, query or fragment',
    );
  }

  const hash = env.DEYE_PASSWORD_SHA256;
  if (hash && (typeof hash !== 'string' || !/^[a-f\d]{64}$/i.test(hash))) {
    throw new Error(
      'DEYE_PASSWORD_SHA256 must contain 64 hexadecimal characters',
    );
  }
  if (env.DEYE_PASSWORD && hash)
    throw new Error('Set only DEYE_PASSWORD or DEYE_PASSWORD_SHA256');
  const identities = [
    env.DEYE_EMAIL,
    env.DEYE_USERNAME,
    env.DEYE_MOBILE,
  ].filter(Boolean);
  if (identities.length > 1)
    throw new Error(
      'Set only one Deye account identity: email, username or mobile',
    );
  if (env.DEYE_MOBILE && !env.DEYE_COUNTRY_CODE)
    throw new Error('DEYE_COUNTRY_CODE is required with DEYE_MOBILE');

  if (env.NODE_ENV === 'production') {
    for (const name of ['DEYE_APP_ID', 'DEYE_APP_SECRET']) {
      if (typeof env[name] !== 'string' || !env[name].trim())
        throw new Error(`${name} is required in production`);
    }
    if (identities.length !== 1)
      throw new Error('A Deye account identity is required in production');
    if (!env.DEYE_PASSWORD && !hash)
      throw new Error(
        'DEYE_PASSWORD or DEYE_PASSWORD_SHA256 is required in production',
      );
  }

  return {
    ...env,
    PORT: port,
    DEYE_API_BASE_URL: url.origin,
    DEYE_API_TIMEOUT_MS: positiveInteger(
      env.DEYE_API_TIMEOUT_MS,
      10000,
      'DEYE_API_TIMEOUT_MS',
    ),
    DEYE_COMPANY_ID: env.DEYE_COMPANY_ID
      ? positiveInteger(env.DEYE_COMPANY_ID, 0, 'DEYE_COMPANY_ID')
      : undefined,
  };
}
