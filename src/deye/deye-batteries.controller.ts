import {
  BadGatewayException,
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DeyeService } from './deye.service.js';
import { DeyeApiError, DeyeConfigurationError } from './deye.errors.js';

@Controller('deye/batteries')
export class DeyeBatteriesController {
  constructor(@Inject(DeyeService) private readonly deye: DeyeService) {}

  @Get('web/:deviceId')
  async getWebBattery(@Param('deviceId') deviceId: string) {
    if (
      !/^[1-9]\d*$/.test(deviceId) ||
      !Number.isSafeInteger(Number(deviceId))
    ) {
      throw new BadRequestException('deviceId must be a positive safe integer');
    }
    try {
      return await this.deye.getBatteryWebDetail(Number(deviceId));
    } catch (error) {
      if (error instanceof DeyeConfigurationError) {
        throw new ServiceUnavailableException(
          'Deye credentials are not configured',
        );
      }
      if (error instanceof DeyeApiError) {
        throw new BadGatewayException({
          message: 'Failed to read battery detail from Deye web API',
          kind: error.kind,
          upstreamStatus: error.status,
        });
      }
      throw error;
    }
  }

  @Get(':deviceSn')
  async getBattery(@Param('deviceSn') deviceSn: string) {
    if (
      !deviceSn ||
      deviceSn.trim() !== deviceSn ||
      /\s/.test(deviceSn) ||
      deviceSn.length > 128
    ) {
      throw new BadRequestException(
        'deviceSn must be a battery serial number without whitespace',
      );
    }
    try {
      return await this.deye.getDeviceLatest({
        deviceList: [deviceSn],
        deviceType: 'BATTERY',
      });
    } catch (error) {
      if (error instanceof DeyeConfigurationError) {
        throw new ServiceUnavailableException(
          'Deye credentials are not configured',
        );
      }
      if (error instanceof DeyeApiError) {
        throw new BadGatewayException({
          message: 'Failed to read battery data from Deye Cloud',
          kind: error.kind,
          endpoint: error.endpoint,
          upstreamStatus: error.status,
          code: error.code,
          requestId: error.requestId,
        });
      }
      throw error;
    }
  }
}
