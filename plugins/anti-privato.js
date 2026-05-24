export async function before(m, { isOwner, isRowner, isMods }) {
    if (m.fromMe) return !0;
    if (m.isGroup) return !1;
    if (!m.message) return !0;

    const textStr = m.text ? m.text.toLowerCase() : '';
    if (textStr.includes('sasso') || textStr.includes('carta') || textStr.includes('forbici')) return !0; 

    const varebot = global.db.data.settings[this.user.jid] || {};
    
    if (varebot.antiprivato && !isOwner && !isRowner && !isMods) {
        let blockMsg = `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘗𝘙𝘐𝘝𝘈𝘛𝘌_𝘓𝘖𝘊𝘒𝘋O𝘓𝘕 ☠️
───────────────────────
⎔ 𝘚𝘺𝘴_𝘚𝘵𝘢𝘵𝗎𝗌: 𝘜𝘕𝘈𝘜𝘛𝘏𝘖𝘙𝘐𝘡𝘌𝘋_𝘋𝘔_𝘋𝘌𝘛𝘌𝘊𝘛𝘌𝘋
⎔ 𝘛𝘢𝘳𝘨𝘦𝘵_𝘏𝘰𝓼𝘵: @${m.sender.split('@')[0]}
⎔ 𝘚𝘺𝘴_𝘈𝘤𝘵𝘪𝘰𝘯: 𝘏𝘖𝘚𝘛_𝘉𝘓化𝘊𝘒_𝘌𝘟𝘌𝘊𝘜𝘛𝘌𝘋
───────────────────────

» 𘘓𘘚𘘛: Il firewall Anti-Privato è attivo su questa unità centrale. Qualsiasi interazione diretta al di fuori dei canali o dei gruppi autorizzati provoca l'interruzione immediata dei flussi e il confinamento dell'host mittente.

͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞
_𝘚𝘺𝘴𝘵𝘦System 𝘸𝘪𝘭𝘭 𝘯𝘰𝘵 𝘳𝘦𝘉𝘰𝘰𝘵. 𝘌𝘯𝘫𝘰ย 𝘵𝘩𝗲 𝘤𝘩𝘢𝘰ˢ._`.trim();

        await this.sendMessage(m.chat, { 
            text: blockMsg,
            mentions: [m.sender]
        }, { quoted: m }).catch(() => {});

        await this.updateBlockStatus(m.chat, 'block').catch(() => {});
    }
    return !1;
}
