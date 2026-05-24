import { downloadContentFromMessage } from '@realvare/baileys'
import crypto from 'crypto'
import fetch from 'node-fetch'
import FormData from 'form-data'

let handler = m => m

handler.before = async function (m, { conn, isAdmin, isOwner, isROwner, isBotAdmin }) {
  if (m.isBaileys && m.fromMe) return true
  if (!m.isGroup) return false
  if (!m.message) return true

  const chat = global.db.data.chats[m.chat] || {}
  if (!chat.antiporno) return true
  if (isAdmin || isOwner || isROwner || m.fromMe) return true

  const user = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {})
  if (typeof user.warn !== 'number') user.warn = 0
  if (!Array.isArray(user.warnReasons)) user.warnReasons = []

  if (!global.db.data.nsfwCache) global.db.data.nsfwCache = {}

  const isMedia =
    m.message.imageMessage ||
    m.message.videoMessage ||
    m.message.stickerMessage

  if (isMedia) {
    try {
      let mediaBuffer, mimeType, fileName
      const quoted = m.message.extendedTextMessage?.contextInfo?.quotedMessage

      const msg = quoted
        ? (quoted.imageMessage || quoted.videoMessage || quoted.stickerMessage)
        : (m.message.imageMessage || m.message.videoMessage || m.message.stickerMessage)

      if (!msg) return true

      let type
      const isStickerMsg = !!(
        quoted?.stickerMessage ||
        m.message.stickerMessage ||
        msg.mimetype === 'image/webp'
      )

      if (isStickerMsg) type = 'sticker'
      else if (msg.mimetype?.includes('video')) type = 'video'
      else if (msg.mimetype?.includes('image')) type = 'image'
      else return true

      const stream = await downloadContentFromMessage(msg, type)
      mediaBuffer = Buffer.from([])

      for await (const chunk of stream) {
        mediaBuffer = Buffer.concat([mediaBuffer, chunk])
      }

      const fileHash = crypto.createHash('md5').update(mediaBuffer).digest('hex')

      if (global.db.data.nsfwCache[fileHash] === true) {
        return await punishUser(conn, m, user, isBotAdmin, '𝘗𝘈𝘊𝘒𝘌𝘛_𝘒𝘕𝘖𝘞𝘕_𝘕𝘚𝘍𝘞_𝘋𝘌𝘛𝘌𝘊𝘛𝘌𝘋')
      }

      if (global.db.data.nsfwCache[fileHash] === false) {
        return true
      }

      if (type === 'video') {
        mimeType = 'video/mp4'
        fileName = 'media.mp4'
        if (mediaBuffer.length > 10 * 1024 * 1024) return true
      } else if (type === 'sticker') {
        mimeType = 'image/webp'
        fileName = 'media.webp'
      } else {
        mimeType = msg.mimetype || 'image/jpeg'
        fileName = 'media.jpg'
      }

      const SIGHTENGINE_USER = global.APIKeys.sightengine_user
      const SIGHTENGINE_SECRET = global.APIKeys.sightengine_secret

      if (!SIGHTENGINE_USER || !SIGHTENGINE_SECRET) return true

      const apiUrl = type === 'video'
        ? 'https://api.sightengine.com/1.0/video/check-sync.json'
        : 'https://api.sightengine.com/1.0/check.json'

      const formData = new FormData()
      formData.append('media', mediaBuffer, { filename: fileName, contentType: mimeType })
      formData.append('models', 'nudity-2.1')
      formData.append('api_user', SIGHTENGINE_USER)
      formData.append('api_secret', SIGHTENGINE_SECRET)

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (result.status !== 'success') return true

      let raw = 0
      let partial = 0
      let sexual = 0
      let erotica = 0

      if (type === 'video') {
        const frames = result.data?.frames || []
        raw = Math.max(...frames.map(f => f.nudity?.raw || 0), 0)
        partial = Math.max(...frames.map(f => f.nudity?.partial || 0), 0)
        sexual = Math.max(...frames.map(f => f.nudity?.sexual_activity || f.nudity?.sexual_display || 0), 0)
        erotica = Math.max(...frames.map(f => f.nudity?.erotica || 0), 0)
      } else {
        const nudity = result.nudity || {}
        raw = nudity.raw || 0
        partial = nudity.partial || 0
        sexual = nudity.sexual_activity || nudity.sexual_display || 0
        erotica = nudity.erotica || 0
      }

      const isHighRisk =
        raw > 0.40 ||
        sexual > 0.50 ||
        erotica > 0.60 ||
        (partial > 0.70 && raw > 0.10)

      global.db.data.nsfwCache[fileHash] = isHighRisk

      if (isHighRisk) {
        return await punishUser(conn, m, user, isBotAdmin, '𝘊𝘖𝘕𝘛𝘌𝘕𝘜𝘛𝘌_𝘝𝘐𝘚𝘜𝘈𝘓𝘌_𝘕𝘚𝘍𝘞_𝘙𝘐𝘓𝘌𝘝𝘈𝘛𝘖')
      }
    } catch (e) {
      console.error('Errore antiporno:', e)
      return true
    }
  }

  const txt = (m.text || m.caption || '').toLowerCase()
  const nsfwKeywords = ['porn', 'xnxx', 'xvideos', 'xhamster', 'nude', 'pornhub']

  if (txt.includes('http') && nsfwKeywords.some(keyword => txt.includes(keyword))) {
    return await punishUser(conn, m, user, isBotAdmin, '𝘓𝘐𝘕𝘒_𝘕𝘚𝘍𝘞_𝘉𝘓𝘈𝘊𝘒𝘓𝘐𝘚𝘛𝘌𝘋')
  }

  return true
}

async function punishUser(conn, m, user, isBotAdmin, reason) {
  user.warn += 1
  user.warnReasons ??= []
  user.warnReasons.push('antiporno')

  const senderTag = m.sender.split('@')[0]

  try {
    await conn.sendMessage(m.chat, { delete: m.key })
  } catch {}

  if (user.warn < 3) {
    let warnMsg = `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘕𝘚𝘍𝘞_𝘐𝘕𝘛𝘗𝘜𝘛_𝘋𝘌𝘛𝘌𝘊𝘛𝘌𝘋 ☠️
───────────────────────
⎔ 𝘚𝘺𝘴_𝘚𝘵𝘢𝘵𝗎𝗌: 𝘗𝘜𝘙𝘎𝘌_𝘜𝘕𝘚𝘈𝘍𝘌_𝘔𝘌𝘋𝘐𝘈
⎔ 𝘛𝘢𝘳𝘨𝘦𝘵_𝘏𝘰𝓼𝘵: @${senderTag}
⎔ 𝘍𝘪𝘭𝘵𝘦𝘳_𝘓𝘰𝘨: ${reason}
⎔ 𝘚𝘺𝘴_𝘞𝘢𝘳𝘯: *${user.warn}/3*
───────────────────────

» 𝘈𝘝𝘝𝘐𝘚𝘜: Rilevato materiale esplicito o link a domini vietati dall'algoritmo di controllo. Il buffer multimediale è stato distrutto per preservare la stabilità della chat. Al terzo rilevamento l'istanza utente sarà terminata.

͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞
_𝘚𝘺𝘴𝘵𝘦𝘮 𝘸𝘪𝘭𝘭 𝘯𝘰𝘵 𝘳𝘦𝘉𝘰𝘰𝒕. 𝘌𝘯𝘫𝘰ย 𝘵𝘩𝗲 𝘤𝘩𝘢𝘰𝘴._`.trim()

    await conn.sendMessage(m.chat, {
      text: warnMsg,
      mentions: [m.sender]
    }, { quoted: m })

    return false
  }

  user.warn = 0
  user.warnReasons = []

  if (!isBotAdmin) {
    let failMsg = `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘕𝘚𝘍𝘞_𝘓𝘐𝘕𝘌_𝘌𝘟𝘊𝘌𝘌𝘋𝘌𝘋 ☠️
───────────────────────
⎔ 𝘛𝘢𝘳𝘨𝘦𝘵_𝘏𝘰𝓼𝘵: @${senderTag}
⎔ 𝘚𝘺𝘴_𝘞𝘢𝘳𝘯: *3/3*
⎔ 𝘚𝘺𝘴_𝘈𝘤𝘵𝘪𝘰𝘯: 𝘒𝘐𝘊𝘒_𝘍𝘈𝘐𝘓𝘌𝘋_𝘕𝘖_𝘈𝘋𝘔𝘐𝘕
───────────────────────

» 𝘓𝘖𝘎: Soglia critica superata per invio di pacchetti pornografici non autorizzati. Impossibile purgare l'host: l'engine del bot non ha ottenuto i privilegi di amministratore (Sys_Admin) in questo settore.

͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞
_𝘚𝘺𝘴𝘵𝘦𝘮 𝘸𝘪𝘭𝘭 𝘯𝘰𝘵 𝘳𝘦𝘉𝘰𝘰𝒕. 𝘌𝘯𝘫𝘰ย 𝘵𝘩𝗲 𝘤𝘩𝘢𝘰𝘴._`.trim()

    await conn.sendMessage(m.chat, {
      text: failMsg,
      mentions: [m.sender]
    }, { quoted: m })

    return false
  }

  let kickMsg = `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘕𝘖𝘋𝘌_𝘛𝘌𝘙𝘔𝘐𝘕𝘈𝘛𝘌𝘋 ☠️
───────────────────────
⎔ 𝘛𝘢𝘳𝘨𝘦𝘵_𝘏𝘰𝓼𝘵: @${senderTag}
⎔ 𝘚𝘺𝘴_𝘚𝘵𝘢𝘵𝗎𝗌: 𝘉𝘓𝘈𝘊𝘓𝘐𝘚𝘛𝘌𝘋_𝘈𝘎𝘌𝘕𝘛
⎔ 𝘙𝘦𝘢𝘴𝘰𝘯_𝘊𝘰𝘥𝘦: 𝘕𝘚𝘍𝘞_𝘝𝘐𝘖𝘓𝘈𝘛𝘐𝘖𝘕_𝘓𝘐𝘔𝘐𝘛
───────────────────────

» 𝘓𝘖𝘎: Interruzione forzata della connessione host. La reiterata iniezione di flussi erotici o nsfw ha forzato l'isolamento del nodo e la conseguente rimozione definitiva dall'infrastruttura del gruppo.

͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞
_𝘚𝘺𝘴𝘵𝘦𝘮 𝘸𝘪𝘭𝘭 𝘯𝘰𝘵 𝘳𝘦𝘉𝘰𝘰𝒕. 𝘌𝘯𝘫𝘰ย 𝘵𝘩𝗲 𝘤𝘩𝘢𝘰𝘴._`.trim()

  await conn.sendMessage(m.chat, {
    text: kickMsg,
    mentions: [m.sender]
  }, { quoted: m })

  await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
  return false
}

export default handler
