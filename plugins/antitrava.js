let handler = m => m
const ZALGO_REGEX = /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]{3,}/g;

function extractText(m) {
    if (!m) return '';
    let text = m.text || m.caption || '';
    const poll = m.message?.pollCreationMessageV3 || m.message?.pollCreationMessage;
    if (poll?.name) {
        text += ' ' + poll.name;
        poll.options?.forEach(opt => text += ' ' + opt.optionName);
    }
    return text;
}

export async function before(m, { conn, isAdmin, isBotAdmin, isOwner, isSam }) {
    if (m.isBaileys && m.fromMe) return true;
    if (!m.isGroup || !m.sender) return false;

    const chat = global.db.data.chats[m.chat];
    if (!chat || !chat.antitrava) return true;

    // Matrice di esenzione privilegiata (Admin, Root, Bot)
    if (isAdmin || isOwner || isSam || m.fromMe) return true;

    const text = extractText(m);
    if (!text) return true;

    const isTooLong = text.length > 4000;
    const zalgoMatches = text.match(ZALGO_REGEX) || [];
    const isZalgo = zalgoMatches.length > 5;

    if (isTooLong || isZalgo) {
        // Distruzione immediata del payload dannoso per evitare il freeze della chat
        await conn.sendMessage(m.chat, { delete: m.key }).catch(() => {});

        // Sconnessione forzata dell'host se il bot detiene i privilegi di Sys_Admin
        if (isBotAdmin) {
            await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove').catch(() => {});
        }

        const userTag = m.sender.split('@')[0];
        const reason = isTooLong ? '𝘉𝘜𝘍𝘍𝘌𝘙_𝘖𝘝𝘌𝘙𝘍𝘓𝘖𝘞_𝘓𝘌𝘕𝘎𝘛𝘏' : '𝘡𝘈𝘓𝘎𝘖_𝘊𝘙𝘈𝘚𝘏_𝘚𝘛𝘙𝘐𝘕𝘎_𝘋𝘌𝘛𝘌𝘊𝘛𝘌𝘋';

        const textMsg = `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘊𝘙𝘈𝘚𝘏_𝘖𝘝𝘌𝘙𝘙𝘐𝘋𝘌 ☠️
───────────────────────
⎔ 𝘚𝘺𝘴_𝘚𝘵𝘢𝘵𝗎𝗌: 𝘋𝘌𝘚𝘛𝘈𝘉𝘐𝘓𝘐𝘡𝘈𝘛𝘐𝘖𝘕_𝘝𝘌𝘊𝘛𝘖𝘙
⎔ 𝘛𝘢𝘳𝘨𝘦𝘵_𝘏𝘰𝓼𝘵: @${userTag}
⎔ 𝘚𝘪𝘨𝘯𝘢𝘭_𝘓𝘰𝘨: ${reason}
⎔ 𝘚𝘺𝘴_𝘈𝘤𝘵𝘪𝘰𝘯: 𝘛𝘌𝘙𝘔𝘐𝘕𝘈𝘡𝘐𝘖𝘕𝘌_𝘐𝘔𝘔𝘌𝘋𝘐𝘈𝘛𝘈
───────────────────────

» 𝘓𝘖𝘎_𝘐𝘕𝘛𝘌𝘙𝘊𝘌𝘗𝘛: Intercettato pacchetto dati malevolo (Trava/Glitch/Zalgo) configurato per mandare in crash l'applicazione o saturare la memoria dei nodi connessi. L'host mittente è stato rimosso istantaneamente dalla griglia e la stringa corrotta è stata de-allocata dal buffer.

͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞
_𝘚𝘺𝘴𝘵𝘦System 𝘸𝘪𝘭𝘭 𝘯𝘰𝘵 𝘳𝘦𝘉𝘰𝘰𝒕. 𝘌𝘯𝘫𝘰ย 𝘵𝘩𝗲 𝘤𝘩𝘢𝘰𝘴._`.trim();

        await conn.sendMessage(m.chat, {
            text: textMsg,
            mentions: [m.sender],
            contextInfo: {
                externalAdReply: {
                    title: '☠️ ERROR⁴⁰⁴ // CRASH_PROTECTION_CORE ☠️',
                    body: 'Iniezione stringhe distruttive: isolamento completato.',
                    thumbnailUrl: 'https://qu.ax/TfUj.jpg',
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        });

        return true;
    }

    return true;
}

export default handler;
