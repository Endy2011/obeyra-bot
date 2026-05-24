import PhoneNumber from 'awesome-phonenumber'
import chalk from 'chalk'
import { watchFile } from 'fs'
import { fileURLToPath } from 'url'
import NodeCache from 'node-cache'

const __filename = fileURLToPath(import.meta.url)
const nameCache = new NodeCache({ stdTTL: 600 });
const groupMetaCache = new NodeCache({ stdTTL: 300 });
const errorThrottle = {};
const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g

export default async function (m, conn = { user: {} }) {
  if (!global.messageUpdateListenerSet) {
    conn.ev.on('messages.update', (updates) => {
      for (const update of updates) {
        if (update.update.message?.editedMessage) {
          console.log(chalk.bgHex('#00FF00').black.bold(' 🛠️ PKT_MOD '), chalk.greenBright('Rilevata modifica payload in questa sessione.'));
        }
      }
    })
    global.messageUpdateListenerSet = true
  }

  if (!m || m.key?.fromMe) return

  try {
    const senderJid = conn.decodeJid(m.sender)
    const chatJid = conn.decodeJid(m.chat || '')
    const botJid = conn.decodeJid(conn.user?.jid)
    if (!chatJid) return;

    let _name = nameCache.get(senderJid) || await conn.getName(senderJid) || '';
    nameCache.set(senderJid, _name);

    const sender = formatPhoneNumber(senderJid, _name)
    let chatName = nameCache.get(chatJid) || await conn.getName(chatJid) || 'Unknown_Host';

    const isOwner = Array.isArray(global.owner) ? global.owner.map(([number]) => number).includes(senderJid.split('@')[0]) : global.owner === senderJid.split('@')[0]
    const isGroup = chatJid.endsWith('@g.us')
    const isAdmin = isGroup ? await checkAdmin(conn, chatJid, senderJid) : false
    const isPremium = global.prems?.includes(senderJid) || false
    const isBanned = global.DATABASE?.data?.users?.[senderJid]?.banned || false

    const user = global.DATABASE?.data?.users?.[senderJid] || { exp: '?', euro: '?' }

    // --- PALETTE COLORI HACKER TERMINAL ---
    const c = {
      p: chalk.hex('#00FF00').bold,       // Matrix Lime (Bordi e Struttura)
      s: chalk.hex('#00AA00'),            // Dark Green (Etichette)
      t: chalk.hex('#A0FFA0'),            // Light Green/White (Dati testuali)
      g: chalk.hex('#00FFFF').bold,       // Cyber Cyan (Elementi di rete/Gruppi)
      v: chalk.hex('#555555'),            // Dark Gray (Separatori d'interfaccia)
      warn: chalk.hex('#FFFF00').bold,    // Warn Amber (Bypass/Privilegi elevati)
      err: chalk.hex('#FF0000').bold      // Breach Red (Anomalie/Ban)
    }

    // INTERFACCIA GRAFICA TERMINAL SHELL
    const top = c.p('┌───[ ') + chalk.bgHex('#002200').hex('#00FF00').bold(' ERROR⁴⁰⁴ // INBOUND_TRAFFIC ') + c.p(' ]' + '─'.repeat(16))
    const mid = c.v('├' + '─'.repeat(50) + '┤')
    const bot = c.p('└' + '─'.repeat(50) + '┘')
    const L = c.p('│')

    // COSTRUZIONE STRUTTURA LOG
    console.log('\n' + top)
    console.log(`${L} ${c.s('HOST_SRC ')} ${c.v('::')} ${c.t(sender)}`)
    console.log(`${L} ${c.s('SYS_NET  ')} ${c.v('::')} ${c.t(chatName)} ${isGroup ? c.g('<NODE_GRID>') : chalk.hex('#BC13FE')('<PVT_TUNNEL>')}`)
    console.log(`${L} ${c.s('AUTH_LVL ')} ${c.v('::')} ${getUserStatus(isOwner, isAdmin, isPremium, isBanned, c)}`)
    console.log(`${L} ${c.s('PAYLOAD  ')} ${c.v('::')} ${c.t(formatType(m))} ${getMessageFlags(m, c)}`)

    if (m.isCommand) {
      console.log(mid)
      console.log(`${L} ${c.warn('⚡ KERNEL_CMD')} ${c.v('::')} ${chalk.bgHex('#00FF00').black.bold(' ' + getCommand(m.text) + ' ')}`)
    }

    if (user.exp !== '?') {
      console.log(`${L} ${c.g('📊 ASSETS_REG')} ${c.v('::')} ${c.t(user.exp + ' XP')} ${c.v('|')} ${c.t(user.euro + ' Eris')}`)
    }

    // SEZIONE BUFFER MESSAGGIO
    const logText = await formatText(m, conn)
    if (logText?.trim()) {
      console.log(mid)
      console.log(`${L} ${c.s('DATA_STREAM')} ${c.v('::')} ${logText}`)
    }

    logMessageSpecifics(m, c, L)
    console.log(bot)

  } catch (error) {
    throttleError('Log Core Malfunction:', error.message, 5000);
  }
}

// --- LOGICA DI SUPPORTO ---

function getUserStatus(isOwner, isAdmin, isPremium, isBanned, c) {
  if (isBanned) return c.err('[ CORRUPTED_HOST ]')
  if (isOwner) return chalk.bgHex('#FF0000').black.bold(' ROOT_USER ')
  let s = []
  if (isAdmin) s.push(c.warn('SYS_ADMIN'))
  if (isPremium) s.push(c.g('BYPASS_CORE'))
  return s.length ? s.join(chalk.gray(' | ')) : chalk.gray('EXTERNAL_CLIENT')
}

function getColorScheme() { /* Mockup per compatibilità */ }

function formatPhoneNumber(jid, name) {
  const num = jid.split('@')[0].split(':')[0]
  return name ? `${name} ${chalk.hex('#555555')('<'+num+'>')}` : num
}

function formatTimestamp(ts) {
  return new Date(ts * 1000).toLocaleTimeString('it-IT')
}

function formatType(m) {
  return (m.mtype || 'raw').replace(/Message/gi, '').toUpperCase()
}

function getMessageFlags(m, c) {
  let f = []
  if (m.quoted) f.push(chalk.hex('#555555')('↶ STACK_REF'))
  if (m.forwarded) f.push(c.g('➥ PKT_RELAY'))
  return f.length ? chalk.gray('[') + f.join(' ') + chalk.gray(']') : ''
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

function logMessageSpecifics(m, c, L) {
  const types = {
    imageMessage: '🖼️ HEX_IMAGE',
    videoMessage: '🎥 STREAM_VIDEO',
    audioMessage: '🎵 BYTE_AUDIO',
    stickerMessage: '✨ RENDER_STICKER',
    documentMessage: '📄 FILE_BLOB'
  }
  if (types[m.mtype]) console.log(`${L} ${c.s('ENC_OBJECT ')} ${c.v('::')} ${c.p(types[m.mtype])}`)
}

async function formatText(m, conn) {
  let text = (m.text || m.caption || '').trim()
  if (!text) return ''
  return chalk.hex('#A0FFA0')(text.length > 100 ? text.slice(0, 100) + '...' : text)
}

function throttleError(message, error, delay) {
  console.error(chalk.red(message), error)
}

watchFile(__filename, () => {
  console.log(chalk.bgHex('#003300').hex('#00FF00').bold(" ⚡ HOT_SWAP: ENGINE CODE OVERRIDE EXECUTED SUCCESSFULLY "))
})
