import axios from 'axios'

const d = {
    l: "│",
    di: "┠⭒─ׄ─ׅ─⭒─ׄ─ׅ─ׄ⭒─ׄ─ׅ─ׄ",
    varebot: "*╭─ׄ✦☾⋆⁺₊✧ 𝐄𝐑𝐑𝐎𝐑⁴⁰⁴₊⁺⋆☽✦─ׅ⭒*",
    f: "*╰⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*"
}

let handler = async (m, { usedPrefix, command, conn, text }) => {
    if (!text) return m.reply(`${d.varebot}
${d.l} ⚠️ *ERRORE*
${d.l} Inserisci un username TikTok!
${d.l}
${d.l} 📝 Esempio:
${d.l} ${usedPrefix + command} mrbeast
${d.f}`);

    try {
        await m.react('⏳');

        let ress = await axios.get(`https://api.koboo.my.id/api/stalk/tiktok?username=${text}`)
        let res = ress.data

        if (!res || res.status !== 200 || !res.result?.user) {
            throw 'Errore! Utente non trovato o dati non disponibili.'
        }

        let user = res.result.user
        let stats = res.result.stats || {}
        let profileTab = user.profileTab || {}
        let profilePic = user.avatarLarger || user.avatarMedium || user.avatarThumb || null
        const formatDate = (timestamp) => {
            if (!timestamp) return 'Non disponibile'
            return new Date(timestamp * 1000).toLocaleDateString('it-IT', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        }
        const formatNumber = (num) => {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
            return num.toString()
        }

        let teks = `
╭─ׄ✦⋆⁺₊✧ *\`PROFILO TIKTOK\`*
${d.l}
${d.l} 『 👤 』 _*Info Base*_
${d.l} • \`Nome:\` ${user.nickname || 'N/A'}
${d.l} • \`Username:\` @${user.uniqueId || text}
${d.l} • \`ID:\` ${user.id || 'N/A'}
${d.l} • \`Creato:\` ${formatDate(user.createTime)}
${d.di}
${d.l} 『 📊 』 _*Statistiche*_
${d.l} • \`Followers:\` ${formatNumber(stats.followerCount || 0)}
${d.l} • \`Following:\` ${formatNumber(stats.followingCount || 0)}
${d.l} • \`Like Totali:\` ${formatNumber(stats.heartCount || 0)}
${d.l} • \`Video:\` ${formatNumber(stats.videoCount || 0)}
${d.l} • \`Amici:\` ${formatNumber(stats.friendCount || 0)}
${d.l} • \`Mi Piace Dati:\` ${formatNumber(stats.diggCount || 0)}
${d.di}
${d.l} 『 📝 』 _*Dettagli Account*_
${d.l} • \`Bio:\` ${user.signature || 'Non impostata'}
${d.l} • \`Lingua:\` ${user.language?.toUpperCase() || 'Non specificata'}
${d.l} • \`Privato:\` ${user.privateAccount ? '🔒 Si' : '🔓 No'}
${d.l} • \`Verificato:\` ${user.verified ? '✅ Si' : '❌ No'}
${d.l} • \`Business:\` ${user.commerceUserInfo?.commerceUser ? '🛒 Si' : '❌ No'}
${d.l} • \`TT Seller:\` ${user.ttSeller ? '🛍️ Si' : '❌ No'}
${d.di}
${d.l} 『 ⚙️』 _*Impostazioni*_
${d.l} • \`Commenti:\` ${user.commentSetting === 0 ? '🔓 Pubblici' : '🔒 Limitati'}
${d.l} • \`Duetti:\` ${user.duetSetting === 0 ? '✅ Attivi' : '❌ Disattivati'}
${d.l} • \`Stitch:\` ${user.stitchSetting === 0 ? '✅ Attivi' : '❌ Disattivati'}
${d.l} • \`Download:\` ${user.downloadSetting === 0 ? '✅ Permessi' : '❌ Bloccati'}
${d.l} • \`Following Visibili:\` ${user.followingVisibility === 1 ? '👁️ Si' : '🙈 No'}
${d.di}
${d.l} 『 📱 』 _*Tab Profilo*_
${d.l} • \`Tab Musica:\` ${profileTab.showMusicTab ? '🎵 Si' : '❌ No'}
${d.l} • \`Tab Q&A:\` ${profileTab.showQuestionTab ? '❓ Si' : '❌ No'}
${d.l} • \`Tab Playlist:\` ${profileTab.showPlayListTab ? '📋 Si' : '❌ No'}
${d.l} • \`Playlist Espanse:\` ${user.canExpPlaylist ? '✅ Si' : '❌ No'}
${d.f}

> vare ✧ bot`
        if (profilePic) {
            try {
                await conn.sendFile(m.chat, profilePic, 'profile.jpg', teks, m)
            } catch (photoErr) {
                console.log('Errore nel caricare la foto profilo:', photoErr)
                await m.reply(teks + `\n${d.l} ⚠️ Impossibile caricare la foto profilo`)
            }
        } else {
            await m.reply(teks + `\n${d.l} ⚠️ Foto profilo non disponibile`)
        }

        await m.react('✨')

    } catch (err) {
        console.error(err)
        await m.reply(`${d.varebot}
${d.l} ❌ *ERRORE*
${d.l} ${err || 'Utente non trovato'}
${d.f}`)
        await m.react('❌')
    }
}

handler.help = ['ttstalk *<username>*']
handler.tags = ['ricerca']
handler.command = /^(tiktokstalk|stalktiktok|ttstalk)$/i

export default handler