import { ProxyAgent } from 'node:undici'

export function getTelegramProxyUrl() {
  return (
    process.env.TELEGRAM_PROXY?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.ALL_PROXY?.trim() ||
    ''
  )
}

function createTelegramDispatcher() {
  const proxyUrl = getTelegramProxyUrl()
  if (!proxyUrl) return null
  console.log('[referral-bot] using proxy for Telegram API')
  return new ProxyAgent(proxyUrl)
}

const dispatcher = createTelegramDispatcher()

export function getGrammyClientConfig() {
  if (!dispatcher) return {}
  return {
    client: {
      baseFetchConfig: {
        dispatcher,
      },
    },
  }
}

export async function telegramFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    ...(dispatcher ? { dispatcher } : {}),
  })
}
