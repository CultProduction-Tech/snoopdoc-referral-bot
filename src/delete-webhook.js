import 'dotenv/config'
import { telegramFetch } from './telegram-client.js'

const token = process.env.REFERRAL_BOT_TOKEN?.trim()
if (!token) {
  console.error('REFERRAL_BOT_TOKEN is not set')
  process.exit(1)
}

const res = await telegramFetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ drop_pending_updates: true }),
})

const data = await res.json()
console.log(JSON.stringify(data, null, 2))
process.exit(data.ok ? 0 : 1)
