import { createHash } from 'node:crypto';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { DEYE_READ_ENDPOINTS } from './deye.endpoints.js';
import { DeyeApiError, DeyeConfigurationError } from './deye.errors.js';
import type {
  DeyeOperations,
  DeyeRequest,
  DeyeResponse,
} from './deye.types.js';

type Token = { value: string; expiresAt: number };

export interface DeyeWebBatteryDetail extends Record<string, unknown> {
  deviceId: number;
  deviceSn: string;
  siteId: number;
  type: 'BATTERY';
  collectionTime?: number;
  deviceState?: number;
  connectStatus?: number;
  paramCategoryList: Array<{
    fieldList?: Array<{
      storageName?: string;
      value?: string | number | null;
      unit?: string | null;
    }>;
  }>;
}

@Injectable()
export class DeyeService {
  private token?: Token;
  private tokenRequest?: Promise<Token>;

  constructor(
    @Inject(HttpService) private readonly http: HttpService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  getAccountInfo() {
    return this.read('getAccountInfo', {});
  }

  getStations(request: DeyeRequest<'getStations'> = {}) {
    return this.read('getStations', request);
  }

  getStation(request: DeyeRequest<'getStation'>) {
    return this.read('getStation', request);
  }

  getStationDevices(request: DeyeRequest<'getStationDevices'>) {
    return this.read('getStationDevices', request);
  }

  getStationsWithDevices(request: DeyeRequest<'getStationsWithDevices'> = {}) {
    return this.read('getStationsWithDevices', request);
  }

  getStationLatest(request: DeyeRequest<'getStationLatest'>) {
    return this.read('getStationLatest', request);
  }

  getStationHistory(request: DeyeRequest<'getStationHistory'>) {
    return this.read('getStationHistory', request);
  }

  getStationHistoryPower(request: DeyeRequest<'getStationHistoryPower'>) {
    return this.read('getStationHistoryPower', request);
  }

  getStationAlerts(request: DeyeRequest<'getStationAlerts'>) {
    return this.read('getStationAlerts', request);
  }

  /** Deye exposes this endpoint to business accounts; personal accounts use station devices. */
  getDevices(request: DeyeRequest<'getDevices'> = {}) {
    return this.read('getDevices', request);
  }

  /** Deye permits at most ten devices in a latest-data request. */
  getDeviceLatest(request: DeyeRequest<'getDeviceLatest'>) {
    if (request.deviceList.length < 1 || request.deviceList.length > 10) {
      throw new RangeError('deviceList must contain between 1 and 10 devices');
    }
    return this.read('getDeviceLatest', request);
  }

  getDeviceHistory(request: DeyeRequest<'getDeviceHistory'>) {
    return this.read('getDeviceHistory', request);
  }

  getDeviceHistoryRaw(request: DeyeRequest<'getDeviceHistoryRaw'>) {
    return this.read('getDeviceHistoryRaw', request);
  }

  getDeviceMeasurePoints(request: DeyeRequest<'getDeviceMeasurePoints'>) {
    return this.read('getDeviceMeasurePoints', request);
  }

  /** Read-only web endpoint, verified with the existing OpenAPI token. */
  async getBatteryWebDetail(deviceId: number): Promise<DeyeWebBatteryDetail> {
    if (!Number.isSafeInteger(deviceId) || deviceId <= 0) {
      throw new RangeError('deviceId must be a positive safe integer');
    }
    const endpoint = 'https://eu1.deyecloud.com/device-s/device/detail';
    const token = await this.getToken();
    let data: unknown;
    try {
      const response = await this.http.axiosRef.post<unknown>(
        endpoint,
        { language: 'en', deviceId, needRealTimeDataFlag: true },
        {
          headers: { Authorization: `Bearer ${token.value}` },
          maxRedirects: 0,
          timeout: 10000,
        },
      );
      data = response.data;
    } catch (error) {
      // Do not retain Axios errors: they contain the authorization header.
      if (isAxiosError(error)) {
        throw new DeyeApiError(
          error.response ? 'http' : 'network',
          endpoint,
          error.response?.status,
        );
      }
      throw new DeyeApiError('network', endpoint);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new DeyeApiError('invalid-response', endpoint);
    }
    const detail = data as Record<string, unknown>;
    if (
      detail.deviceId !== deviceId ||
      typeof detail.deviceSn !== 'string' ||
      !detail.deviceSn ||
      !Number.isSafeInteger(detail.siteId) ||
      detail.type !== 'BATTERY' ||
      !Array.isArray(detail.paramCategoryList) ||
      !detail.paramCategoryList.every(
        (category: unknown) =>
          category !== null &&
          typeof category === 'object' &&
          (!('fieldList' in category) ||
            (Array.isArray(category.fieldList) &&
              category.fieldList.every(
                (field: unknown) => field !== null && typeof field === 'object',
              ))),
      )
    ) {
      // Login pages and error envelopes are not battery data.
      throw new DeyeApiError('invalid-response', endpoint);
    }
    return detail as DeyeWebBatteryDetail;
  }

  getDeviceAlerts(request: DeyeRequest<'getDeviceAlerts'>, language = 'en') {
    return this.read('getDeviceAlerts', request, { language });
  }

  getBatteryConfiguration(request: DeyeRequest<'getBatteryConfiguration'>) {
    return this.read('getBatteryConfiguration', request);
  }

  getSystemConfiguration(request: DeyeRequest<'getSystemConfiguration'>) {
    return this.read('getSystemConfiguration', request);
  }

  getTimeOfUseConfiguration(request: DeyeRequest<'getTimeOfUseConfiguration'>) {
    return this.read('getTimeOfUseConfiguration', request);
  }

  private async read<K extends keyof DeyeOperations>(
    operation: K,
    body: DeyeRequest<K>,
    params?: Record<string, string>,
  ): Promise<DeyeResponse<K>> {
    const endpoint = DEYE_READ_ENDPOINTS[operation];
    const token = await this.getToken();
    try {
      return (await this.send(
        endpoint,
        body,
        params,
        token.value,
      )) as DeyeResponse<K>;
    } catch (error) {
      if (!(error instanceof DeyeApiError) || error.status !== 401) throw error;
      // A concurrent request may already have replaced the rejected token.
      if (this.token === token) this.token = undefined;
      const renewed = await this.getToken();
      // Retry a read once after HTTP 401; never retry timeouts, 429 or server errors.
      return (await this.send(
        endpoint,
        body,
        params,
        renewed.value,
      )) as DeyeResponse<K>;
    }
  }

  private async getToken(): Promise<Token> {
    if (this.token && Date.now() < this.token.expiresAt) return this.token;
    const pending = (this.tokenRequest ??= this.obtainToken());
    try {
      this.token = await pending;
      return this.token;
    } finally {
      if (this.tokenRequest === pending) this.tokenRequest = undefined;
    }
  }

  private required(name: string): string {
    const value = this.config.get<string>(name);
    if (!value) throw new DeyeConfigurationError(name);
    return value;
  }

  private async obtainToken(): Promise<Token> {
    const appId = this.required('DEYE_APP_ID');
    const appSecret = this.required('DEYE_APP_SECRET');
    const hash = this.config.get<string>('DEYE_PASSWORD_SHA256');
    const password = hash
      ? hash.toLowerCase()
      : createHash('sha256')
          .update(this.required('DEYE_PASSWORD'))
          .digest('hex');
    const identity: Record<string, string> = {};
    for (const [setting, field] of [
      ['DEYE_EMAIL', 'email'],
      ['DEYE_USERNAME', 'username'],
      ['DEYE_MOBILE', 'mobile'],
    ] as const) {
      const value = this.config.get<string>(setting);
      if (value) identity[field] = value;
    }
    if (Object.keys(identity).length !== 1) {
      throw new DeyeConfigurationError(
        'exactly one of DEYE_EMAIL, DEYE_USERNAME, DEYE_MOBILE',
      );
    }
    if (identity.mobile)
      identity.countryCode = this.required('DEYE_COUNTRY_CODE');
    const companyId = this.config.get<number>('DEYE_COMPANY_ID');
    const startedAt = Date.now();
    const response = await this.send(
      '/v1.0/account/token',
      { appSecret, password, ...identity, ...(companyId ? { companyId } : {}) },
      { appId },
    );
    const value =
      typeof response.accessToken === 'string'
        ? response.accessToken.replace(/^bearer\s+/i, '').trim()
        : '';
    const expiresIn = Number(response.expiresIn);
    if (!value || !Number.isFinite(expiresIn) || expiresIn <= 0) {
      throw new DeyeApiError('invalid-response', '/v1.0/account/token');
    }
    const lifetime = expiresIn * 1000;
    return {
      value,
      expiresAt: startedAt + lifetime - Math.min(60000, lifetime / 10),
    };
  }

  private async send(
    endpoint: string,
    body: unknown,
    params?: Record<string, string>,
    token?: string,
  ): Promise<Record<string, unknown>> {
    let data: unknown;
    try {
      const response = await this.http.axiosRef.post<unknown>(endpoint, body, {
        params,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      data = response.data;
    } catch (error) {
      // Axios errors retain request headers/body. Do not attach them as a cause or log them.
      if (isAxiosError(error)) {
        throw new DeyeApiError(
          error.response ? 'http' : 'network',
          endpoint,
          error.response?.status,
        );
      }
      throw new DeyeApiError('network', endpoint);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new DeyeApiError('invalid-response', endpoint);
    }
    const result = data as Record<string, unknown>;
    const code =
      typeof result.code === 'string' || typeof result.code === 'number'
        ? String(result.code)
        : undefined;
    const requestId =
      typeof result.requestId === 'string' ? result.requestId : undefined;
    if (typeof result.success !== 'boolean') {
      throw new DeyeApiError('invalid-response', endpoint);
    }
    if (!result.success || (code !== undefined && code !== '1000000')) {
      throw new DeyeApiError('api', endpoint, undefined, code, requestId);
    }
    return result;
  }
}
