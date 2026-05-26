import { promises as fs } from 'fs'
import { join } from 'path'

const menuImages = [
  './menu-1.jpeg',
  './menu-2.jpeg',
  './menu-3.jpeg'
]

const defaultMenu = {
  before: `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝗗 𝗢 𝗪 𝗡 𝗟 𝗢 𝗔 𝗗 ☠️
───────────────────────
⎔ 𝘊𝘰𝘳𝘦_𝘓𝘪𝘯𝘬: %mention
⎔ 𝘚𝘺𝘴_𝘚𝘵𝘢𝘵𝘶𝘴: 𝘖𝘯𝘭𝘪𝘯𝘦
⎔ 𝘋𝘢𝘵𝘢_𝘚𝘦𝘤𝘵𝘰𝘳: 𝘓𝘰𝘸_𝘓𝘢𝘵𝘦𝘯𝘤𝘺
───────────────────────

» 𝘐𝘕𝘐𝘡𝘐𝘈𝘕𝘋𝘖 𝘗𝘙𝘖𝘛𝘖𝘊𝘖𝘓𝘓𝘖 𝘋𝘓...
`.trimStart(),
  header: 'ョ ── %category 𪚥',
  body: '    ⤿ 📥 %cmd ╳',
  footer: '͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞\n',
  after: `_𝘚𝘺𝘴𝘵𝘦𝘮 𝘸𝘪𝘭𝘭 𝘯𝘰𝘵 𝘳𝘦𝘉𝘰𝘰𝘵. 𝘌𝘯𝘫𝘰𝘺 𝘵𝘩𝘦 𝘤𝘩𝘢𝘰𝘴._`
}

let handler = async (m, { conn, usedPrefix: _p }) => {
  try {
    await conn.sendPresenceUpdate('composing', m.chat)

    let mention = `@${m.sender.split('@')[0]}`
    let tags = { 'download': '𝘚𝘠𝘚𝘛𝘌𝘔_𝘋𝘖𝘞𝘕𝘓𝘖𝘈𝘋_𝘊𝘖𝘙𝘌' }

    let help = Object.values(global.plugins)
      .filter(p => !p.disabled && p.tags && p.tags.includes('download'))
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
          newsletterName: "☠️ ᴇʀʀᴏʀ⁴⁰⁴ // ᴅᴏᴡɴʟᴏᴀᴅ ɴᴇᴛ ☠️"
        }
      }
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    conn.reply(m.chat, '❌ 𝘍𝘈𝘛𝘈𝘓_𝘌𝘙𝘙𝘖𝘙: Modulo download non raggiungibile.', m)
  }
}

handler.help = ['menudl']
handler.tags = ['menu']
handler.command = ['menudl', 'menudownload']

export default handler
