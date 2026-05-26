import { promises as fs } from 'fs'
import { join } from 'path'

// Emoji e tag convertiti in stile Glitch / Distruzione Dati
const emojicategoria = {
  info: '🎚️',
  main: '🩸',
  sicurezza: '🛑'
}

let tags = {
  main: '── 𝘚𝘠𝘚𝘛𝘌𝘔_𝘔𝘈𝘓𝘍𝘜𝘕𝘊𝘛𝘐𝘖𝘕 ──',
  sicurezza: '── 𝘉𝘙𝘌𝘈𝘊𝘏_𝘗𝘙𝘖𝘛𝘌𝘊𝘛𝘐𝘖𝘕 ──',
  info: '── 𝘊𝘖𝘙𝘙𝘜𝘗𝘛𝘌𝘋_𝘓𝘖𝘎𝘚 ──'
}

const defaultMenu = {
  testoInizio: `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰 ☠️
───────────────────────
⎔ 𝘊𝘰𝘳𝘦_𝘓𝘪𝘯𝘬: %tag
⎔ 𝘓𝘪𝘧𝘦_𝘚𝘪𝘨𝘯𝘢𝘭: %uptime
⎔ 𝘎𝘩𝘰𝘴𝘵_𝘜𝘴𝘦𝘳𝘴: %totalreg
───────────────────────

» 𝘈𝘕𝘖𝘔𝘈𝘓𝘐𝘈 𝘙𝘐𝘓𝘌𝘝𝘈𝘛𝘈...
`.trimStart(),

  header: 'ョ %category 𪚥',
  body: '    ⤿ %emoji %cmd ╳',
  footer: '͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞\n',
  testoFine: `_𝘚𝘺𝘴𝘵𝘦𝘮 𝘸𝘪𝘭𝘭 𝘯𝘰𝘵 𝘳𝘦𝘉𝘰𝘰𝘵. 𝘌𝘯𝘫𝘰𝘺 𝘵𝘩𝘦 𝘤𝘩𝘢𝘰𝘴._`,
}

// Aggiornato: ora tutte e 3 le immagini hanno l'estensione .jpeg
const menuImages = [
  './menu-1.jpeg',
  './menu-2.jpeg',
  './menu-3.jpeg'
]

const bldButtons = [
  { title: "🛡️ SICUREZZA", command: "attiva" },
  { title: "🎮 GIOCHI", command: "menugiochi" },
  { title: "🤖 IA", command: "menuia" },
  { title: "👥 GRUPPO", command: "menugruppo" },
  { title: "📥 DOWNLOAD", command: "menudownload" },
  { title: "🛠️ STRUMENTI", command: "menustrumenti" },
  { title: "⭐ PREMIUM", command: "menupremium" },
  { title: "💰 EURO", command: "menueuro" }
]

let handler = async (m, { conn, usedPrefix: _p }) => {
  try {
    await conn.sendPresenceUpdate('composing', m.chat)

    let name = await conn.getName(m.sender) || '𝘜𝘯𝘬𝘯𝘰𝘸𝘯'
    let uptime = clockString(process.uptime() * 1000)
    let totalreg = Object.keys(global.db.data.users).length

    let help = Object.values(global.plugins).filter(p => !p.disabled).map(p => ({
      help: Array.isArray(p.help) ? p.help : [p.help],
      tags: Array.isArray(p.tags) ? p.tags : [p.tags],
      prefix: 'customPrefix' in p
    }))

    let menuTags = Object.keys(tags)

    let _text = [
      defaultMenu.testoInizio,
      ...menuTags.map(tag => {
        return defaultMenu.header.replace(/%category/g, tags[tag]) + '\n' + [
          ...help
            .filter(menu => menu.tags.includes(tag))
            .map(menu => menu.help.map(h => 
              defaultMenu.body
                .replace(/%cmd/g, menu.prefix ? h : _p + h)
                .replace(/%emoji/g, emojicategoria[tag])
            ).join('\n')),
          defaultMenu.footer
        ].join('\n')
      }),
      defaultMenu.testoFine
    ].join('\n')

    let text = _text.replace(/%name/g, name)
                    .replace(/%uptime/g, uptime)
                    .replace(/%totalreg/g, totalreg)

    const buttons = bldButtons.map(btn => ({
      buttonId: _p + btn.command,
      buttonText: { displayText: btn.title },
      type: 1
    }))

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

    await conn.sendMessage(m.chat, {
      ...(imageBuffer ? { image: imageBuffer } : {}),
      caption: text.trim(),
      footer: "ᴇʀʀᴏʀ⁴⁰⁴ // ʙʟᴅ sʏsᴛᴇᴍ ᴅᴏᴡɴ",
      buttons: buttons,
      headerType: 4,
      viewOnce: true
    }, { quoted: m })

    await m.react('💥')

  } catch (e) {
    console.error(e)
    conn.reply(m.chat, `❌ 𝘍𝘈𝘛𝘈𝘓_𝘌𝘙𝘙𝘖𝘙: ${e.message}`, m)
  }
}

handler.help = ['menu']
handler.command = ['menu', 'help']

export default handler

function clockString(ms) {
  let h = Math.floor(ms / 3600000)
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':')
}
