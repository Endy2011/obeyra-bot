

import quizDB from '../media/database/quiz-it.js'

const quizTimers = {}

const FAST_INTERVAL = 5 * 60 * 1000
const SLOW_INTERVAL = 15 * 60 * 1000
const ACTIVE_WINDOW_FAST = 60 * 1000
const VERY_ACTIVE_MESSAGES = 20

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle(array) {
  return array
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
}

function formatNumber(num) {
  return new Intl.NumberFormat('it-IT').format(num || 0)
}

function getUserData(jid) {
  if (!global.db.data.users[jid]) global.db.data.users[jid] = {}

  const user = global.db.data.users[jid]

  if (typeof user.money !== 'number') user.money = 0
  if (typeof user.quizVinti !== 'number') user.quizVinti = 0
  if (typeof user.quizPersi !== 'number') user.quizPersi = 0

  return user
}

function addMoney(jid, amount) {
  const user = getUserData(jid)
  user.money += amount
  user.quizVinti += 1
  return user.money
}

function addLose(jid) {
  const user = getUserData(jid)
  user.quizPersi += 1
}

function registraAttivita(chat, sender) {
  chat.quizActivity = chat.quizActivity || []

  chat.quizActivity.push({
    sender,
    time: Date.now()
  })

  pulisciAttivita(chat)
}

function pulisciAttivita(chat) {
  chat.quizActivity = chat.quizActivity || []

  const limite = Date.now() - SLOW_INTERVAL

  chat.quizActivity = chat.quizActivity.filter(x => x.time >= limite)
}

function getActivity(chat) {
  pulisciAttivita(chat)

  const now = Date.now()

  const ultimi60 = (chat.quizActivity || []).filter(x =>
    now - x.time <= ACTIVE_WINDOW_FAST
  )

  const ultimi15 = (chat.quizActivity || []).filter(x =>
    now - x.time <= SLOW_INTERVAL
  )

  const utenti60 = new Set(ultimi60.map(x => x.sender)).size
  const utenti15 = new Set(ultimi15.map(x => x.sender)).size

  const moltoAttiva = ultimi60.length >= VERY_ACTIVE_MESSAGES

  return {
    messaggi60: ultimi60.length,
    utenti60,
    messaggi15: ultimi15.length,
    utenti15,
    moltoAttiva,
    prossimoMs: moltoAttiva ? FAST_INTERVAL : SLOW_INTERVAL,
    prossimoMin: moltoAttiva ? 5 : 15
  }
}

function getQuizPool(chat, categoria = '') {
  let pool = quizDB

  if (categoria) {
    const cat = categoria.toLowerCase()

    pool = quizDB.filter(q =>
      String(q.categoria || '').toLowerCase().includes(cat)
    )
  }

  if (!pool.length) pool = quizDB

  chat.quizUsati = chat.quizUsati || []

  const disponibili = pool.filter(q => {
    const index = quizDB.indexOf(q)
    return !chat.quizUsati.includes(index)
  })

  if (!disponibili.length) {
    chat.quizUsati = []
    return pool
  }

  return disponibili
}

function generaQuiz(chat, categoria = '') {
  const pool = getQuizPool(chat, categoria)
  const quiz = pool[randomBetween(0, pool.length - 1)]
  const realIndex = quizDB.indexOf(quiz)

  chat.quizUsati = chat.quizUsati || []

  if (realIndex >= 0 && !chat.quizUsati.includes(realIndex)) {
    chat.quizUsati.push(realIndex)
  }

  return {
    categoria: quiz.categoria,
    domanda: quiz.domanda,
    opzioni: shuffle([...quiz.opzioni]),
    corretta: quiz.corretta,
    premio: randomBetween(60, 200)
  }
}

function initQuizMods(chat) {
  chat.quizMods404 = chat.quizMods404 || []
  return chat.quizMods404
}

function isQuizMod(chat, jid) {
  initQuizMods(chat)
  return chat.quizMods404.includes(jid)
}

function getTarget(m, text = '') {
  if (m.mentionedJid?.[0]) return m.mentionedJid[0]
  if (m.quoted?.sender) return m.quoted.sender

  const num = String(text || '').replace(/[^0-9]/g, '')
  if (num.length >= 8) return `${num}@s.whatsapp.net`

  return null
}

async function mandaQuiz(conn, chatId, chat, automatic = true, categoria = '') {
  if (chat.quizAttivo?.active) return false

  const quiz = generaQuiz(chat, categoria)
  const lettere = ['A', 'B', 'C', 'D']

  chat.quizAttivo = {
    active: true,
    domanda: quiz.domanda,
    categoria: quiz.categoria,
    opzioni: quiz.opzioni,
    corretta: quiz.corretta,
    premio: quiz.premio,
    startAt: Date.now(),
    endAt: Date.now() + 45 * 1000
  }

  const opzioniText = quiz.opzioni
    .map((opzione, i) => `*${lettere[i]}.* ${opzione}`)
    .join('\n')

  const testo = `*╭━━━━━━━🧠━━━━━━━╮*
*✦ 𝐐𝐔𝐈𝐙 𝐑𝐀𝐍𝐃𝐎𝐌 ✦*
*╰━━━━━━━🧠━━━━━━━╯*

${automatic ? '*🎲 Quiz automatico apparso nel gruppo.*\n' : ''}
*📚 Categoria:* *${quiz.categoria}*
*❓ Domanda:* *${quiz.domanda}*

${opzioniText}

*⏱️ Tempo:* *45 secondi*
*💰 Premio:* *${formatNumber(quiz.premio)} monete*

*Scegli la risposta con i tasti sotto.*

> *𝐄𝐑𝐑𝐎𝐑⁴⁰⁴*`

  await conn.sendMessage(chatId, {
    text: testo,
    footer: '𝐄𝐑𝐑𝐎𝐑⁴⁰⁴',
    buttons: quiz.opzioni.map((_, i) => ({
      buttonId: `.quizrisp ${lettere[i]}`,
      buttonText: { displayText: lettere[i] },
      type: 1
    })),
    headerType: 1
  }).catch(() => null)

  if (quizTimers[chatId]) clearTimeout(quizTimers[chatId])

  quizTimers[chatId] = setTimeout(async () => {
    if (chat.quizAttivo?.active) {
      const risposta = chat.quizAttivo.corretta
      chat.quizAttivo.active = false

      await conn.sendMessage(chatId, {
        text: `*╭━━━━━━━⏰━━━━━━━╮*
*✦ 𝐐𝐔𝐈𝐙 𝐒𝐂𝐀𝐃𝐔𝐓𝐎 ✦*
*╰━━━━━━━⏰━━━━━━━╯*

*❌ Nessuno ha risposto in tempo.*
*✅ Risposta corretta:* *${risposta}*

> *𝐄𝐑𝐑𝐎𝐑⁴⁰⁴*`,
        footer: '𝐄𝐑𝐑𝐎𝐑⁴⁰⁴',
        buttons: [
          {
            buttonId: '.quiz',
            buttonText: { displayText: '🧠 Nuovo quiz' },
            type: 1
          },
          {
            buttonId: '.quizsaldo',
            buttonText: { displayText: '🏦 Saldo' },
            type: 1
          }
        ],
        headerType: 1
      }).catch(() => null)
    }
  }, 45 * 1000)

  return true
}

async function controllaQuizAuto(conn) {
  const chats = global.db?.data?.chats || {}
  const now = Date.now()

  for (const [chatId, chat] of Object.entries(chats)) {
    if (!chatId.endsWith('@g.us')) continue
    if (!chat.quizAuto) continue
    if (chat.quizAttivo?.active) continue

    const activity = getActivity(chat)

    if (!chat.quizNextAt) {
      chat.quizNextAt = now + activity.prossimoMs
      continue
    }

    if (now < chat.quizNextAt) continue

    const inviato = await mandaQuiz(conn, chatId, chat, true)

    if (inviato) {
      const nextActivity = getActivity(chat)
      chat.quizNextAt = now + nextActivity.prossimoMs
    }
  }
}

function startQuizAuto() {
  if (global.quizAutoInterval404) return

  global.quizAutoInterval404 = setInterval(() => {
    if (global.conn) {
      controllaQuizAuto(global.conn).catch(console.error)
    }
  }, 60 * 1000)
}

let handler = async (m, { conn, text, command, isAdmin, isOwner, isROwner, usedPrefix }) => {
  if (!m.isGroup) return m.reply('❌ Solo nei gruppi.')

  const chat = global.db.data.chats[m.chat] || (global.db.data.chats[m.chat] = {})
  initQuizMods(chat)
  startQuizAuto()

  const input = (text || '').trim().toLowerCase()

  if (command === 'addquizmod') {
    if (!isAdmin && !isOwner && !isROwner) return true

    const target = getTarget(m, text)

    if (!target) {
      return m.reply('❌ Tagga un utente o rispondi a un suo messaggio.')
    }

    if (chat.quizMods404.includes(target)) {
      return m.reply('⚠️ Questo utente è già quizmod.')
    }

    chat.quizMods404.push(target)

    return conn.sendMessage(m.chat, {
      text: `*╭━━━━━━━✅━━━━━━━╮*
*✦ 𝐐𝐔𝐈𝐙𝐌𝐎𝐃 𝐀𝐆𝐆𝐈𝐔𝐍𝐓𝐎 ✦*
*╰━━━━━━━✅━━━━━━━╯*

*@${target.split('@')[0]}* ora può usare:

*.quiz*

e può premere il bottone:

*🧠 Nuovo quiz*

> *𝐄𝐑𝐑𝐎𝐑⁴⁰⁴*`,
      mentions: [target]
    }, { quoted: m })
  }

  if (command === 'delquizmod') {
    if (!isAdmin && !isOwner && !isROwner) return true

    const target = getTarget(m, text)

    if (!target) {
      return m.reply('❌ Tagga un utente o rispondi a un suo messaggio.')
    }

    if (!chat.quizMods404.includes(target)) {
      return m.reply('⚠️ Questo utente non è quizmod.')
    }

    chat.quizMods404 = chat.quizMods404.filter(jid => jid !== target)

    return conn.sendMessage(m.chat, {
      text: `*╭━━━━━━━❌━━━━━━━╮*
*✦ 𝐐𝐔𝐈𝐙𝐌𝐎𝐃 𝐑𝐈𝐌𝐎𝐒𝐒𝐎 ✦*
*╰━━━━━━━❌━━━━━━━╯*

*@${target.split('@')[0]}* non può più usare *.quiz*.

> *𝐄𝐑𝐑𝐎𝐑⁴⁰⁴*`,
      mentions: [target]
    }, { quoted: m })
  }

  if (command === 'listquizmod') {
    if (!isAdmin && !isOwner && !isROwner) return true

    if (!chat.quizMods404.length) {
      return m.reply('📭 Nessun quizmod impostato in questo gruppo.')
    }

    const lista = chat.quizMods404
      .map((jid, i) => `${i + 1}. *@${jid.split('@')[0]}*`)
      .join('\n')

    return conn.sendMessage(m.chat, {
      text: `*╭━━━━━━━🧠━━━━━━━╮*
*✦ 𝐐𝐔𝐈𝐙𝐌𝐎𝐃 ✦*
*╰━━━━━━━🧠━━━━━━━╯*

${lista}

*Permesso:*
• *.quiz*
• bottone *🧠 Nuovo quiz*

> *𝐄𝐑𝐑𝐎𝐑⁴⁰⁴*`,
      mentions: chat.quizMods404
    }, { quoted: m })
  }

  if (command === 'quizrisp') {
    const quiz = chat.quizAttivo

    // Quiz finito/scaduto: ignora in silenzio.
    if (!quiz || !quiz.active) return true

    const rispostaLettera = input.toUpperCase()
    const lettere = ['A', 'B', 'C', 'D']
    const index = lettere.indexOf(rispostaLettera)

    if (index === -1) return true

    const risposta = quiz.opzioni[index]

    if (risposta !== quiz.corretta) {
      addLose(m.sender)

      return conn.sendMessage(m.chat, {
        text: `*╭━━━━━━━❌━━━━━━━╮*
*✦ 𝐑𝐈𝐒𝐏𝐎𝐒𝐓𝐀 𝐒𝐁𝐀𝐆𝐋𝐈𝐀𝐓𝐀 ✦*
*╰━━━━━━━❌━━━━━━━╯*

*Hai scelto:* *${risposta}*

Il quiz è ancora attivo, puoi ritentare se fai in tempo.

> *𝐄𝐑𝐑𝐎𝐑⁴⁰⁴*`,
        footer: '𝐄𝐑𝐑𝐎𝐑⁴⁰⁴',
        buttons: [
          {
            buttonId: '.quizsaldo',
            buttonText: { displayText: '🏦 Saldo' },
            type: 1
          }
        ],
        headerType: 1
      }, { quoted: m })
    }

    quiz.active = false

    if (quizTimers[m.chat]) clearTimeout(quizTimers[m.chat])

    const saldo = addMoney(m.sender, quiz.premio)

    return conn.sendMessage(m.chat, {
      text: `*╭━━━━━━━✅━━━━━━━╮*
*✦ 𝐑𝐈𝐒𝐏𝐎𝐒𝐓𝐀 𝐄𝐒𝐀𝐓𝐓𝐀 ✦*
*╰━━━━━━━✅━━━━━━━╯*

*👤 Vincitore:* *@${m.sender.split('@')[0]}*
*✅ Risposta:* *${quiz.corretta}*
*💰 Premio:* *+${formatNumber(quiz.premio)} monete*
*🏦 Saldo attuale:* *${formatNumber(saldo)}*

*Complimenti, hai battuto il gruppo.*

> *𝐄𝐑𝐑𝐎𝐑⁴⁰⁴*`,
      mentions: [m.sender],
      footer: '𝐄𝐑𝐑𝐎𝐑⁴⁰⁴',
      buttons: [
        {
          buttonId: '.quiz',
          buttonText: { displayText: '🧠 Nuovo quiz' },
          type: 1
        },
        {
          buttonId: '.quizsaldo',
          buttonText: { displayText: '🏦 Saldo' },
          type: 1
        }
      ],
      headerType: 1
    }, { quoted: m })
  }

  if (command === 'quizsaldo') {
    const user = getUserData(m.sender)

    return conn.sendMessage(m.chat, {
      text: `*╭━━━━━━━🏦━━━━━━━╮*
*✦ 𝐒𝐀𝐋𝐃𝐎 𝐐𝐔𝐈𝐙 ✦*
*╰━━━━━━━🏦━━━━━━━╯*

*💰 Monete:* *${formatNumber(user.money)}*
*✅ Quiz vinti:* *${formatNumber(user.quizVinti)}*
*❌ Risposte sbagliate:* *${formatNumber(user.quizPersi)}*

> *𝐄𝐑𝐑𝐎𝐑⁴⁰⁴*`,
      footer: '𝐄𝐑𝐑𝐎𝐑⁴⁰⁴',
      buttons: [
        {
          buttonId: '.quiz',
          buttonText: { displayText: '🧠 Nuovo quiz' },
          type: 1
        }
      ],
      headerType: 1
    }, { quoted: m })
  }

  if (command === 'quizauto') {
    if (!isAdmin && !isOwner && !isROwner) return true

    if (input === 'on') {
      const activity = getActivity(chat)

      chat.quizAuto = true
      chat.quizNextAt = Date.now() + activity.prossimoMs

      startQuizAuto()

      return conn.sendMessage(m.chat, {
        text: `*╭━━━━━━━✅━━━━━━━╮*
*✦ 𝐐𝐔𝐈𝐙 𝐀𝐔𝐓𝐎 𝐎𝐍 ✦*
*╰━━━━━━━✅━━━━━━━╯*

Quiz automatici attivati.

*🔥 Chat molto attiva:* ogni *5 minuti*
*💬 Chat normale/spenta:* ogni *15 minuti*

*📌 Molto attiva = almeno ${VERY_ACTIVE_MESSAGES} messaggi in 1 minuto.*

> *𝐄𝐑𝐑𝐎𝐑⁴⁰⁴*`,
        footer: '𝐄𝐑𝐑𝐎𝐑⁴⁰⁴',
        buttons: [
          {
            buttonId: '.quizauto status',
            buttonText: { displayText: '📊 Status' },
            type: 1
          },
          {
            buttonId: '.quiz',
            buttonText: { displayText: '🧠 Nuovo quiz' },
            type: 1
          }
        ],
        headerType: 1
      }, { quoted: m })
    }

    if (input === 'off') {
      chat.quizAuto = false
      chat.quizNextAt = null

      return conn.sendMessage(m.chat, {
        text: `*╭━━━━━━━❌━━━━━━━╮*
*✦ 𝐐𝐔𝐈𝐙 𝐀𝐔𝐓𝐎 𝐎𝐅𝐅 ✦*
*╰━━━━━━━❌━━━━━━━╯*

Quiz automatici disattivati.

> *𝐄𝐑𝐑𝐎𝐑⁴⁰⁴*`,
        footer: '𝐄𝐑𝐑𝐎𝐑⁴⁰⁴',
        buttons: [
          {
            buttonId: '.quizauto status',
            buttonText: { displayText: '📊 Status' },
            type: 1
          }
        ],
        headerType: 1
      }, { quoted: m })
    }

    if (input === 'status') {
      const stato = chat.quizAuto ? 'ON ✅' : 'OFF ❌'
      const activity = getActivity(chat)

      const next = chat.quizNextAt
        ? Math.max(0, Math.ceil((chat.quizNextAt - Date.now()) / 60000))
        : null

      return conn.sendMessage(m.chat, {
        text: `*╭━━━━━━━📊━━━━━━━╮*
*✦ 𝐒𝐓𝐀𝐓𝐎 𝐐𝐔𝐈𝐙 ✦*
*╰━━━━━━━📊━━━━━━━╯*

*🎲 Automatici:* ${stato}
*⏱️ Prossimo quiz:* ${next !== null ? `${next} min circa` : 'non programmato'}
*📚 Domande database:* *${formatNumber(quizDB.length)}*

*🔥 Attività ultimo minuto*
*💬 Messaggi:* *${formatNumber(activity.messaggi60)}*
*👥 Utenti:* *${formatNumber(activity.utenti60)}*
*📌 Stato:* ${activity.moltoAttiva ? '🔥 Molto attiva' : '💬 Normale/spenta'}

*🔁 Frequenza attuale:* ogni *${activity.prossimoMin} minuti*

*Comandi:*
${usedPrefix}quizauto on
${usedPrefix}quizauto off
${usedPrefix}quizauto status
${usedPrefix}quiz
${usedPrefix}quizsaldo
${usedPrefix}addquizmod @utente
${usedPrefix}delquizmod @utente
${usedPrefix}listquizmod

> *𝐄𝐑𝐑𝐎𝐑⁴⁰⁴*`,
        footer: '𝐄𝐑𝐑𝐎𝐑⁴⁰⁴',
        buttons: [
          {
            buttonId: '.quiz',
            buttonText: { displayText: '🧠 Nuovo quiz' },
            type: 1
          },
          {
            buttonId: '.quizauto on',
            buttonText: { displayText: '✅ Auto ON' },
            type: 1
          },
          {
            buttonId: '.quizauto off',
            buttonText: { displayText: '❌ Auto OFF' },
            type: 1
          }
        ],
        headerType: 1
      }, { quoted: m })
    }

    return m.reply(`*Uso:*
${usedPrefix}quizauto on
${usedPrefix}quizauto off
${usedPrefix}quizauto status`)
  }

  if (command === 'quiz') {
    const canUseQuiz =
      isAdmin ||
      isOwner ||
      isROwner ||
      isQuizMod(chat, m.sender)

    // Membri normali: silenzio totale.
    if (!canUseQuiz) return true

    if (chat.quizAttivo?.active) {
      return conn.sendMessage(m.chat, {
        text: `*╭━━━━━━━🧠━━━━━━━╮*
*✦ 𝐐𝐔𝐈𝐙 𝐆𝐈𝐀̀ 𝐀𝐓𝐓𝐈𝐕𝐎 ✦*
*╰━━━━━━━🧠━━━━━━━╯*

C’è già un quiz attivo in questo gruppo.

Rispondi a quello prima di avviarne un altro.

> *𝐄𝐑𝐑𝐎𝐑⁴⁰⁴*`,
        footer: '𝐄𝐑𝐑𝐎𝐑⁴⁰⁴',
        buttons: [
          {
            buttonId: '.quizsaldo',
            buttonText: { displayText: '🏦 Saldo' },
            type: 1
          }
        ],
        headerType: 1
      }, { quoted: m })
    }

    const inviato = await mandaQuiz(conn, m.chat, chat, false, input)

    if (!inviato) return true
  }
}

handler.all = async function (m) {
  startQuizAuto()

  if (!m.isGroup) return false
  if (m.fromMe) return false
  if (!m.sender) return false

  const chat = global.db.data.chats[m.chat] || (global.db.data.chats[m.chat] = {})
  const text = (m.text || '').trim()

  if (
    text.startsWith('.') ||
    text.startsWith('/') ||
    text.startsWith('#') ||
    text.startsWith('*')
  ) {
    return false
  }

  registraAttivita(chat, m.sender)

  return false
}

handler.help = [
  'quiz',
  'quizauto',
  'quizsaldo',
  'addquizmod',
  'delquizmod',
  'listquizmod'
]

handler.tags = ['group']

handler.command = [
  'quiz',
  'quizauto',
  'quizrisp',
  'quizsaldo',
  'addquizmod',
  'delquizmod',
  'listquizmod'
]

handler.group = true

export default handler