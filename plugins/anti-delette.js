// Database temporaneo in memoria (si svuota se riavvii la VPS)
const msgStorage = {};

let handler = m => m;

handler.before = async function (m, { conn }) {
    if (!m) return;

    const chat = m.chat;
    const msgId = m.id || m.key?.id;

    // Recupera i dati della chat dal database globale
    const chatSettings = global.db.data.chats[chat];

    // Se la chat non esiste nel database o l'antidelete è disattivato, 
    // salviamo comunque il messaggio per sicurezza ma non eseguiamo il recupero
    const isAntideleteEnabled = chatSettings?.antidelete;

    // 1. SALVATAGGIO: Cache dei pacchetti in transito nella RAM
    if (!m.message?.protocolMessage) {
        msgStorage[msgId] = m;

        // Pulizia automatica del buffer della RAM dopo 1 ora
        setTimeout(() => {
            if (msgStorage[msgId]) delete msgStorage[msgId];
        }, 3600000);
    }

    // 2. RECUPERO: Rilevamento pacchetto di cancellazione (protocolMessage type 0)
    if (m.message?.protocolMessage && m.message.protocolMessage.type === 0) {
        // Se l'antidelete è disattivato nel pannello di controllo, interrompi il ripristino
        if (!isAntideleteEnabled) return true;

        const deletedKey = m.message.protocolMessage.key;
        const savedMsg = msgStorage[deletedKey.id];

        if (savedMsg) {
            const user = deletedKey.participant || deletedKey.remoteJid;

            // Log dell'intercettazione in puro stile hacker
            const reportText = `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘋𝘌𝘓𝘌𝘛𝘐𝘖𝘕_𝘐𝘕𝘛𝘌𝘙𝘊𝘌𝘗𝘛 ☠️
───────────────────────
⎔ 𝘚𝘺𝘴_𝘚𝘵𝘢𝘵𝗎𝗌: 𝘔𝘌𝘔𝘖𝘙𝘠_𝘋𝘜𝘔𝘗_𝘙𝘌𝘊𝘖𝘝𝘌𝘙𝘌𝘋
⎔ 𝘛𝘢𝘳𝘨𝘦𝘵_𝘏𝘰𝓼𝘵: @${user.split('@')[0]}
⎔ 𝘗𝘬𝘵_𝘈𝘤𝘵𝘪𝘰𝘯: 𝘈𝘕𝘛𝘐_𝘗𝘜𝘙𝘎𝘗_𝘛𝘙𝘐𝘎𝘎𝘌𝘙𝘌𝘋
───────────────────────

» 𝘓𝘖𝘎: Rilevato tentativo di wiping dei dati dal server. Il database ha bloccato la rimozione permanente del payload e ha forzato il recupero del pacchetto originale dallo stack di memoria.

͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞\n_𝘗𝘢𝘺𝘭𝘰𝘢𝘥_𝘙𝘦𝘴𝘵𝘰𝘳𝘦𝘥_𝘉𝘦𝘭𝘰𝘸:_`.trim();

            await conn.sendMessage(chat, { 
                text: reportText,
                mentions: [user]
            }, { quoted: savedMsg });

            // Inoltra il messaggio originale intercettato
            await conn.copyNForward(chat, savedMsg, true);

            // Wipe manuale della chiave dalla cache temporanea
            delete msgStorage[deletedKey.id];
        }
    }
    return true;
};

export default handler;
