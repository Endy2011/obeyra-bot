import fs from 'fs';

const quizDB = JSON.parse(fs.readFileSync('./media/database/quiz-data.json', 'utf-8'));
const quizTimers = {};

function randomBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffle(array) { return array.map(value => ({ value, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(({ value }) => value); }
function formatNumber(num) { return new Intl.NumberFormat('it-IT').format(num || 0); }

function getUserData(jid) {
    if (!global.db.data.users[jid]) global.db.data.users[jid] = { money: 0, quizVinti: 0, quizPersi: 0 };
    return global.db.data.users[jid];
}

function getQuizPool(chat, categoria) {
    let pool = categoria ? quizDB.filter(q => q.categoria.toLowerCase().includes(categoria.toLowerCase())) : quizDB;
    chat.quizUsati = chat.quizUsati || [];
    let disp = pool.filter(q => !chat.quizUsati.includes(quizDB.indexOf(q)));
    if (!disp.length) { chat.quizUsati = []; return pool; }
    return disp;
}

async function mandaQuiz(conn, chatId, chat, categoria = '') {
    if (chat.quizAttivo?.active) return false;

    const pool = getQuizPool(chat, categoria);
    const quiz = pool[randomBetween(0, pool.length - 1)];
    const realIndex = quizDB.indexOf(quiz);
    chat.quizUsati.push(realIndex);

    chat.quizAttivo = {
        active: true,
        domanda: quiz.domanda,
        opzioni: shuffle([...quiz.opzioni]),
        corretta: quiz.corretta,
        premio: randomBetween(60, 200),
        startAt: Date.now()
    };

    const lettere = ['A', 'B', 'C', 'D'];
    const buttons = chat.quizAttivo.opzioni.map((_, i) => ({
        buttonId: `.quizrisp ${lettere[i]}`,
        buttonText: { displayText: lettere[i] },
        type: 1
    }));

    const testo = `☠️ 𝗤𝗨𝗜𝗭 𝗦𝗬𝗦𝗧𝗘𝗠 ☠️\n\n⎔ *Categoria:* ${quiz.categoria}\n⎔ *Domanda:* ${quiz.domanda}\n\n${chat.quizAttivo.opzioni.map((o, i) => `*${lettere[i]}.* ${o}`).join('\n')}\n\n⏱️ *Tempo:* 45s | 💰 *Premio:* ${formatNumber(chat.quizAttivo.premio)}`;

    await conn.sendMessage(chatId, { text: testo, buttons: buttons, headerType: 1 });

    if (quizTimers[chatId]) clearTimeout(quizTimers[chatId]);
    quizTimers[chatId] = setTimeout(async () => {
        if (chat.quizAttivo?.active) {
            chat.quizAttivo.active = false;
            await conn.sendMessage(chatId, { text: `☠️ TIMEOUT! La risposta era: ${quiz.corretta}` });
        }
    }, 45000);
}

let handler = async (m, { conn, text, command, isAdmin, isOwner }) => {
    const chat = global.db.data.chats[m.chat];
    
    switch(command) {
        case 'quiz':
            if (!isAdmin && !isOwner && !chat.quizMods404?.includes(m.sender)) return m.reply('Non hai i permessi!');
            await mandaQuiz(conn, m.chat, chat, text);
            break;

        case 'quizrisp':
            const quiz = chat.quizAttivo;
            if (!quiz?.active) return;
            const index = ['A', 'B', 'C', 'D'].indexOf(text.toUpperCase());
            if (index === -1 || quiz.opzioni[index] !== quiz.corretta) {
                getUserData(m.sender).quizPersi++;
                return m.reply('❌ Sbagliato!');
            }
            quiz.active = false;
            clearTimeout(quizTimers[m.chat]);
            const user = getUserData(m.sender);
            user.money += quiz.premio;
            user.quizVinti++;
            return m.reply(`✅ CORRETTO! Hai vinto ${quiz.premio} monete.`);

        case 'quizauto':
            if (!isAdmin && !isOwner) return m.reply('Solo admin!');
            chat.quizAuto = !chat.quizAuto;
            m.reply(`Quiz automatico: ${chat.quizAuto ? 'ON' : 'OFF'}`);
            break;

        case 'quizsaldo':
            const u = getUserData(m.sender);
            m.reply(`💰 Saldo: ${u.money}\n🏆 Vinti: ${u.quizVinti}\n💀 Persi: ${u.quizPersi}`);
            break;

        case 'addquizmod':
            if (!isOwner) return m.reply('Solo il proprietario!');
            const target = m.mentionedJid[0] || m.sender;
            chat.quizMods404 = chat.quizMods404 || [];
            chat.quizMods404.push(target);
            m.reply('Utente aggiunto ai mod del quiz.');
            break;
    }
}

handler.command = ['quiz', 'quizrisp', 'quizauto', 'quizsaldo', 'addquizmod'];
export default handler;