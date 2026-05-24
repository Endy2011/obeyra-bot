import yts from 'yt-search';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import os from 'os';

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    let noText = `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘐𝘕𝘝𝘈𝘓𝘐𝘋_𝘚𝘠𝘕𝘛𝘈𝘟 ☠️
───────────────────────
» 𝘚𝘺𝘴_𝘜𝘴𝘢𝘨𝘦: ${usedPrefix + command} [𝘕𝘰𝘮𝘦_𝘛𝘳𝘢𝘤𝘤𝘪𝘢 / 𝘜𝘙𝘓]`.trim();
    return m.reply(noText);
  }

  try {
    const search = await yts(text);
    const vid = search.videos[0];
    if (!vid) {
      let noResult = `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘕𝘖𝘋𝘌_𝘕𝘖𝘛_𝘍𝘖𝘜𝘕𝘋 ☠️
───────────────────────
» 𝘓𝘖𝘎: L'indice di ricerca non ha restituito alcuna corrispondenza per la stringa fornita. Riprovare con parametri differenti.`.trim();
      return m.reply(noResult);
    }

    const url = vid.url;

    if (command === 'play') {
        let infoMsg = `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘔𝘌𝘋𝘐𝘈_𝘗𝘓𝘈𝘠𝘌𝘙 ☠️
───────────────────────
⎔ 𝘚𝘺𝘴_𝘚𝘵𝘢𝘵𝗎𝗌: 𝘚𝘛𝘙𝘌𝘈𝘔_𝘐𝘕𝘋𝘌𝘟_𝘙𝘌𝘈𝘋𝘠
⎔ 𝘛𝘪𝘵𝘭𝘦_𝘓𝘰𝘨: ${vid.title}
⎔ 𝘛𝘪𝘮𝘦_𝘚𝘵𝘢𝘮𝘱: ${vid.timestamp}
───────────────────────

» 𝘚𝘌𝘓𝘌𝘡𝘐𝘖𝘕𝘈_𝘍𝘜𝘕𝘡𝘐𝘖𝘕𝘌: Selezionare il formato del pacchetto dati da inserire nel buffer di download tramite i pulsanti sottostanti.

͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞
_𝘚𝘺𝘴𝘵𝘦System 𝘸𝘪𝘭𝘭 𝘯𝘰𝘵 𝘳𝘦𝘉𝘰𝘰𝘵. 𝘌𝘯𝘫𝘰ย 𝘵𝘩𝗲 𝘤𝘩𝘢𝘰𝘴._`.trim();

        return await conn.sendMessage(m.chat, {
            image: { url: vid.thumbnail },
            caption: infoMsg,
            footer: '☠️ ERROR⁴⁰⁴ // STREAM_CORE ☠️',
            buttons: [
                { buttonId: `${usedPrefix}playaud ${url}`, buttonText: { displayText: '🎵 𝗔𝗨𝗗𝗜𝗢 (𝗠𝗣𝟯)' }, type: 1 },
                { buttonId: `${usedPrefix}playvid ${url}`, buttonText: { displayText: '🎬 𝗩𝗜𝗗𝗘𝗢 (𝗠𝗣𝟰)' }, type: 1 }
            ],
            headerType: 4
        }, { quoted: m });
    }

    await conn.sendMessage(m.chat, { react: { text: "🩸", key: m.key } });

    let downloadUrl = null;
    const isAudio = command === 'playaud';

    // Struttura di fallback API
    const apiList = [
        `https://api.boxiwan.my.id/api/download/ytmp${isAudio ? '3' : '4'}?url=${url}`,
        `https://api.skizo.tech/api/y2mate?url=${url}`,
        `https://api.tesshu.my.id/api/download/ytmp${isAudio ? '3' : '4'}?url=${url}`,
        `https://api.botcahx.eu.org/api/dowloader/ytmp${isAudio ? '3' : '4'}?url=${url}&apikey=btch-932`
    ];

    for (let api of apiList) {
        try {
            console.log(`[BLOOD] Tentativo su: ${api}`);
            let res = await fetch(api);
            let json = await res.json();

            // Parsing flessibile dell'oggetto di risposta
            downloadUrl = json.data?.url || json.result?.url || json.result?.dl || json.url || json.result?.link;

            if (downloadUrl && typeof downloadUrl === 'string' && downloadUrl.startsWith('http')) break;
        } catch (e) {
            continue;
        }
    }

    if (!downloadUrl) {
        throw new Error('SERVER_OFFLINE');
    }

    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, `blood_${Date.now()}.${isAudio ? 'mp3' : 'mp4'}`);

    // Fetch stream simulando un User-Agent per aggirare i controlli del server
    const response = await fetch(downloadUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });

    if (!response.ok) throw new Error('ERRORE_DOWNLOAD');
    const buffer = await response.buffer();
    fs.writeFileSync(filePath, buffer);

    if (isAudio) {
        await conn.sendMessage(m.chat, {
            audio: fs.readFileSync(filePath),
            mimetype: 'audio/mpeg',
            fileName: `${vid.title}.mp3`
        }, { quoted: m });
    } else {
        let videoCaption = `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘍𝘌𝘛𝘊𝘏_𝘊𝘖𝘔𝘗𝘓𝘌𝘛𝘌𝘋 ☠️
───────────────────────
⎔ 𝘚𝘺𝘴_𝘊𝘰𝘥𝘦: 𝘝𝘐𝘋𝘌𝘖_𝘗𝘈𝘊𝘒𝘌𝘛_𝘚𝘜𝘊𝘊𝘌𝘚𝘚
⎔ 𝘚𝘵𝘰𝘳𝘢𝘨𝘦: 𝘓𝘖𝘊𝘈𝘓_𝘞𝘐𝘗𝘌_𝘗𝘌𝘕𝘋𝘐𝘕𝘎
───────────────────────
» 𝘓𝘖𝘎: Pacchetto multimediale iniettato correttamente nel canale. File binario decodificato ed emesso con successo.`.trim();
        
        await conn.sendMessage(m.chat, {
            video: fs.readFileSync(filePath),
            mimetype: 'video/mp4',
            caption: videoCaption
        }, { quoted: m });
    }

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await conn.sendMessage(m.chat, { react: { text: "✅", key: m.key } });

  } catch (e) {
    console.error('DEBUG:', e);
    await conn.sendMessage(m.chat, { react: { text: "❌", key: m.key } });
    
    let errMsg = `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘍𝘌𝘛𝘊𝘏_𝘍𝘈𝘐𝘓𝘌𝘋 ☠️
───────────────────────
⎔ 𝘚𝘺𝘴_𝘚𝘵𝘢𝘵𝗎𝗌: 𝘌𝘕𝘋𝘗𝘖𝘐𝘕𝘛𝘚_𝘖𝘍𝘍𝘓𝘐𝘕𝘌
───────────────────────
» 𝘓𝘖𝘎: Impossibile agganciare i nodi di hosting. Tutti i server della blacklist o i gateway di conversione API non rispondono. Fornire una query più stringente o utilizzare un link diretto per l'estrazione.`.trim();
    m.reply(errMsg);
  }
};

handler.help = ['play'];
handler.tags = ['downloader'];
handler.command = /^(play|playaud|playvid)$/i;

export default handler;
