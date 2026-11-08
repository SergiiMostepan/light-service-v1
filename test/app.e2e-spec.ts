import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { GridNotifications } from '../src/deye/grid-notifications.js';
import { DeyeService } from '../src/deye/deye.service.js';

// NODE_ENV=test disables .env loading. Background jobs are disabled so this
// checks the real HTTP route table without any Deye or Telegram requests.
describe('deployment HTTP surface', () => {
  let app: INestApplication<App>;
  const upstream = vi.fn(() => {
    throw new Error('Unexpected Deye request');
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GridNotifications)
      .useValue({})
      .overrideProvider(DeyeService)
      .useValue({ getStations: upstream, getBatteryWebDetail: upstream })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  it('exposes only the liveness health check', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);
    expect(response.body).toEqual({
      status: 'ok',
      uptimeSeconds: expect.any(Number),
      timestamp: expect.any(String),
    });
  });

  it.each([
    '/',
    '/deye/stations',
    '/deye/stations/with-devices',
    '/deye/stations/my',
    '/deye/stations/61845325',
    '/deye/stations/my/grid-outages',
    '/deye/stations/61845325/grid-outages',
    '/deye/batteries/05403000DB020414',
    '/deye/batteries/web/8395568',
  ])('closes GET %s', async (path) => {
    await request(app.getHttpServer()).get(path).expect(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  afterAll(async () => {
    await app?.close();
  });
});
