import { promises as fs } from 'fs'
import { join } from 'path'

const menuImages = [
  './menu-1.jpeg',
  './menu-2.jpeg',
  './menu-3.jpeg'
]

const defaultMenu = {
  before: `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝗘 𝗖 𝗢 𝗡 𝗢 𝗠 𝗬 ☠️
───────────────────────
⎔ 𝘊𝘰𝘳𝘦_𝘓𝘪𝘯𝘬: %mention
⎔ 𝘝𝘢𝘶𝘭𝘵_𝘉𝘢𝘭: %eris 𝘌𝘳𝘪𝘴
⎔ 𝘚𝘺𝘴_𝘓𝘝𝘓: %level
⎔ 𝘗𝘳𝘪𝘷𝘪𝘭𝘦𝘨𝘦𝘴: %role
───────────────────────

» 𝘊𝘙𝘠𝘗𝘛𝘖_𝘉𝘙𝘌𝘈𝘊𝘏_𝘓𝘖𝘈𝘋𝘐𝘕𝘎...
`.trimStart(),
  header: 'ョ ── %category 𪚥',
  body: '    ⤿ 🪙 %cmd ╳',
  footer: '͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞\n',
  after: `_𝘚𝘺𝘴𝘵𝘦𝘮 𝘸𝘪𝘭𝘭 𝘯𝘰𝘵 𝘳𝘦𝘉𝘰𝘰𝘵. 𝘌𝘯𝘫𝘰𝘺 𝘵𝘩𝘦 𝘤𝘩𝘢𝘰𝘴._`
}

let handler = async (m, { conn, usedPrefix: _p }) => {
  try {
    await conn.sendPresenceUpdate('composing', m.chat)

    let mention = `@${m.sender.split('@')[0]}`
    let user = global.db.data.users[m.sender] || {}
    let { level = 1, role = 'Utente', eris = 0 } = user
    let uptime = clockString(process.uptime() * 1000)
    let tags = { 'euro': '𝘚𝘠𝘚𝘛𝘌𝘔_𝘔𝘈𝘓𝘍𝘜𝘕𝘊𝘛𝘐𝘖𝘕_𝘌𝘊𝘖' }

    let help = Object.values(global.plugins)
      .filter(p => !p.disabled && p.tags && p.tags.includes('euro'))
      .map(p => ({
        help: Array.isArray(p.help) ? p.help : [p.help],
        prefix: 'customPrefix' in p,
      }))

    let _text = [
      defaultMenu.before.replace(/%mention/g, mention),
      ...Object.keys(tags).map(tag => {
        return defaultMenu.header.replace(/%category/g, tags[tag]) + '\n' + [
          ...help.map(menu => menu.help.map(cmd => 
            defaultMenu.body.replace(/%cmd/g, menu.prefix ? cmd : _p + cmd)
          ).join('\n')),
          defaultMenu.footer
        ].join('\n')
      }),
      defaultMenu.after
    ].join('\n')

    let replace = {
      '%': '%', p: _p, eris, level, role, uptime
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
          newsletterName: "☠️ ᴇʀʀᴏʀ⁴⁰⁴ // ʙʟᴅ ᴇᴄᴏɴᴏᴍʏ ☠️"
        }
      }
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    conn.reply(m.chat, '❌ 𝘍𝘈𝘛𝘈𝘓_𝘌𝘙𝘙𝘖𝘙: Impossibile iniettare il modulo economia.', m)
  }
}

handler.help = ['menueuro']
handler.tags = ['menu']
handler.command = ['menueuro']

export default handler

function clockString(ms) {
  let h = isNaN(ms) ? '00' : Math.floor(ms / 3600000).toString().padStart(2, '0')
  let m = isNaN(ms) ? '00' : (Math.floor(ms / 60000) % 60).toString().padStart(2, '0')
  let s = isNaN(ms) ? '00' : (Math.floor(ms / 1000) % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}
