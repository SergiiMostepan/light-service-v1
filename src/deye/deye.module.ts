import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DeyeService } from './deye.service.js';
import { DeyeGridService } from './deye-grid.service.js';
import { GridNotifications } from './grid-notifications.js';
import { BatteryLogsService } from './battery-logs.service.js';

import { TelegramModule } from '../telegram/telegram.module.js';

@Module({
  imports: [
    ConfigModule,
    TelegramModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseURL: config.getOrThrow<string>('DEYE_API_BASE_URL'),
        timeout: config.getOrThrow<number>('DEYE_API_TIMEOUT_MS'),
        // Do not forward account credentials or bearer tokens to redirects.
        maxRedirects: 0,
      }),
    }),
  ],
  providers: [
    DeyeService,
    DeyeGridService,
    GridNotifications,
    BatteryLogsService,
  ],
  exports: [DeyeService, DeyeGridService],
})
export class DeyeModule {}
