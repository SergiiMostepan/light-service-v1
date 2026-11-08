import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  Inject,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { DeyeService } from './deye.service.js';
import { DEYE_STATION_ID } from './deye.constants.js';
import { DeyeGridService } from './deye-grid.service.js';

@Controller('deye/stations')
export class DeyeController {
  constructor(
    @Inject(DeyeService) private readonly deye: DeyeService,
    @Inject(DeyeGridService) private readonly grid: DeyeGridService,
  ) {}

  @Get()
  getStations(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('size', new DefaultValuePipe(20), ParseIntPipe) size: number,
  ) {
    return this.deye.getStations(this.pagination(page, size));
  }

  @Get('with-devices')
  getStationsWithDevices(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('size', new DefaultValuePipe(20), ParseIntPipe) size: number,
  ) {
    return this.deye.getStationsWithDevices(this.pagination(page, size));
  }

  @Get('my')
  getMyStation() {
    return this.deye.getStation({ stationId: DEYE_STATION_ID });
  }

  @Get(':stationId')
  getStation(@Param('stationId', ParseIntPipe) stationId: number) {
    if (!Number.isSafeInteger(stationId) || stationId < 1) {
      throw new BadRequestException('stationId must be a positive integer');
    }
    return this.deye.getStation({ stationId });
  }

  @Get('my/grid-outages')
  getMyGridOutages(
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
  ) {
    return this.grid.getGridOutages(DEYE_STATION_ID, from, to);
  }

  @Get(':stationId/grid-outages')
  getGridOutages(
    @Param('stationId', ParseIntPipe) stationId: number,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
  ) {
    return this.grid.getGridOutages(stationId, from, to);
  }

  private pagination(page: number, size: number) {
    if (!Number.isSafeInteger(page) || page < 1) {
      throw new BadRequestException('page must be a positive integer');
    }
    if (!Number.isSafeInteger(size) || size < 1 || size > 200) {
      throw new BadRequestException(
        'size must be an integer between 1 and 200',
      );
    }
    return { page, size };
  }
}
