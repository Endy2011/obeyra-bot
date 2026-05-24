import PhoneNumber from 'awesome-phonenumber'
import chalk from 'chalk'
import { watchFile } from 'fs'
import { fileURLToPath } from 'url'
import NodeCache from 'node-cache'

const __filename = fileURLToPath(import.meta.url)
const nameCache = new NodeCache({ stdTTL: 600 });
const groupMetaCache = new NodeCache({ stdTTL: 300 });
const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g

export default async function (m, conn = { user: {} }) {
  if (!global.messageUpdateListenerSet) {
    conn.ev.on('messages.update', (updates) => {
      for (const update of updates) {
        if (update.update.message?.editedMessage) {
          console.log(chalk.bgRed.black.bold(' ⚠ EDIT '), chalk.red('Messaggio corrotto/modificato.'));
        }
      }
    })
    global.messageUpdateListenerSet = true
  }

  if (!m || m.key?.fromMe) return

  try {
    const senderJid = conn.decodeJid(m.sender)
    const chatJid = conn.decodeJid(m.chat || '')
    if (!chatJid) return;

    let _name = nameCache.get(senderJid) || await conn.getName(senderJid) || '';
    nameCache.set(senderJid, _name);

    const sender = formatPhoneNumber(senderJid, _name)
    let chatName = nameCache.get(chatJid) || await conn.getName(chatJid) || 'Unknown';

    const isOwner = Array.isArray(global.owner) ? global.owner.map(([number]) => number).includes(senderJid.split('@')[0]) : global.owner === senderJid.split('@')[0]
    const isGroup = chatJid.endsWith('@g.us')
    const isAdmin = isGroup ? await checkAdmin(conn, chatJid, senderJid) : false
    const isPremium = global.prems?.includes(senderJid) || false
    const isBanned = global.DATABASE?.data?.users?.[senderJid]?.banned || false
    const user = global.DATABASE?.data?.users?.[senderJid] || { exp: '?', euro: '?' }

    // --- STILIZZAZIONE ERROR-BOT ---
    const e = {
      g: chalk.hex('#00FF00'),    // Verde terminale
      r: chalk.hex('#FF0000'),    // Rosso errore
      w: chalk.white,
      bg: chalk.bgHex('#00FF00').black.bold,
      dim: chalk.gray
    }

    const top = e.g('┌──[ ERROR⁴⁰⁴ // INBOUND_TRAFFIC ]──┐')
    const mid = e.g('├─────────────────────────────────────')
    const bot = e.g('└─────────────────────────────────────┘')
    const L = e.g('│')

    console.log('\n' + top)
    console.log(`${L} ${e.g('HOST_SRC  ::')} ${e.w(sender)}`)
    console.log(`${L} ${e.g('SYS_NET   ::')} ${e.w(chatName)} ${isGroup ? e.r('[GROUP]') : e.dim('[PVT]')}`)
    console.log(`${L} ${e.g('AUTH_LVL  ::')} ${getUserStatus(isOwner, isAdmin, isPremium, isBanned, e)}`)
    console.log(`${L} ${e.g('PAYLOAD   ::')} ${e.w(formatType(m))} ${getMessageFlags(m, e)}`)

    if (m.isCommand) {
      console.log(mid)
      console.log(`${L} ${e.g('KERNEL_CMD::')} ${e.bg(' ' + getCommand(m.text) + ' ')}`)
    }

    if (user.exp !== '?') {
      console.log(`${L} ${e.g('ASSETS_REG::')} ${e.w(user.exp + ' XP | ' + user.euro + ' Eris')}`)
    }

    const logText = await formatText(m, conn)
    if (logText?.trim()) {
      console.log(mid)
      console.log(`${L} ${e.g('DATA_STRM ::')} ${e.w(logText)}`)
    }

    logMessageSpecifics(m, e, L)
    console.log(bot)

  } catch (error) {
    console.error(chalk.bgRed.white(' ⚠ FATAL_LOG_ERROR '), error.message)
  }
}

// --- LOGICA ---
function getUserStatus(isOwner, isAdmin, isPremium, isBanned, e) {
  if (isBanned) return e.r('BANNED_USER')
  if (isOwner) return e.bg(' OWNER ')
  return isAdmin ? e.w('ADMIN') : e.dim('EXTERNAL_CLIENT')
}

function formatPhoneNumber(jid, name) {
  const num = jid.split('@')[0].split(':')[0]
  return name ? `${name} <${num}>` : num
}

function formatType(m) {
  return (m.mtype || 'msg').replace(/Message/gi, '').toUpperCase()
}

function getMessageFlags(m, e) {
  return m.quoted ? e.r(' ↶ RPLY') : ''
}

function getCommand(text) {
  return text ? text.split(/\s/)[0].toUpperCase() : ''
}

async function checkAdmin(conn, chatId, senderId) {
  try {
    const groupMeta = groupMetaCache.get(chatId) || await conn.groupMetadata(chatId)
    groupMetaCache.set(chatId, groupMeta)
    return groupMeta?.participants?.some(p => conn.decodeJid(p.id) === conn.decodeJid(senderId) && p.admin) || false
  } catch { return false }
}

function logMessageSpecifics(m, e, L) {
  const types = { imageMessage: 'IMAGE', videoMessage: 'VIDEO', stickerMessage: 'STICKER' }
  if (types[m.mtype]) console.log(`${L} ${e.g('ATTACH    ::')} ${e.w(types[m.mtype])}`)
}

async function formatText(m, conn) {
  let text = (m.text || m.caption || '').trim()
  return text.length > 30 ? text.slice(0, 30) + '...' : text
}

watchFile(__filename, () => {
  console.log(chalk.bgHex('#00FF00').black.bold(" ⚡ KERNEL_REBOOT: CONFIG.JS UPDATED "))
})
