let handler = async (m, { conn }) => {
    if (!m.isGroup) return;

    let chat = global.db.data.chats[m.chat];
    if (!chat.messageCount) chat.messageCount = 0;

    let time = 3600000;
    if (new Date() - (chat.lastReset || 0) > time) {
        if (chat.messageCount < 2000) {
            let metadata = await conn.groupMetadata(m.chat);
            let members = metadata.participants.map(p => p.id);

            let frasi = [
                `⚠️ GRUPPO INATTIVO (Messaggi: ${chat.messageCount})\n\nIl silenzio qui è assordante. Sveglia gente!`,
                `💤 Dormite tutti? Solo ${chat.messageCount} messaggi nell'ultima ora.\n\nDatevi una mossa!`,
                `🚨 Rilevata attività sospetta: VITA ASSENTE.\n\nÈ il momento di smetterla di fissare lo schermo e scrivere qualcosa!`,
                `⚠️ Allerta inattività: Il gruppo sta morendo.\n\nSiete voi i prescelti per rompere questo silenzio imbarazzante!`,
                `📉 Statistiche in calo. ${chat.messageCount} messaggi sono un insulto alla conversazione.\n\nRisvegliatevi tutti!`
            ];

            let randomFrase = frasi[Math.floor(Math.random() * frasi.length)];

            await conn.sendMessage(m.chat, {
                text: randomFrase,
                mentions: members
            });
        }
        chat.messageCount = 0;
        chat.lastReset = new Date() * 1;
    }
};

handler.before = async (m) => {
    if (m.isGroup) {
        let chat = global.db.data.chats[m.chat];
        if (!chat.messageCount) chat.messageCount = 0;
        chat.messageCount++;
    }
};

export default handler;
