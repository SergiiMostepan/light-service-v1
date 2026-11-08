import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly consoleOnly: boolean;
  private readonly settings?: { token: string; chatId: string };

  constructor(@Inject(ConfigService) config: ConfigService) {
    // Temporary console-only delivery while testing the first release.
    this.consoleOnly = true;
    if (this.consoleOnly) return;
    const token = config.get<string>('TG_TOKEN');
    const chatId = config.get<string>('TG_CHAT_ID');
    if (!token && !chatId) return;
    if (
      !token ||
      !/^\d+:[\w-]+$/.test(token) ||
      !chatId ||
      !/^(-?\d+|@[\w]+)$/.test(chatId)
    ) {
      this.logger.warn(
        'Set a valid TG_TOKEN and TG_CHAT_ID to enable grid notifications',
      );
      return;
    }
    this.settings = { token, chatId };
  }

  get isConfigured() {
    return this.consoleOnly || this.settings !== undefined;
  }

  async sendMessage(text: string) {
    if (this.consoleOnly) {
      this.logger.log(text);
      return;
    }
    if (!this.settings) throw new Error('Telegram is not configured');
    const { token, chatId } = this.settings;
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text }),
          signal: AbortSignal.timeout(10_000),
          redirect: 'error',
        },
      );
      const result = (await response.json()) as { ok?: boolean };
      if (!response.ok || result.ok !== true)
        throw new Error('Telegram rejected the message');
    } catch {
      // Fetch errors may contain the URL with the bot token.
      throw new Error('Telegram delivery failed');
    }
  }
}
