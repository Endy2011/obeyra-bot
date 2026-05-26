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

const defaultMenu = {
  before: `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘙𝘖𝘖𝘛_𝘊𝘖𝘙𝘌 ☠️
───────────────────────
⎔ 𝘚𝘺𝘴_𝘖𝘸𝘯𝘦𝘳: %mention
⎔ 𝘌𝘹𝘦𝘤_𝘔𝘰𝘥𝘦: %mode
⎔ 𝘖𝘚_𝘛𝘦𝘳𝘮𝘪𝘯𝘢𝘭: %platform
───────────────────────

» 𝘐𝘕𝘐𝘡𝘐𝘈𝘓𝘐𝘡𝘡𝘈𝘡𝘐𝘖𝘕𝘌 𝘗𝘙𝘖𝘛𝘖𝘊𝘖𝘓𝘓𝘖 𝘉𝘠𝘗𝘈𝘚𝘚...
`.trimStart(),
  header: 'ョ ── %category 𪚥',
  body: '    ⤿ 👨‍💻 %cmd ╳',
  footer: '͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞\n',
  after: `_𝘚𝘺𝘴𝘵𝘦𝘮 𝘸𝘪𝘭𝘭 𝘯𝘰𝘵 𝘳𝘦𝘉𝘰𝘰𝘵. 𝘌𝘯𝘫𝘰𝘺 𝘵𝘩𝘦 𝘤𝘩𝘢𝘰𝘴._`
}

let handler = async (m, { conn, usedPrefix: _p }) => {
  try {
    await conn.sendPresenceUpdate('composing', m.chat)

    let mention = `@${m.sender.split('@')[0]}`
    let mode = global.opts['self'] ? '𝘗𝘳𝘪𝘷𝘢𝘵𝘰_𝘓𝘰𝘤𝘬' : '𝘗𝘶𝘣𝘣𝘭𝘪𝘤𝘰_𝘎𝘳𝘪𝘥'
    let platform = os.platform().toUpperCase()
    let tags = { 'creatore': '𝘚𝘠𝘚𝘛𝘌𝘔_𝘔𝘈𝘓𝘍𝘜𝘕𝘊𝘛𝘐𝘖𝘕_𝘖𝘝𝘌𝘙𝘙𝘐𝘋𝘌' }

    let help = Object.values(global.plugins)
      .filter(p => !p.disabled && p.tags && p.tags.includes('creatore'))
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
      caption: _text.trim(),
      contextInfo: {
        mentionedJid: [m.sender],
        forwardedNewsletterMessageInfo: {
          newsletterJid: '120363232743845068@newsletter',
          newsletterName: "☠️ ᴇʀʀᴏʀ⁴⁰⁴ // ʀᴏᴏᴛ ᴄᴏʀᴇ ☠️"
        }
      }
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    conn.reply(m.chat, '❌ 𝘍𝘈𝘛𝘈𝘓_𝘌𝘙𝘙𝘖𝘙: Impossibile eseguire l\'override del modulo proprietario.', m)
  }
}

handler.help = ['menucreatore']
handler.tags
