require('dotenv').config();
const https = require('https');

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_IDS } = process.env;

if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_IDS) {
  log('ERROR', 'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS in .env');
  process.exit(1);
}

const chatIds = TELEGRAM_CHAT_IDS.split(',').map((id) => id.trim());

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 5000;

function ts() {
  return new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
}

function log(level, message) {
  console.log(`[${ts()}] [${level}] ${message}`);
}

const startTime = ts();

const text = [
  '🏠 *Home Server is Running!*',
  '',
  '✅ El servidor casero arrancó exitosamente.',
  `🕐 Hora de inicio: ${startTime}`,
  '🟢 Todo listo y en línea.',
].join('\n');

log('INFO', `Script started. Sending to ${chatIds.length} chat(s): ${chatIds.join(', ')}`);

function sendTo(chatId, attempt = 1) {
  const params = new URLSearchParams({ chat_id: chatId, text, parse_mode: 'Markdown' });
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?${params}`;

  log('INFO', `[${chatId}] Attempt ${attempt}/${MAX_RETRIES}...`);

  https
    .get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let response;
        try {
          response = JSON.parse(data);
        } catch (e) {
          log('ERROR', `[${chatId}] Failed to parse response: ${data}`);
          retry(chatId, attempt);
          return;
        }

        if (response.ok) {
          log('INFO', `[${chatId}] Notification sent successfully.`);
        } else {
          log('ERROR', `[${chatId}] Telegram error: ${response.description}`);
          retry(chatId, attempt);
        }
      });
    })
    .on('error', (err) => {
      log('ERROR', `[${chatId}] Network error: ${err.message}`);
      retry(chatId, attempt);
    });
}

function retry(chatId, attempt) {
  if (attempt >= MAX_RETRIES) {
    log('ERROR', `[${chatId}] Max retries reached. Giving up.`);
    return;
  }
  log('INFO', `[${chatId}] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
  setTimeout(() => sendTo(chatId, attempt + 1), RETRY_DELAY_MS);
}

chatIds.forEach((id) => sendTo(id));
