import fetch from 'node-fetch';
import PhoneNumber from 'awesome-phonenumber';

const handler = async (m, { conn, participants, args }) => {
  const messaggio = args.join` `;
  const info = messaggio ? `»『 📢 』 \`MESSAGGIO:\` *${messaggio}*` : '';
  let messaggi = `*─ׄ─ׅ─ׄ『 .𖥔 ݁ ˖🌍── .✦ 』─ׄ─ׅ─ׄ*\n\n${info ? info + '\n' : ''}\n╭  ┄ 𝅄  ۪꒰ \`𝐄𝐑𝐑𝐎𝐑⁴⁰⁴\` ꒱  ۟   𝅄 ┄\n`;
  
  if (!global.emojiCache) global.emojiCache = new Map();
  if (!global.cacheStats) global.cacheStats = { hits: 0, misses: 0, errors: 0 };
  if (!global.cacheTimestamps) global.cacheTimestamps = new Map();
  
  const CACHE_TTL = 5 * 60 * 1000;
  const now = Date.now();
  for (const [key, timestamp] of global.cacheTimestamps.entries()) {
    if (now - timestamp > CACHE_TTL) {
      global.emojiCache.delete(key);
      global.cacheTimestamps.delete(key);
    }
  }
  
  const countryEmojiFallback = {
    '1': '🇺🇸', '39': '🇮🇹', '33': '🇫🇷', '49': '🇩🇪', '44': '🇬🇧', '34': '🇪🇸', '55': '🇧🇷',
    '52': '🇲🇽', '54': '🇦🇷', '91': '🇮🇳', '86': '🇨🇳', '81': '🇯🇵', '82': '🇰🇷', '7': '🇷🇺',
    '90': '🇹🇷', '20': '🇪🇬', '27': '🇿🇦', '61': '🇦🇺', '62': '🇮🇩', '60': '🇲🇾', '65': '🇸🇬',
    '66': '🇹🇭', '84': '🇻🇳', '63': '🇵🇭', '92': '🇵🇰', '93': '🇦🇫', '98': '🇮🇷', '964': '🇮🇶',
    '966': '🇸🇦', '971': '🇦🇪', '972': '🇮🇱', '30': '🇬🇷', '31': '🇳🇱', '32': '🇧🇪', '41': '🇨🇭',
    '43': '🇦🇹', '45': '🇩🇰', '46': '🇸🇪', '47': '🇳🇴', '48': '🇵🇱', '351': '🇵🇹', '358': '🇫🇮',
    '380': '🇺🇦', '420': '🇨🇿', '421': '🇸🇰', '385': '🇭🇷', '386': '🇸🇮', '387': '🇧🇦',
    '381': '🇷🇸', '382': '🇲🇪', '383': '🇽🇰', '389': '🇲🇰', '355': '🇦🇱', '359': '🇧🇬',
    '40': '🇷🇴', '36': '🇭🇺', '216': '🇹🇳'
  };

  const getEmojiForNumber = async (phoneNumber, id) => {
    if (global.emojiCache.has(id) && global.cacheTimestamps.has(id)) {
      const cacheTime = global.cacheTimestamps.get(id);
      if (now - cacheTime < CACHE_TTL) {
        global.cacheStats.hits++;
        return global.emojiCache.get(id);
      } else {
        global.emojiCache.delete(id);
        global.cacheTimestamps.delete(id);
      }
    }

    if (phoneNumber.length < 6 || phoneNumber.length > 15 || isNaN(phoneNumber)) {
      global.emojiCache.set(id, '🏳️');
      global.cacheTimestamps.set(id, now);
      console.warn(`Numero non valido saltato per ${id}: ${phoneNumber}`);
      return '🏳️';
    }

    try {
      const pn = PhoneNumber('+' + phoneNumber);
      if (!pn.isValid()) {
        global.emojiCache.set(id, '🏳️');
        global.cacheTimestamps.set(id, now);
        console.warn(`Numero non valido per ${id}: ${phoneNumber}`);
        return '🏳️';
      }
      
      const numero = pn.getNumber('international');
      const countryCode = pn.getCountryCode();
      if (countryEmojiFallback[countryCode]) {
        const emoji = countryEmojiFallback[countryCode];
        global.emojiCache.set(id, emoji);
        global.cacheTimestamps.set(id, now);
        global.cacheStats.hits++;
        return emoji;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(
        `https://delirius-apiofc.vercel.app/tools/country?text=${numero}`,
        { 
          signal: controller.signal,
          headers: { 
            'User-Agent': 'VareBot/2.5',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const json = await response.json();
      const emoji = json.result?.emoji || '🏳️';
      global.emojiCache.set(id, emoji);
      global.cacheTimestamps.set(id, now);
      global.cacheStats.misses++;
      
      return emoji;
    } catch (error) {
      console.warn(`Errore API per ${id}:`, error.message);
      global.cacheStats.errors++;
      global.emojiCache.set(id, '🏳️');
      global.cacheTimestamps.set(id, now);
      return '🏳️';
    }
  };

  const BATCH_SIZE = 10;
  const risultati = [];
  
  for (let i = 0; i < participants.length; i += BATCH_SIZE) {
    const batch = participants.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(async (mem) => {
      const decodedJid = conn.decodeJid(mem.id);
      const [user, server] = decodedJid.split('@');
      let id = user.split(':')[0];
      const phoneNumber = user.split(':')[0];
      let emoji;
      const isLID = server === 'lid';
      if (isLID) {
        emoji = '🏳️';
      } else {
        emoji = await getEmojiForNumber(phoneNumber, id);
      }
      return `${emoji} @${id}`;
    });

    const batchResults = await Promise.all(batchPromises);
    risultati.push(...batchResults);
    if (i + BATCH_SIZE < participants.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  const getGroupData = async () => {
    try {
      const [groupImg, groupMetadata] = await Promise.all([
        conn.profilePictureUrl(m.chat, 'image').catch(() => 'https://i.ibb.co/hJW7WwxV/varebot.jpg'),
        conn.groupMetadata(m.chat)
      ]);
      return { 
        img: groupImg,
        name: groupMetadata.subject || '',
        memberCount: participants.length
      };
    } catch {
      return { 
        img: 'https://i.ibb.co/hJW7WwxV/varebot.jpg',
        name: '',
        memberCount: participants.length
      };
    }
  };

  const groupData = await getGroupData();

  messaggi += risultati.join('\n');
  messaggi += `\n╰⸼ ┄ ┄꒰  ׅ୭ *tagall* ୧ ׅ ꒱─ ┄ ⸼`;
  console.log(`Tagall Cache Stats - Hits: ${global.cacheStats.hits}, Misses: ${global.cacheStats.misses}, Errori: ${global.cacheStats.errors}, Spazio: ${global.emojiCache.size}`);
  
  await conn.sendMessage(m.chat, { 
    text: messaggi,
    mentions: participants.map(a => conn.decodeJid(a.id)),
    contextInfo: {
      externalAdReply: {
        title: groupData.name,
        body: `⛧°⋆༺ ${groupData.memberCount} membri ༻⋆°⛧`,
        thumbnailUrl: groupData.img,
        sourceUrl: '',
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  });
  if (global.emojiCache.size > 500) {
    const entries = Array.from(global.cacheTimestamps.entries())
      .sort(([,a], [,b]) => a - b)
      .slice(0, 100);
      
    entries.forEach(([key]) => {
      global.emojiCache.delete(key);
      global.cacheTimestamps.delete(key);
    });
  }
};

handler.help = ['tagall'];
handler.tags = ['gruppo'];
handler.command = /^(tagall|invoca|menzionatutti|tag)$/i;
handler.admin = true;
handler.group = true;

export default handler;
