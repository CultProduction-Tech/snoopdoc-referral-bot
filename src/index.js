import 'dotenv/config'
import { Bot, Keyboard } from 'grammy'
import {
  clearSession,
  findActiveTelegramLink,
  getSession,
  issueReferralLink,
  setSession,
} from './snoopdoc-api.js'
import { getGrammyClientConfig, initTelegramClient, telegramFetch } from './telegram-client.js'
import { parseContactMessage } from './parse-contact.js'

const token = process.env.REFERRAL_BOT_TOKEN?.trim()
if (!token) {
  console.error('[referral-bot] REFERRAL_BOT_TOKEN is not set')
  process.exit(1)
}

if (!process.env.REFERRAL_BOT_API_SECRET?.trim()) {
  console.error('[referral-bot] REFERRAL_BOT_API_SECRET is not set')
  process.exit(1)
}

const START_TEXT =
  'Привет! Я бот реферальной программы СнупДок.\n\n' +
  'Нажмите «Получить ссылку» и получите ссылку для приглашения команд.'

const ASK_CONTACT =
  'Напишите имя или почту и номер телефона в одном сообщении.\n\n' +
  'Например:\n' +
  'Мария +7 999 123-45-67\n' +
  'ivan@mail.ru 89991234567'

const INVALID_CONTACT =
  'Не получилось разобрать сообщение.\n\n' +
  'Укажите имя или почту и телефон (минимум 10 цифр) в одном сообщении, например:\n' +
  'Мария +7 999 123-45-67'

const mainKeyboard = new Keyboard().text('Получить ссылку').resized()

function formatExpiry(date) {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

async function deleteWebhook() {
  try {
    const res = await telegramFetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: true }),
    })
    const data = await res.json()
    if (!data.ok) {
      console.warn('[referral-bot] deleteWebhook:', data.description || 'failed')
      return
    }
    console.log('[referral-bot] webhook removed, using long polling')
  } catch (error) {
    console.warn('[referral-bot] deleteWebhook skipped:', error.message)
  }
}

async function sendExistingLink(ctx, link) {
  await ctx.reply(
    `У вас уже есть активная ссылка (действует до ${formatExpiry(link.expiresAt)}):\n\n${link.url}`,
    { reply_markup: mainKeyboard }
  )
}

async function issueLink(ctx, { telegramUserId, username, contact, phone, email }) {
  const link = await issueReferralLink({
    telegramUserId,
    telegramUsername: username,
    fullName: contact,
    phone,
    email,
  })

  await clearSession(String(telegramUserId))

  await ctx.reply(
    `Готово! Ваша реферальная ссылка (действует до ${formatExpiry(link.expiresAt)}):\n\n${link.url}\n\n` +
      'Отправьте её команде — когда они зарегистрируют компанию по этой ссылке, мы это учтём.',
    { reply_markup: mainKeyboard }
  )
}

async function startLinkFlow(ctx, telegramUserId) {
  const existing = await findActiveTelegramLink(String(telegramUserId))
  if (existing) {
    await clearSession(String(telegramUserId))
    await sendExistingLink(ctx, existing)
    return
  }

  await setSession(String(telegramUserId), 'awaiting_contact')
  await ctx.reply(ASK_CONTACT, { reply_markup: { remove_keyboard: true } })
}

const bot = new Bot(token, getGrammyClientConfig())

bot.command('start', async (ctx) => {
  const telegramUserId = String(ctx.from.id)
  await ctx.reply(START_TEXT, { reply_markup: mainKeyboard })
  await setSession(telegramUserId, 'idle')
})

bot.command('link', async (ctx) => {
  await startLinkFlow(ctx, String(ctx.from.id))
})

bot.hears('Получить ссылку', async (ctx) => {
  await startLinkFlow(ctx, String(ctx.from.id))
})

bot.on('message:text', async (ctx) => {
  const text = ctx.message.text.trim()
  if (text.startsWith('/')) return

  const telegramUserId = String(ctx.from.id)
  const session = await getSession(telegramUserId)
  if (!session) return

  if (session.step === 'awaiting_contact') {
    const parsed = parseContactMessage(text)
    if (!parsed) {
      await ctx.reply(INVALID_CONTACT)
      return
    }
    await issueLink(ctx, {
      telegramUserId,
      username: ctx.from.username,
      contact: parsed.contact,
      phone: parsed.phone,
      email: parsed.email,
    })
  }
})

bot.catch(async (err) => {
  console.error('[referral-bot] error:', err)
  const ctx = err.ctx
  if (!ctx) return

  const message =
    err.message?.includes('not configured') || err.message?.includes('Unauthorized')
      ? 'Сервис временно недоступен. Мы уже разбираемся — попробуйте позже.'
      : 'Что-то пошло не так. Попробуйте ещё раз через минуту.'

  try {
    await ctx.reply(message, { reply_markup: mainKeyboard })
  } catch {
    // ignore reply errors
  }
})

async function main() {
  await initTelegramClient()
  await deleteWebhook()
  console.log('[referral-bot] starting long polling...')
  await bot.start({
    onStart: () => console.log('[referral-bot] bot is running'),
  })
}

main().catch((err) => {
  console.error('[referral-bot] fatal:', err)
  process.exit(1)
})
