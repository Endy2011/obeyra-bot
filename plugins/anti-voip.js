let handler = m => m

handler.before = async function (m, { conn, isAdmin, isBotAdmin, isOwner, isSam }) {
  if (!m.isGroup) return false

  const chat = global.db.data.chats[m.chat]
  if (!chat?.antivoip) return false

  // Se l'engine del bot non ha privilegi amministrativi, l'istanza si arresta
  if (!isBotAdmin) return false

  let decodedSender = conn.decodeJid(m.sender)
  let senderNumber = decodedSender.split('@')[0].split(':')[0]
  let domain = decodedSender.split('@')[1]
  let decodedBotJid = conn.decodeJid(conn.user.jid)

  // Matrice di immunità: Bot, Admin, Owner, Sam e i nodi oscurati LID
  if (decodedSender === decodedBotJid || isAdmin || isOwner || isSam || domain === 'lid') return false

  // Controllo del gateway internazionale: Se l'origine non è codificata con il prefisso +39
  if (!senderNumber.startsWith('39')) {

    // Distruzione immediata del frame trasmesso dall'host non autorizzato
    await conn.sendMessage(m.chat, { delete: m.key }).catch(() => {})

    const utente = formatPhoneNumber(senderNumber, true)

    const text = `
☠️ 𝗘 𝗥 𝗥 𝗢 𝗥  𝟰 𝟬 𝟰  // 𝘉𝘖𝘙𝘋𝘌𝘓_𝘊𝘖𝘕𝘛𝘙𝘖𝘓 ☠️
───────────────────────
⎔ 𝘚𝘺𝘴_𝘚𝘵𝘢𝘵𝗎𝗌: 𝘍𝘖𝘙𝘌𝘐𝘎𝘕_𝘝𝘖𝘐𝘗_𝘋𝘌𝘛𝘌𝘊𝘛𝘌𝘋
⎔ 𝘛𝘢𝘳𝘨𝘦𝘵_𝘏𝘰𝓼𝘵: ${utente}
⎔ 𝘎𝘢𝘵𝘦𝘸𝘢𝘺_𝘓𝘰𝘨: 𝘜𝘕𝘈𝘜𝘛𝘏𝘖𝘙𝘐𝘡𝘌𝘋_𝘗𝘙𝘌𝘍𝘐𝘟
⎔ 𝘚𝘺𝘴_𝘈𝘤𝘵𝘪𝘰𝘯: 𝘐𝘔𝘔𝘌𝘋𝘐𝘈𝘛𝘌_𝘗𝘜𝘙𝘎𝘌_𝘌𝘟𝘌𝘊𝘜𝘛𝘌𝘋
───────────────────────

» 𝘓𝘜𝘎_𝘐𝘕𝘛𝘌𝘙𝘊𝘌𝘗𝘛: Rilevato tentativo di accesso o iniezione di stringhe da un pacchetto dati instradato all'estero o tramite subnet virtuale VOIP. Le direttive di sicurezza di questo nodo impongono il confinamento immediato e il ban dell'host non registrato sotto rete locale (+39).

͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞ ͟͟͞͞
_𝘚𝘺𝘴𝘵𝘦System 𝘸𝘪𝘭𝘭 𝘯𝘰𝘵 𝘳𝘦𝘉𝘰𝘰𝘵. 𝘌𝘯𝘫𝘰ย 𝘵𝘩𝗲 𝘤𝘩𝘢𝘰𝘴._`.trim()

    await conn.sendMessage(m.chat, { 
      text, 
      mentions: [decodedSender],
      contextInfo: {
        externalAdReply: {
          title: '☠️ ERROR⁴⁰⁴ // BORDER_GATEWAY ☠️',
          body: 'Rete VOIP / Prefisso estero intercettato dal firewall.',
          thumbnailUrl: 'https://qu.ax/TfUj.jpg',
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    })

    // Rimozione forzata del nodo dalla griglia del gruppo
    await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove').catch(() => {})
    return true
  }

  return false
}

function formatPhoneNumber(number, includeAt = false) {
  if (!number || number === '?' || number === 'sconosciuto') return includeAt ? '@Sconosciuto' : 'Sconosciuto';
  return includeAt ? '@' + number : number;
}

export default handler
