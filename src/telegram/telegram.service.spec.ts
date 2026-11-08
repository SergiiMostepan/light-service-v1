import { ConfigService } from '@nestjs/config';
import { TelegramService } from './telegram.service.js';

afterEach(() => vi.unstubAllGlobals());

it('logs notifications even when Telegram delivery is configured', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  const service = new TelegramService(
    new ConfigService({
      TG_DELIVERY: 'telegram',
      TG_TOKEN: '123:test-token',
      TG_CHAT_ID: '@test',
    }),
  );
  expect(service.isConfigured).toBe(true);
  await service.sendMessage('✅ Ліфти працюють');
  await service.sendMessage('❌ Ліфти не працюють');
  expect(fetchMock).not.toHaveBeenCalled();
});
