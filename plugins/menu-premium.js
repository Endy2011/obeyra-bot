import { promises as fs } from 'fs'
import { join } from 'path'
import { xpRange } from '../lib/levelling.js'
import moment from 'moment-timezone'
import os from 'os'

// Configurazione immagini random (tutte .jpeg)
const menuImages = [
  './menu-1.jpeg',
  './menu-2.jpeg',
  './menu-3.jpeg'
]

const defaultMenu = {
  before: `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝖯𝖱𝖤𝖬𝖨𝖴𝖬 ☠️
───────────────────────
⎔ 𝘊𝘰𝘳𝘦_𝘓𝘪𝘯𝘬: %name
⎔ 𝘗𝘳执行_𝘙𝘢𝘯𝘬: %role
⎔ 𝘚𝘺𝘴_𝘚𝘵𝘢𝘵𝗎𝗌: 𝘌𝘓𝘐𝘛𝘌_𝘉𝘙𝘌𝘈𝘊𝘏
───────────────────────

» 𝘈𝘊𝘊𝘌𝘚𝘚𝘖 𝘕𝘖𝘋𝘖 𝘗𝘙𝘐𝘝𝘈𝘛𝘖 𝘐𝘕 𝘊𝘖𝘙𝘚𝘖...
`.trimStart(),
  header: 'ョ ── %category 𪚥',
  body: '    ⤿ 👑 %cmd ╳',
  footer: '͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞\n',
  after: `_𝘚𝘺𝘴𝘵𝘦𝘮 𝘸𝘪𝘭𝘭 𝘯𝘰𝘵 𝘳𝘦𝘉𝘰𝘰𝘵. 𝘌𝘯𝘫𝘰ย 𝘵𝘩𝗲 𝘤𝘩𝘢𝘰𝘴._`
}

let handler = async (m, { conn, usedPrefix: _p }) => {
  let tags = {
    'prem': '𝘚𝘠𝘚𝘛𝘌𝘔_𝘔𝘈𝘓𝘍𝘜𝘕𝘊𝘛𝘐𝘖𝘕_𝘗𝘙𝘌𝘔'
  }

  try {
    await conn.sendPresenceUpdate('composing', m.chat)

    let user = global.db.data.users[m.sender] || {}
    let { level = 0, role = 'User' } = user
    let name = await conn.getName(m.sender)
    let _uptime = process.uptime() * 1000
    let uptime = clockString(_uptime)

    // Filtraggio plugin premium
    let help = Object.values(global.plugins).filter(p => !p.disabled && p.tags && (p.tags.includes('premium') || p.tags.includes('prem') || p.tags.includes('premio'))).map(p => ({
      help: Array.isArray(p.help) ? p.help : [p.help],
      prefix: 'customPrefix' in p,
    }))

    let _text = [
      defaultMenu.before,
      defaultMenu.header.replace(/%category/g, tags['prem']),
      help.map(menu => menu.help.map(cmd => 
        defaultMenu.body.replace(/%cmd/g, menu.prefix ? cmd : _p + cmd)
      ).join('\n')).join('\n'),
      defaultMenu.footer,
      defaultMenu.after
    ].join('\n')

    let replace = {
      '%': '%',
      p: _p,
      name, level, role, uptime
    }

    let text = _text.replace(new RegExp(`%(${Object.keys(replace).sort((a, b) => b.length - a.length).join('|')})`, 'g'), (_, name) => '' + replace[name])

    await m.react('💥')

    // Estrazione random dell'immagine .jpeg
    let randomImg = menuImages[Math.floor(Math.random() * menuImages.length)]
    let imageBuffer = null
    
    try {
      imageBuffer = await fs.readFile(randomImg)
    } catch (e) {
      console.log(`⚠️ Immagine ${randomImg} non trovata, tento il recupero...`)
      for (let img of menuImages) {
        try {
          imageBuffer = await fs.readFile(img)
          break
        } catch (err) {}
      }
    }

    // Invio finale con l'immagine random caricata in Buffer e contesto grafico aggiornato
    await conn.sendMessage(m.chat, {
      ...(imageBuffer ? { image: imageBuffer } : {}),
      caption: text.trim(),
      contextInfo: {
        mentionedJid: [m.sender],
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363232743845068@newsletter',
          newsletterName: "☠️ ᴇʀʀᴏʀ⁴⁰⁴ // ᴘʀᴇᴍɪᴜᴍ sʏs ☠️"
        }
      }
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    conn.reply(m.chat, '❌ 𝘍𝘈𝘛𝘈𝘓_𝘌𝘙𝘙𝘖𝘙: Impossibile decriptare i protocolli privati Premium.', m)
  }
}

handler.help = ['menupremium']
handler.tags = ['menu']
handler.command = ['menupremium', 'menuprem']

export default handler

function clockString(ms) {
  let h = isNaN(ms) ? '00' : Math.floor(ms / 3600000).toString().padStart(2, '0')
  let m = isNaN(ms) ? '00' : (Math.floor(ms / 60000) % 60).toString().padStart(2, '0')
  let s = isNaN(ms) ? '00' : (Math.floor(ms / 1000) % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}
