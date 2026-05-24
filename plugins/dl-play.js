import yts from 'yt-search'
import { exec } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { promisify } from 'util'

const execPromise = promisify(exec)

global.playChoice = global.playChoice || {}
const pendingLyrics = {}

let handler = async (m, { conn, text, usedPrefix, command }) => {
    
    // --- COMANDO PLAY ---
    if (command === "play") {
        if (!text) return m.reply("🎧 *Inserisci il titolo del brano da cercare!*")
        
        const search = await yts(text)
        const video = search.videos[0]
        if (!video) return m.reply("❌ *Nessun risultato trovato.*")

        global.playChoice[m.sender] = video

        return conn.sendMessage(m.chat, {
            text: `🎶 *${video.title}*
            
╭───────────────
┃📺 𝐂𝐀𝐍𝐀𝐋𝐄: *${video.author.name}*
┃⏱️ 𝐃𝐔𝐑𝐀𝐓𝐀: *${video.timestamp}*
┃👁️ 𝐕𝐈𝐒𝐔𝐀𝐋: *${video.views.toLocaleString()}*
╰───────────────

*Cosa desideri scaricare?*`,
            buttons: [
                { buttonId: ".play_audio", buttonText: { displayText: "🎧 Audio" }, type: 1 },
                { buttonId: ".play_video", buttonText: { displayText: "🎥 Video" }, type: 1 }
            ],
            headerType: 1
        }, { quoted: m })
    }

    // --- LOGICA CONDIVISA ---
    const video = global.playChoice[m.sender]
    if (!video) return m.reply("❌ *La sessione è scaduta. Digita di nuovo .play*")

    // --- COMANDO AUDIO ---
    if (command === "play_audio") {
        await m.reply(`⌛ *Sto elaborando l'audio di:* \n*${video.title}*`)
        
        const file = path.join(os.tmpdir(), `audio_${Date.now()}.mp3`)
        
        try {
            await execPromise(`yt-dlp -x --audio-format mp3 -o "${file}" ${video.url}`)
            
            await conn.sendMessage(m.chat, { 
                audio: { url: file }, 
                mimetype: 'audio/mpeg' 
            }, { quoted: m })
            
            fs.unlinkSync(file)
            
            // Logica Testo
            global.lyricsRequest = { [m.sender]: video.title }
            pendingLyrics[m.sender] = setTimeout(() => {
                delete pendingLyrics[m.sender]
                delete global.lyricsRequest[m.sender]
            }, 15000)

            await conn.sendButton(m.chat, `📜 Vuoi il testo di *${video.title}*?`, "Hai 15 secondi", null, [['✅ Sì', `${usedPrefix}lyrics_yes`]], m)
            delete global.playChoice[m.sender]
            
        } catch (e) {
            m.reply("❌ *Errore durante il download dell'audio.*")
        }
    }

    // --- COMANDO VIDEO ---
    if (command === "play_video") {
        if (video.seconds > 480) return m.reply("❌ *Video troppo lungo (Max 8 min)*")

        await m.reply("🎬 *Download video in corso...*")
        
        const raw = path.join(os.tmpdir(), `raw_${Date.now()}.mp4`)
        const out = path.join(os.tmpdir(), `out_${Date.now()}.mp4`)

        try {
            await execPromise(`yt-dlp -f "bestvideo[height<=480]+bestaudio/best[height<=480]" --merge-output-format mp4 -o "${raw}" "${video.url}"`)
            await execPromise(`ffmpeg -y -i "${raw}" -c:v libx264 -preset ultrafast -c:a aac -movflags +faststart "${out}"`)
            
            fs.unlinkSync(raw)
            await conn.sendMessage(m.chat, { video: { url: out }, caption: `🎬 *${video.title}*` }, { quoted: m })
            
            fs.unlinkSync(out)
            delete global.playChoice[m.sender]
        } catch (e) {
            m.reply("❌ *Errore durante il download del video.*")
        }
    }
}

handler.command = /^(play|play_audio|play_video)$/i
handler.help = ['play']
handler.tags = ['downloader']

export default handler
