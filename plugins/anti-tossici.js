const insultiebs = [
    "b[4a@]st[4a@]rd[0o]",
    "[sS]tr[o0]n[zZ][oa4@]",
    "f[i1][gG][4aA]",
    "[cC][4aA][zZ][zZ][o0]",
    "p[e3]n[e3]",
    "c[o0]gl[i1][o0]n[e3i1]",
    "f[i1][gG][l1][i1][oO]d[i1]p[uU]tt[4aA]n[4aA]",
    "p[uU]tt[4aA]n[e3][l1][l1][4aA]",
    "p[uU]tt[4aA]n[0o4aA]",
    "tr[o0][i1][4aA]",
    "z[o0]cc[o0]l[4aA]",
    "b[4aA]g[4aA]sc[i1][4aA]",
    "[pP]r[0oO][sS5][tT][i1][tT][uU][tT][e3a]",
    "f[rR][o0][cC][i1][oO]",
    "f[i1][nN][o0][cC][cC][hH][i1][oO]",
    "[e3][fF][fF][e3]mm[i1]n[4aA]t[o0]",
    "succh[i1][a4][l1][a4o0]", 
    "succh[i1][a4]m[e3][l1][oO]",
    "[sS][uU][cC][cC][hH][i1][4aA]",
    "[pP][o0]mp[i1]n[4aA]r[o0a]",
    "v[4aA][fF][fF][4aA][nN][cC][uU][l1][oO]",
    "[fF][o0][tT][tT][uU]t[o0a]",
    "[nN][e3][gG]r[o0a]",
]
const ir = new RegExp(`\\b(${insultiebs.join('|')})\\b`, 'i')
let handler = m => m

handler.before = async function (m, { conn, isAdmin, isBotAdmin, isOwner }) {
    if (m.isBaileys && m.fromMe) return true
    if (!m.isGroup) return false
    
    let chat = global.db.data.chats[m.chat]
    let user = global.db.data.users[m.sender]
    const isToxic = ir.exec(m.text)
    
    if (isToxic && chat.antiToxic && !isOwner && !isAdmin) {
        user.warn += 1
        const decodedSender = conn.decodeJid(m.sender)
        const badWord = isToxic[0]
        
        // Eliminazione immediata del payload tossico se il bot è admin
        if (isBotAdmin) {
            try { await conn.sendMessage(m.chat, { delete: m.key }) } catch {}
        }

        if (user.warn < 3) {
            let warnMsg = `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘛𝘖𝘟𝘐𝘊_𝘐𝘕𝘗𝘜𝘛_𝘋𝘌𝘛𝘌𝘊𝘛𝘌𝘋 ☠️
───────────────────────
⎔ 𝘚𝘺𝘴_𝘚𝘵𝘢𝘵𝗎𝗌: 𝘏𝘖𝘚𝘛𝘐𝘓𝘐𝘛𝘠_𝘗𝘈𝘊𝘒𝘌𝘛_𝘍𝘖𝘜𝘕𝘋
⎔ 𝘛𝘢𝘳𝘨𝘦𝘵_𝘏𝘰𝓼𝘵: @${decodedSender.split('@')[0]}
⎔ 𝘔𝘢𝘵𝘤𝘩_𝘓𝘰𝘨: [ ${badWord} ]
⎔ 𝘚𝘺𝘴_𝘞𝘢𝘳𝘯: *${user.warn}/3*
───────────────────────

» 𝘈𝘝𝘝𝘐𝘚𝘜: Il modulo di analisi comportamentale ha intercettato espressioni verbali ostili o insulti blacklistati. Il messaggio è stato rimosso dalla cronologia. Al terzo avviso l'host verrà terminato.

͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞
_𝘚𝘺𝘴𝘵𝘦System 𝘸𝘪𝘭𝘭 𝘯𝘰𝘵 𝘳𝘦𝘉𝘰𝘰𝒕. 𝘌𝘯𝘫𝘰ย 𝘵𝘩𝗲 𝘤𝘩𝘢𝘰𝘴._`.trim()

            await conn.sendMessage(m.chat, {
                text: warnMsg,
                mentions: [decodedSender]
            }, { quoted: m })
        }

        if (user.warn >= 3) {
            user.warn = 0
            
            if (isBotAdmin) {
                let kickMsg = `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘛𝘖𝘟𝘐𝘊_𝘏𝘖𝘚𝘛_𝘗𝘜𝘙𝘎𝘌𝘋 ☠️
───────────────────────
⎔ 𝘛𝘢𝘳𝘨𝘦𝘵_𝘏𝘰𝓼𝘵: @${decodedSender.split('@')[0]}
⎔ 𝘚𝘺𝘴_𝘚𝘵𝘢𝘵𝗎𝗌: 𝘛𝘖𝘓𝘌𝘙𝘈𝘕𝘊𝘌_𝘌𝘟𝘏𝘈𝘜𝘚𝘛𝘌𝘋
⎔ 𝘚𝘺𝘴_𝘈𝘤𝘵记on: 𝘌𝘟𝘗𝘜𝘓𝘚𝘐𝘖𝘕𝘌_𝘌𝘟𝘌𝘊𝘜𝘛𝘌𝘋
───────────────────────

» 𝘓𝘖𝘎: L'host ha superato la soglia critica di tossicità definita dai parametri interni. Il firewall ha rimosso l'account dal server locale per preservare l'integrità comunicativa del gruppo.

͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞
_𝘚𝘺𝘴𝘵𝘦System 𝘸𝘪𝘭𝘭 𝘯𝘰𝘵 𝘳𝘦𝘉𝘰𝘰𝒕. 𝘌𝘯𝘫𝘰ย 𝘵𝘩𝗲 𝘤𝘩𝘢𝘰𝘴._`.trim()

                await conn.sendMessage(m.chat, {
                    text: kickMsg,
                    mentions: [decodedSender]
                }, { quoted: m })
                
                await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
            } else {
                let failMsg = `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘗𝘜𝘙𝘎𝘌_𝘍𝘈𝘐𝘓𝘌𝘋_𝘕𝘖_𝘈𝘋𝘔𝘐𝘕 ☠️
───────────────────────
⎔ 𝘛𝘢𝘳𝘨𝘦𝘵_𝘏𝘰𝓼𝘵: @${decodedSender.split('@')[0]}
⎔ 𝘚𝘺𝘴_𝘚𝘵𝘢𝘵𝗎𝗌: 𝘔𝘈𝘟_𝘞𝘈𝘙𝘕_𝘙𝘌𝘈𝘊𝘏𝘌𝘋
───────────────────────
» 𝘓𝘖𝘎: Rilevato comportamento tossico recidivo. Impossibile purgare il nodo: l'engine core del bot non possiede i privilegi Sys_Admin richiesti per l'espulsione.`.trim()
                
                await conn.sendMessage(m.chat, { 
                    text: failMsg, 
                    mentions: [decodedSender] 
                }, { quoted: m })
            }
        }
    }
    return true
}

export default handler
