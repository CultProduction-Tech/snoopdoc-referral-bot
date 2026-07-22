const baseUrl = () => (process.env.SNOOPDOC_API_URL || 'https://snoopdoc.ru').replace(/\/$/, '')

function getSecret() {
  const secret = process.env.REFERRAL_BOT_API_SECRET?.trim()
  if (!secret) {
    throw new Error('REFERRAL_BOT_API_SECRET is not set')
  }
  return secret
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${baseUrl()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getSecret()}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || `API ${path} failed with ${res.status}`)
  }
  return data
}

export async function findActiveTelegramLink(telegramUserId) {
  const data = await apiFetch(
    `/api/referral-bot/active-link?telegramUserId=${telegramUserId}`
  )
  return {
    link: data.link ?? null,
    allowMultiple: !!data.allowMultiple,
  }
}

export async function getSession(telegramUserId) {
  const data = await apiFetch(`/api/referral-bot/session?telegramUserId=${telegramUserId}`)
  if (!data.session) return null
  return {
    step: data.session.step,
    full_name: data.session.fullName,
  }
}

export async function setSession(telegramUserId, step, fullName = null) {
  await apiFetch('/api/referral-bot/session', {
    method: 'POST',
    body: JSON.stringify({
      telegramUserId: String(telegramUserId),
      step,
      fullName,
    }),
  })
}

export async function clearSession(telegramUserId) {
  await apiFetch(`/api/referral-bot/session?telegramUserId=${telegramUserId}`, {
    method: 'DELETE',
  })
}

export async function issueReferralLink({ telegramUserId, telegramUsername, fullName, phone, email }) {
  const data = await apiFetch('/api/referral-bot/issue-link', {
    method: 'POST',
    body: JSON.stringify({
      telegramUserId: String(telegramUserId),
      telegramUsername,
      fullName,
      phone,
      email: email ?? null,
    }),
  })
  return data.link
}
