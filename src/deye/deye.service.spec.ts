import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import axios, {
  AxiosError,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios';
import { validateEnvironment } from '../config/environment.js';
import { DEYE_READ_ENDPOINTS } from './deye.endpoints.js';
import { DeyeApiError, DeyeConfigurationError } from './deye.errors.js';
import { DeyeModule } from './deye.module.js';
import { DeyeService } from './deye.service.js';
import { ConfigModule } from '@nestjs/config';

const success = { success: true, code: '1000000', requestId: null };
const authResponse = {
  ...success,
  accessToken: 'test-token',
  expiresIn: '3600',
};
const credentials = {
  DEYE_APP_ID: 'test-app',
  DEYE_APP_SECRET: 'test-secret',
  DEYE_EMAIL: 'user@example.com',
  DEYE_PASSWORD: 'password',
};

type Reply = (config: InternalAxiosRequestConfig) => unknown;

function setup(overrides: Record<string, unknown> = {}, reply?: Reply) {
  const requests: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config);
    const data = reply
      ? await reply(config)
      : config.url === '/v1.0/account/token'
        ? authResponse
        : success;
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
  const settings = validateEnvironment({ ...credentials, ...overrides });
  const client = axios.create({
    baseURL: settings.DEYE_API_BASE_URL,
    adapter,
  });
  return {
    service: new DeyeService(
      new HttpService(client),
      new ConfigService(settings),
    ),
    requests,
  };
}

function rejectHttp(config: InternalAxiosRequestConfig, status: number): never {
  throw new AxiosError(
    'upstream request failed',
    'ERR_BAD_RESPONSE',
    config,
    undefined,
    {
      status,
      data: { secret: 'must-not-leak' },
      statusText: 'Error',
      headers: {},
      config,
    },
  );
}

function requestBody(config: InternalAxiosRequestConfig): unknown {
  return JSON.parse(config.data as string);
}

afterEach(() => vi.useRealTimers());

describe('DeyeService monitoring client', () => {
  it('reads web battery detail with the existing OpenAPI token and the observed request body', async () => {
    const detail = {
      deviceId: 8395568,
      deviceSn: '05403000DB020414',
      siteId: 61845325,
      type: 'BATTERY',
      paramCategoryList: [
        {
          fieldList: [
            { storageName: 'BSC', value: '100.00', unit: '%' },
            { storageName: 'MAX_C_V', value: '3.40', unit: 'V' },
            { storageName: 'MIN_C_V', value: '3.37', unit: 'V' },
          ],
        },
      ],
    };
    const { service, requests } = setup({}, (config) =>
      config.url === '/v1.0/account/token' ? authResponse : detail,
    );
    expect(await service.getBatteryWebDetail(8395568)).toEqual(detail);
    const request = requests[1]!;
    expect(request.url).toBe(
      'https://eu1.deyecloud.com/device-s/device/detail',
    );
    expect(request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(requestBody(request)).toEqual({
      language: 'en',
      deviceId: 8395568,
      needRealTimeDataFlag: true,
    });
    expect(request.maxRedirects).toBe(0);
    expect(request.timeout).toBe(10000);
  });

  it('sanitizes a rejected web token without invalidating the OpenAPI token', async () => {
    const { service, requests } = setup({}, (config) => {
      if (config.url === '/v1.0/account/token') return authResponse;
      if (config.url?.startsWith('https://eu1.deyecloud.com/'))
        rejectHttp(config, 401);
      return success;
    });
    const error = await service
      .getBatteryWebDetail(8395568)
      .catch((error: unknown) => error);
    expect(error).toBeInstanceOf(DeyeApiError);
    expect(error).toMatchObject({ kind: 'http', status: 401 });
    expect(JSON.stringify(error)).not.toContain('test-token');
    expect(JSON.stringify(error)).not.toContain('must-not-leak');
    await service.getAccountInfo();
    expect(
      requests.filter((r) => r.url === '/v1.0/account/token'),
    ).toHaveLength(1);
  });

  it.each([
    '<html>Login</html>',
    { code: 401, msg: 'Unauthorized' },
    { deviceId: 1, type: 'BATTERY', paramCategoryList: [] },
    { deviceId: 8395568, type: 'INVERTER', paramCategoryList: [] },
  ])(
    'rejects web responses that are not the requested battery: %j',
    async (reply) => {
      const { service } = setup({}, (config) =>
        config.url === '/v1.0/account/token' ? authResponse : reply,
      );
      await expect(service.getBatteryWebDetail(8395568)).rejects.toMatchObject({
        kind: 'invalid-response',
      });
    },
  );

  it('exports the service through Nest dependency injection without making network requests', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [() => validateEnvironment({})],
        }),
        DeyeModule,
      ],
    }).compile();
    expect(module.get(DeyeService)).toBeInstanceOf(DeyeService);
    await module.close();
  });

  it('authenticates with appId in query, hashes the password and adds the bearer header', async () => {
    const { service, requests } = setup();
    await service.getStations({ page: 2, size: 50 });
    expect(requests[0]!.url).toBe('/v1.0/account/token');
    expect(requests[0]!.params).toEqual({ appId: 'test-app' });
    expect(requestBody(requests[0]!)).toEqual({
      appSecret: 'test-secret',
      email: 'user@example.com',
      password:
        '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    });
    expect(requests[0]!.headers.get('Authorization')).toBeUndefined();
    expect(requests[1]!.url).toBe('/v1.0/station/list');
    expect(requests[1]!.headers.get('Authorization')).toBe('Bearer test-token');
    expect(requestBody(requests[1]!)).toEqual({ page: 2, size: 50 });
  });

  it('accepts an existing SHA-256 hash without hashing it again', async () => {
    const { service, requests } = setup({
      DEYE_PASSWORD: '',
      DEYE_PASSWORD_SHA256: 'AB'.repeat(32),
    });
    await service.getAccountInfo();
    expect(requestBody(requests[0]!)).toMatchObject({
      password: 'ab'.repeat(32),
    });
  });

  it.each([
    { DEYE_EMAIL: '', DEYE_USERNAME: 'user-name' },
    { DEYE_EMAIL: '', DEYE_MOBILE: '123456789', DEYE_COUNTRY_CODE: '380' },
  ])(
    'supports account identity %j and business company ID',
    async (identity) => {
      const { service, requests } = setup({
        ...identity,
        DEYE_COMPANY_ID: '123',
      });
      await service.getAccountInfo();
      expect(requestBody(requests[0]!)).toMatchObject({ companyId: 123 });
      expect(requestBody(requests[0]!)).toMatchObject(
        identity.DEYE_USERNAME
          ? { username: 'user-name' }
          : { mobile: '123456789', countryCode: '380' },
      );
    },
  );

  it('shares authentication between concurrent reads and reuses the cached token', async () => {
    const { service, requests } = setup();
    await Promise.all(Array.from({ length: 10 }, () => service.getStations()));
    await service.getStation({ stationId: 42 });
    expect(
      requests.filter((r) => r.url === '/v1.0/account/token'),
    ).toHaveLength(1);
    expect(requests).toHaveLength(12);
  });

  it('reauthenticates before the token expires', async () => {
    vi.useFakeTimers();
    const { service, requests } = setup();
    await service.getStations();
    vi.advanceTimersByTime(3540001);
    await service.getStations();
    expect(
      requests.filter((r) => r.url === '/v1.0/account/token'),
    ).toHaveLength(2);
  });

  it('refreshes once for simultaneous HTTP 401 responses', async () => {
    let tokens = 0;
    const { service, requests } = setup({}, (config) => {
      if (config.url === '/v1.0/account/token')
        return { ...authResponse, accessToken: `token-${++tokens}` };
      if (config.headers.get('Authorization') === 'Bearer token-1')
        rejectHttp(config, 401);
      return success;
    });
    await Promise.all([
      service.getStations(),
      service.getStations(),
      service.getStations(),
    ]);
    expect(tokens).toBe(2);
    expect(
      requests.filter(
        (r) => r.headers.get('Authorization') === 'Bearer token-2',
      ),
    ).toHaveLength(3);
  });

  it('stops after one retry when renewed credentials are also rejected', async () => {
    const { service, requests } = setup({}, (config) => {
      if (config.url === '/v1.0/account/token') return authResponse;
      rejectHttp(config, 401);
    });
    await expect(service.getStations()).rejects.toMatchObject({ status: 401 });
    expect(requests).toHaveLength(4);
  });

  it.each([403, 429, 500])(
    'does not retry HTTP %s or retain request secrets',
    async (status) => {
      const { service, requests } = setup({}, (config) => {
        if (config.url === '/v1.0/account/token') return authResponse;
        rejectHttp(config, status);
      });
      const error: unknown = await service
        .getStations()
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(DeyeApiError);
      expect(error).toMatchObject({ kind: 'http', status });
      expect(JSON.stringify(error)).not.toMatch(
        /test-secret|test-token|must-not-leak/,
      );
      expect(error).not.toHaveProperty('cause');
      expect(error).not.toHaveProperty('config');
      expect(requests).toHaveLength(2);
    },
  );

  it('turns a timeout into a sanitized network error without retrying', async () => {
    const { service, requests } = setup({}, (config) => {
      if (config.url === '/v1.0/account/token') return authResponse;
      throw new AxiosError(
        'timeout with sensitive context',
        'ECONNABORTED',
        config,
      );
    });
    await expect(service.getStations()).rejects.toMatchObject({
      kind: 'network',
    });
    expect(requests).toHaveLength(2);
  });

  it('recognizes API failures inside HTTP 200 and preserves diagnostic codes', async () => {
    const { service } = setup({}, (config) =>
      config.url === '/v1.0/account/token'
        ? authResponse
        : { success: false, code: '12345', msg: 'failed', requestId: 'req-42' },
    );
    await expect(service.getStations()).rejects.toMatchObject({
      kind: 'api',
      code: '12345',
      requestId: 'req-42',
    });
  });

  it.each([null, '<html>error</html>', {}, { code: '1000000' }])(
    'rejects malformed responses %j',
    async (response) => {
      const { service } = setup({}, () => response);
      await expect(service.getStations()).rejects.toMatchObject({
        kind: 'invalid-response',
      });
    },
  );

  it.each([
    { ...success, expiresIn: '3600' },
    { ...authResponse, expiresIn: 'invalid' },
  ])('rejects malformed token responses %j', async (response) => {
    const { service } = setup({}, () => response);
    await expect(service.getStations()).rejects.toMatchObject({
      kind: 'invalid-response',
    });
  });

  it('allows authentication to recover after an unsuccessful attempt', async () => {
    let attempts = 0;
    const { service } = setup({}, (config) => {
      if (config.url !== '/v1.0/account/token') return success;
      if (++attempts === 1) rejectHttp(config, 500);
      return authResponse;
    });
    await expect(service.getStations()).rejects.toBeInstanceOf(DeyeApiError);
    await expect(service.getStations()).resolves.toEqual(success);
    expect(attempts).toBe(2);
  });

  it('fails before any network request when credentials are missing', async () => {
    const { service, requests } = setup({ DEYE_APP_ID: '' });
    await expect(service.getStations()).rejects.toBeInstanceOf(
      DeyeConfigurationError,
    );
    expect(requests).toHaveLength(0);
  });

  it('reads telemetry, history and current configuration using documented payloads', async () => {
    const { service, requests } = setup();
    const history = {
      deviceSn: 'SN-1',
      startTimestamp: 1700000000,
      endTimestamp: 1700003600,
      measurePoints: ['SOC'],
    };
    await service.getDeviceLatest({ deviceList: ['SN-1'] });
    await service.getStationDevices({ stationIds: [42], page: 1, size: 20 });
    await service.getStationLatest({ stationId: 42 });
    await service.getDeviceHistoryRaw(history);
    await service.getTimeOfUseConfiguration({ deviceSn: 'SN-1' });
    expect(requests.slice(1).map((r) => [r.url, requestBody(r)])).toEqual([
      ['/v1.0/device/latest', { deviceList: ['SN-1'] }],
      ['/v1.0/station/device', { stationIds: [42], page: 1, size: 20 }],
      ['/v1.0/station/latest', { stationId: 42 }],
      ['/v1.0/device/historyRaw', history],
      ['/v1.0/config/tou', { deviceSn: 'SN-1' }],
    ]);
  });

  it.each([0, 11])(
    'rejects unsupported latest-data batch size %s locally',
    (size) => {
      const { service, requests } = setup();
      expect(() =>
        service.getDeviceLatest({ deviceList: Array<string>(size).fill('SN') }),
      ).toThrow(RangeError);
      expect(requests).toHaveLength(0);
    },
  );

  it('has an explicit allowlist containing only documented monitoring endpoints', () => {
    expect(
      Object.values(DEYE_READ_ENDPOINTS).every((path) =>
        /^\/v1\.0\/(account\/info|station\/(list|detail|device|listWithDevice|latest|history|history\/power|alertList)|device\/(list|latest|history|historyRaw|measurePoints|alertList)|config\/(battery|system|tou))$/.test(
          path,
        ),
      ),
    ).toBe(true);
  });
});
