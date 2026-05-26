import { promises as fs } from 'fs'
import { join } from 'path'
import { xpRange } from '../lib/levelling.js'
import moment from 'moment-timezone'
import os from 'os'

const menuImages = [
  './menu-1.jpeg',
  './menu-2.jpeg',
  './menu-3.jpeg'
]

const emojicategoria = {
  iatesto: '📝',
  iaaudio: '🎧',
  iaimmagini: '🖼️'
}

let tags = {
  'iatesto': '𝘚𝘠𝘚𝘛𝘌𝘔_𝘛𝘌𝘟𝘛_𝘊𝘖𝘙𝘌',
  'iaaudio': '𝘚𝘠𝘚𝘛𝘌𝘔_𝘈𝘜𝘋𝘐𝘖_𝘊𝘖𝘙𝘌',
  'iaimmagini': '𝘚𝘠𝘚𝘛𝘌𝘔_𝘐𝘔𝘈𝘎𝘌_𝘊𝘖𝘙𝘌'
}

const defaultMenu = {
  before: `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘕𝘌𝘜𝘙𝘈𝘓 ☠️
───────────────────────
⎔ 𝘊𝘰𝘳𝘦_𝘓𝘪𝘯𝘬: %mention
⎔ 𝘚𝘛𝘓_𝘓𝘝𝘓: %level
⎔ 𝘓𝘪𝘧ｪ_𝘚𝘪𝘨𝘯𝘢𝘭: %uptime
⎔ 𝘎𝘩𝘰𝘴𝘵_𝘜𝘴𝘦𝘳𝘴: %totalreg
───────────────────────

» 𝘈𝘊𝘊𝘌𝘚𝘚𝘖 𝘙𝘌𝘛𝘌 𝘕𝘌𝘜𝘙𝘈𝘓𝘌 𝘐𝘕 𝘊𝘎𝘙𝘚𝘖...
`.trimStart(),
  header: 'ョ ── %category 𪚥',
  body: '    ⤿ %emoji %cmd ╳',
  footer: '͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞\n',
  after: `_𝘚𝘺𝘴𝘵𝘦𝘮 𝘸𝘪𝘭𝘭 𝘯𝘰𝘵 𝘳𝘦𝘉𝘰𝘰𝘵. 𝘌𝘯𝘫𝘰ย 𝘵𝘩𝗲 μ𝘩𝘢𝘰𝘴._`
}

let handler = async (m, { conn, usedPrefix: _p, __dirname }) => {
  try {
    await conn.sendPresenceUpdate('composing', m.chat)
    
    let mention = `@${m.sender.split('@')[0]}` // Tag dinamico
    let { level = 0, role = 'User' } = global.db.data.users[m.sender] || {}
    let name = await conn.getName(m.sender) || 'Utente'
    let uptime = clockString(process.uptime() * 1000)
    let totalreg = Object.keys(global.db.data.users).length

    let help = Object.values(global.plugins)
      .filter(plugin => !plugin.disabled && plugin.tags)
      .filter(plugin => ['iatesto', 'iaaudio', 'iaimmagini'].some(t => plugin.tags.includes(t)))
      .map(plugin => ({
        help: Array.isArray(plugin.help) ? plugin.help : [plugin.help],
        tags: Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags],
        prefix: 'customPrefix' in plugin
      }))

    let menuTags = Object.keys(tags)
    let _text = [
      defaultMenu.before,
      ...menuTags.map(tag => {
        return defaultMenu.header.replace(/%category/g, tags[tag]) + '\n' + [
          ...help.filter(menu => menu.tags.includes(tag) && menu.help).map(menu => {
            return menu.help.map(cmd => {
              return defaultMenu.body
                .replace(/%cmd/g, menu.prefix ? cmd : _p + cmd)
                .replace(/%emoji/g, emojicategoria[tag] || '🧠')
                .trim()
            }).join('\n')
          }),
          defaultMenu.footer
        ].join('\n')
      }),
      defaultMenu.after
    ].join('\n')

    let replace = {
      '%': '%',
      p: _p,
      name, level, uptime, totalreg, mention
    }

    let text = _text.replace(new RegExp(`%(${Object.keys(replace).sort((a, b) => b.length - a.length).join('|')})`, 'g'), (_, name) => '' + replace[name])

    await m.react('💥')

    let randomImg = menuImages[Math.floor(Math.random() * menuImages.length)]
    let imageBuffer = null

    try {
      imageBuffer = await fs.readFile(randomImg)
    } catch (e) {
      for (let img of menuImages) {
        try { imageBuffer = await fs.readFile(img); break } catch (err) {}
      }
    }

    await conn.sendMessage(m.chat, {
      ...(imageBuffer ? { image: imageBuffer } : {}),
      caption: text.trim(),
      contextInfo: {
        mentionedJid: [m.sender],
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363232743845068@newsletter',
          newsletterName: "☠️ ᴇʀʀᴏʀ⁴⁰⁴ // ɴᴇᴜʀᴀʟ ɴᴇᴛ ☠️"
        }
      }
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    conn.reply(m.chat, '❌ 𝘍𝘈𝘛𝘈𝘓_𝘌𝘙𝘙𝘖𝘙: Impossibile mappare la matrice neurale IA.', m)
  }
}

handler.help = ['menuia']
handler.tags = ['menu']
handler.command = ['menuia', 'menuai']

export default handler

function clockString(ms) {
  let h = isNaN(ms) ? '00' : Math.floor(ms / 3600000).toString().padStart(2, '0')
  let m = isNaN(ms) ? '00' : (Math.floor(ms / 60000) % 60).toString().padStart(2, '0')
  let s = isNaN(ms) ? '00' : (Math.floor(ms / 1000) % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}
