require('dotenv').config();
const https = require('https');

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_IDS } = process.env;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_IDS) {
  console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS in .env');
  process.exit(1);
}

const chatIds = TELEGRAM_CHAT_IDS.split(',').map((id) => id.trim());

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 5000;

const now = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });

const text = [
  '🏠 *Home Server is Running!*',
  '',
  '✅ El servidor casero arrancó exitosamente.',
  `🕐 Hora de inicio: ${now}`,
  '🟢 Todo listo y en línea.',
].join('\n');

function sendTo(chatId, attempt = 1) {
  const params = new URLSearchParams({ chat_id: chatId, text, parse_mode: 'Markdown' });
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?${params}`;

  console.log(`[${chatId}] Attempt ${attempt}/${MAX_RETRIES}...`);

  https
    .get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const response = JSON.parse(data);
        if (response.ok) {
          console.log(`[${chatId}] Notification sent successfully.`);
        } else {
          console.error(`[${chatId}] Telegram error:`, response.description);
          retry(chatId, attempt);
        }
      });
    })
    .on('error', (err) => {
      console.error(`[${chatId}] Network error:`, err.message);
      retry(chatId, attempt);
    });
}

function retry(chatId, attempt) {
  if (attempt >= MAX_RETRIES) {
    console.error(`[${chatId}] Max retries reached. Giving up.`);
    return;
  }
  setTimeout(() => sendTo(chatId, attempt + 1), RETRY_DELAY_MS);
}

chatIds.forEach((id) => sendTo(id));
