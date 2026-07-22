const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10) return null
  return '+' + digits
}

/**
 * Одно сообщение: «Мария +7 999 123-45-67» или «ivan@mail.ru 89991234567»
 */
export function parseContactMessage(text) {
  const trimmed = text.trim()
  if (!trimmed) return null

  // Ищем фрагмент с телефоном (10+ цифр, допускаем +, пробелы, скобки, дефисы)
  const phonePattern = /(\+?\d[\d\s().\-]{8,}\d|\d{10,})/g
  let phoneMatch = null
  let match
  while ((match = phonePattern.exec(trimmed)) !== null) {
    const digits = match[0].replace(/\D/g, '')
    if (digits.length >= 10) {
      phoneMatch = match
    }
  }

  if (!phoneMatch) return null

  const phone = normalizePhone(phoneMatch[0])
  if (!phone) return null

  const before = trimmed.slice(0, phoneMatch.index)
  const after = trimmed.slice(phoneMatch.index + phoneMatch[0].length)
  const contact = `${before} ${after}`
    .replace(/[,;|/\\\-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!contact) return null

  const isEmail = EMAIL_RE.test(contact)
  if (!isEmail && contact.length < 2) return null

  return {
    contact,
    phone,
    email: isEmail ? contact : null,
  }
}
