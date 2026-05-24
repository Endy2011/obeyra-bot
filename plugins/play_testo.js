import fetch from 'node-fetch'
import { parse } from 'node-html-parser'

const handler = async (m, { conn }) => {
  const sender = m.sender
  const titolo = global.lyricsRequest?.[sender]

  if (!titolo) {
    return m.reply("⏱️ *Tempo scaduto!*\nPer ottenere il testo, scrivi nuovamente `.play [nome canzone]` e seleziona 'Sì' entro 15 secondi.")
  }

  if (global.pendingLyrics?.[sender]) {
    clearTimeout(global.pendingLyrics[sender])
    delete global.pendingLyrics[sender]
  }

  try {
    await m.reply(`🔍 *Cerco il testo di:* ${titolo}...`)
    const testo = await getLyrics(titolo)

    if (!testo) throw new Error("Testo non trovato")

    await conn.sendMessage(m.chat, {
      text: `📜 *TESTO: ${titolo.toUpperCase()}*\n\n━━━━━━━━━━━━━━\n\n${testo}\n\n━━━━━━━━━━━━━━\n> 𝟑𝟑𝟑 𝐝𝐨𝐰𝐧𝐥𝐨𝐚𝐝𝐞𝐫 𝐥𝐲𝐫𝐢𝐜𝐬`
    }, { quoted: m })

  } catch (e) {
    m.reply(`❌ *Non ho trovato il testo di:* "${titolo}".`)
  } finally {
    delete global.lyricsRequest?.[sender]
  }
}

handler.command = /^lyrics_yes$/i
handler.tags = ['fun']
handler.help = ['lyrics_yes']

export default handler

async function getLyrics(titolo) {
  let cleanTitle = titolo
    .split(/[-–]/)[1] || titolo
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/official video|lyrics|testo|audio|feat\.?|ft\.?/gi, '')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const result = await fetchGenius(cleanTitle)
  return result || await fetchGenius(cleanTitle.split(' ').slice(0, 4).join(' '))
}

async function fetchGenius(query) {
  try {
    const res = await fetch(`https://genius.com/api/search/multi?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    const hit = data?.response?.sections?.find(s => s.type === "song")?.hits?.[0]

    if (!hit) return null

    const page = await fetch(hit.result.url)
    const root = parse(await page.text())
    
    return root
      .querySelectorAll("[data-lyrics-container='true']")
      .map(x => x.text)
      .join("\n\n")
      .trim() || null
  } catch {
    return null
  }
}
