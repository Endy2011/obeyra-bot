let handler = m => m

function unwrapMessageContent(message) {
  let content = message?.message || message
  for (let i = 0; i < 10; i++) {
    if (content?.ephemeralMessage?.message) { content = content.ephemeralMessage.message; continue }
    if (content?.viewOnceMessage?.message) { content = content.viewOnceMessage.message; continue }
    if (content?.viewOnceMessageV2?.message) { content = content.viewOnceMessageV2.message; continue }
    if (content?.documentWithCaptionMessage?.message) { content = content.documentWithCaptionMessage.message; continue }
    if (content?.editedMessage?.message) { content = content.editedMessage.message; continue }
    break
  }
  return content
}

function extractTextFromMessage(m, excludeQuoted = false) {
  const texts = []
  const seen = new Set()
  const IGNORED_KEYS = ['fileSha256', 'mediaKey', 'fileEncSha256', 'jpegThumbnail', 'participant', 'stanzaId', 'remoteJid', 'id']

  function recursiveExtract(obj) {
    if (!obj || typeof obj !== 'object' || seen.has(obj)) return
    seen.add(obj)
    for (const key in obj) {
      if (excludeQuoted && key === 'quotedMessage') continue
      if (IGNORED_KEYS.includes(key)) continue
      const value = obj[key]
      if (typeof value === 'string' && value.length > 0) texts.push(value)
      else if (typeof value === 'object') recursiveExtract(value)
    }
  }

  if (m?.text) texts.push(m.text)
  if (m?.caption) texts.push(m.caption)
  recursiveExtract(unwrapMessageContent(m))
  return texts.filter(Boolean).join(' ').replace(/[\s\u200b\u200c\u200d\uFEFF]+/g, ' ').trim()
}

function containsLink(text) {
  const t = String(text || '').trim()
  if (!t) return false
  const quick = /(https?:\/\/|www\.|chat\.whatsapp\.com\/|wa\.me\/|t\.me\/|discord\.gg\/|bit\.ly\/|tinyurl\.com\/|instagram\.com\/|facebook\.com\/|tiktok\.com\/|youtube\.com\/|youtu\.be\/)/i
  if (quick.test(t)) return true
  const genericDomain = /\b([a-z0-9-]+\.)+[a-z]{2,}(\/[\w\-._~%!$&'()*+,;=:@/?#\[\]]*)?/i
  return genericDomain.test(t)
}

// --- GESTIONE SANZIONI ---

async function addWarn(conn, m, target, reason, isBotAdmin) {
  if (!global.db.data.users[target]) global.db.data.users[target] = {}
  const user = global.db.data.users[target]
  if (!user.warns) user.warns = {}
  if (typeof user.warns[m.chat] !== 'number') user.warns[m.chat] = 0

  user.warns[m.chat] += 1
  const warns = user.warns[m.chat]
  const tag = target.split('@')[0]

  if (warns >= 3) {
    user.warns[m.chat] = 0
    let kickMsg = `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘛𝘌𝘙𝘔𝘐𝘕𝘈𝘛𝘌_𝘏𝘖𝘚𝘛 ☠️
───────────────────────
⎔ 𝘛𝘢𝘳𝘨𝘦𝘵_𝘏𝘰𝓼𝘵: @${tag}
⎔ 𝘚𝘺𝘴_𝘚𝘵𝘢𝘵𝗎𝗌: 𝘓𝘐𝘔𝘐𝘛_𝘌𝘟𝘊𝘌𝘌𝘋𝘌𝘋
⎔ 𝘚𝘺𝘴_𝘈𝘤𝘵𝘪𝘰𝘯: 𝘗𝘜𝘙𝘎𝘌_𝘌𝘟𝘌𝘊𝘜𝘛𝘌𝘋
───────────────────────

» 𝘓𝘖𝘎: L'host ha saturato la tolleranza del firewall iniettando collegamenti ipertestuali multipli non autorizzati. Il nodo viene rimosso definitivamente dal server del gruppo.

͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞
_𝘚𝘺𝘴𝘵𝘦𝘮 𝘸𝘪𝘭𝘭 𝘯𝘰𝘵 𝘳𝘦𝘉𝘰𝘰𝘵. 𝘌𝘯𝘫𝘰ย 𝘵𝘩𝗲 𝘤𝘩𝘢𝘰𝘴._`.trim()

    await conn.sendMessage(m.chat, {
      text: kickMsg,
      mentions: [target]
    }).catch(() => {})

    if (isBotAdmin) {
      await conn.groupParticipantsUpdate(m.chat, [target], 'remove').catch(() => {})
    }
    return
  }

  let warnMsg = `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘓𝘐𝘕𝘒_𝘋𝘌𝘛𝘌𝘊𝘛𝘐𝘖𝘕 ☠️
───────────────────────
⎔ 𝘚𝘺𝘴_𝘚𝘵𝘢𝘵𝗎𝗌: 𝘜𝘕𝘈𝘜𝘛𝘏𝘖𝘙𝘐𝘡𝘌𝘋_𝘜𝘙𝘓_𝘍𝘖𝘜𝘕𝘋
⎔ 𝘛𝘢𝘳𝘨𝘦𝘵_𝘏𝘰𝓼𝘵: @${tag}
⎔ 𝘍𝘪𝘭𝘵𝘦𝘳_𝘓𝘰𝘨: ${reason.toUpperCase()}
⎔ 𝘚𝘺𝘴_𝘞𝘢𝘳𝘯: *${warns}/3*
───────────────────────

» 𝘈𝘝𝘝𝘐𝘚Official: Rilevato pacchetto dati contenente stringhe o indirizzi IP di rete estranei al gruppo. Il payload è stato distrutto. Al terzo avviso l'host verrà bannato dal nodo locale.

͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞
_𝘚𝘺𝘴𝘵𝘦𝘮 𝘸𝘪𝘭𝘭 𝘯𝘰𝘵 𝘳𝘦𝘉𝘰𝘰𝘵. 𝘌𝘯𝘫𝘰ย 𝘵𝘩𝗲 𝘤𝘩𝘢𝘰𝘴._`.trim()

  await conn.sendMessage(m.chat, {
    text: warnMsg,
    mentions: [target]
  }).catch(() => {})
}

// --- HANDLER BEFORE ---

handler.before = async function (m, { conn, isAdmin, isBotAdmin, isOwner, isSam }) {
  if (m.isBaileys && m.fromMe) return true
  if (!m.isGroup) return false
  if (!m.message) return true

  const chat = global.db.data.chats[m.chat]
  if (!chat?.antiLinkUni) return true

  // Gli admin e Blood sono immuni
  if (isAdmin || isOwner || isSam) return true

  const text = extractTextFromMessage(m, true)
  if (!containsLink(text)) return true

  // Azione immediata: eliminazione del frame infetto
  if (isBotAdmin) {
    await conn.sendMessage(m.chat, { delete: m.key }).catch(() => {})
  }

  // Registrazione violazione nello stack dei dati utente
  await addWarn(conn, m, m.sender, 'Link_Universal_Violation', !!isBotAdmin)

  return false
}

export default handler
