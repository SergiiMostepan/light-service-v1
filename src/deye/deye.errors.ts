export type DeyeErrorKind = 'api' | 'http' | 'network' | 'invalid-response';

/** Contains diagnostics only; never retains Axios config, credentials or tokens. */
export class DeyeApiError extends Error {
  constructor(
    readonly kind: DeyeErrorKind,
    readonly endpoint: string,
    readonly status?: number,
    readonly code?: string,
    readonly requestId?: string,
  ) {
    super(`Deye ${kind} error at ${endpoint}${code ? ` (code ${code})` : ''}`);
    this.name = 'DeyeApiError';
  }
}

export class DeyeConfigurationError extends Error {
  constructor(setting: string) {
    super(`Configure ${setting} before requesting Deye Cloud data`);
    this.name = 'DeyeConfigurationError';
  }
}
