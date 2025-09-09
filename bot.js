// bot.js
// Minimal Telegraf bot that receives WebApp data via tg.sendData and replies to the user.
// Requirements:
//   - Node.js >= 18
//   - env var BOT_TOKEN should be set to the Telegram bot token
// Run: BOT_TOKEN=xxxxx node bot.js

import 'dotenv/config';
import { Telegraf } from 'telegraf';

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error('❌ BOT_TOKEN is not set. Create a .env file or export env var.');
  process.exit(1);
}

const bot = new Telegraf(token);

// /start with a WebApp menu button (optional)
bot.start(async (ctx) => {
  try {
    await ctx.reply(
      'Привет! Нажми кнопку, чтобы открыть покерное мини‑приложение. Отправляй руку через кнопку "Отправить боту" внутри WebApp.',
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Открыть Покер WebApp',
                web_app: { url: process.env.WEBAPP_URL || 'https://example.com/index.html' },
              },
            ],
          ],
        },
      }
    );
  } catch (e) {
    console.error('start error', e);
  }
});

// Handler for messages that contain web_app_data (sent by tg.sendData from the WebApp)
bot.on('message', async (ctx) => {
  try {
    const wad = ctx.message?.web_app_data;
    if (!wad) return; // ignore normal messages

    // web_app_data.data is a string sent by tg.sendData(JSON.stringify(payload))
    let data = {};
    try {
      data = JSON.parse(wad.data || '{}');
    } catch {}

    const { game, stage, hero, board, opponents } = data;

    const text = `♠️ Получены данные из WebApp:
Игра: ${game || '—'}
Улица: ${stage || '—'}
Карман: ${(hero || []).join(' ')}
Борд: ${(board || []).join(' ')}
Оппонентов: ${opponents || 1}`;

    await ctx.reply(text);
  } catch (e) {
    console.error('web_app_data handler error', e);
    try { await ctx.reply('❌ Ошибка при обработке данных WebApp'); } catch {}
  }
});

bot.catch((err) => console.error('Bot error', err));

bot.launch().then(() => {
  console.log('✅ Bot started with long polling');
  console.log('   Set WEBAPP_URL env var to your hosted index.html for the /start button.');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
