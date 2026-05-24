import { smsg } from './lib/simple.js'
import { format } from 'util'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'
import NodeCache from 'node-cache'
import { getAggregateVotesInPollMessage, toJid } from '@realvare/based'

global.ignoredUsersGlobal = new Set()
global.ignoredUsersGroup = {}
global.groupSpam = {}

if (!global.groupCache) {
    global.groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false })
}
if (!global.jidCache) {
    global.jidCache = new NodeCache({ stdTTL: 600, useClones: false })
}
if (!global.nameCache) {
    global.nameCache = new NodeCache({ stdTTL: 600, useClones: false });
}

export const fetchMetadata = async (conn, chatId) => await conn.groupMetadata(chatId)

const fetchGroupMetadataWithRetry = async (conn, chatId, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await conn.groupMetadata(chatId);
        } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

if (!global.cacheListenersSet) {
    const conn = global.conn
    if (conn) {
        conn.ev.on('groups.update', async (updates) => {
            for (const update of updates) {
                if (!update || !update.id) {
                    continue;
                }
                try {
                    const metadata = await fetchGroupMetadataWithRetry(conn, update.id)
                    if (!metadata) {
                        continue
                    }
                    global.groupCache.set(update.id, metadata, { ttl: 300 })
                } catch (e) {
                    if (!e?.message?.includes('not authorized') && !e?.message?.includes('chat not found') && !e?.message?.includes('not in group')) {
                        console.error(chalk.redBright(`[ERROR-BOT // CACHE_ERR] Fallimento aggiornamento su groups.update per ${update.id}:`), e)
                    }
                }
            }
        })
        global.cacheListenersSet = true
    }
}

if (!global.pollListenerSet) {
    const conn = global.conn
    if (conn) {
        conn.ev.on('messages.update', async (chatUpdate) => {
            for (const { key, update } of chatUpdate) {
                if (update.pollUpdates) {
                    try {
                        const pollCreation = await global.store.getMessage(key)
                        if (pollCreation) {
                            await getAggregateVotesInPollMessage({
                                message: pollCreation,
                                pollUpdates: update.pollUpdates,
                            })
                        }
                    } catch (e) {
                        console.error(chalk.redBright('[ERROR-BOT // POLL_ERR] Errore nel gestire poll update:'), e)
                    }
                }
            }
        })
        global.pollListenerSet = true
    }
}

const isNumber = x => typeof x === 'number' && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms))
const responseHandlers = new Map()

function initResponseHandler(conn) {
    if (!conn.waitForResponse) {
        conn.waitForResponse = async (chat, sender, options = {}) => {
            const {
                timeout = 30000,
                validResponses = null,
                onTimeout = null,
                filter = null
            } = options
            return new Promise((resolve) => {
                const key = chat + sender
                const timeoutId = setTimeout(() => {
                    responseHandlers.delete(key)
                    if (onTimeout) onTimeout()
                    resolve(null)
                }, timeout)
                responseHandlers.set(key, {
                    resolve,
                    timeoutId,
                    validResponses,
                    filter
                })
            })
        }
    }
}

global.processedCalls = global.processedCalls || new Map()
if (global.conn && global.conn.ws) {
    global.conn.ws.on('CB:call', async (json) => {
        try {
            if (!json?.tag || json.tag !== 'call' || !json.attrs?.from) {
                return
            }
            const callerId = global.conn.decodeJid(json.attrs.from)
            const isOwner = global.owner.some(([num]) => num === callerId.split('@')[0])
            if (isOwner) return

            const eventId = json.attrs.id
            let actualCallId = null
            if (json.content?.length > 0) {
                for (const item of json.content) {
                    if (item.attrs && item.attrs['call-id']) {
                        actualCallId = item.attrs['call-id']
                        break
                    }
                }
            }
            const uniqueCallId = actualCallId || eventId
            if (json.content?.length > 0) {
                const contentTags = json.content.map(item => item.tag)
                if (contentTags.includes('terminate')) {
                    global.processedCalls.delete(uniqueCallId)
                    return
                }
                if (contentTags.includes('relaylatency')) {
                    if (global.processedCalls.has(uniqueCallId)) {
                        return
                    }
                    global.processedCalls.set(uniqueCallId, true)

                    const numero = callerId.split('@')[0]
                    let nome = global.nameCache.get(callerId);
                    if (!nome) {
                      nome = global.conn.getName(callerId) || 'Sconosciuto'
                      global.nameCache.set(callerId, nome);
                    }
                    console.log(chalk.greenBright(`[📟 ERROR-BOT] Chiamata in arrivo intercettata da -> ${numero} - ${nome}`))

                    if (!global.db.data) await global.loadDatabase()
                    let settings = global.db.data?.settings?.[global.conn.user.jid]
                    if (!settings) {
                        settings = global.db.data.settings[global.conn.user.jid] = {
                            jadibotmd: false,
                            antiPrivate: true,
                            soloCreatore: false,
                            anticall: true,
                            status: 0
                        }
                    }
                    if (!settings.anticall) return

                    let user = global.db.data.users[callerId] || (global.db.data.users[callerId] = { callCount: 0, banned: false })
                    if (user.banned) {
                        await global.conn.rejectCall(uniqueCallId, callerId)
                        return
                    }
                    user.callCount = (user.callCount || 0) + 1
                    try {
                        await global.conn.rejectCall(uniqueCallId, callerId)
                        console.log(chalk.red(`[💀 BYPASS_CALL] Chiamata di ${numero} - ${nome} respinta e terminata.`))
                        if (user.callCount >= 3) {
                            user.banned = true
                            user.bannedReason = 'Troppi tentativi di chiamata mongoloide tagliati'
                            const msg = `⚠️ **[SYSTEM_FIREWALL]** // Sei stato bannato dal core di ERROR-BOT per spam di chiamate.`
                            await global.conn.sendMessage(toJid(callerId), { text: msg })
                        } else {
                            const msg = `⚠️ **[ANTIVIPER_SHIELD]** // Chiamata interrotta automaticamente. I protocolli di sicurezza vietano le call.`
                            await global.conn.sendMessage(toJid(callerId), { text: msg })
                        }
                    } catch (err) {
                        console.error(chalk.red('[ERROR-BOT // VOIP_ERR] Impossibile terminare la chiamata:', err))
                        global.processedCalls.delete(uniqueCallId)
                    }
                }
            }
        } catch (e) {
            console.error(chalk.red('[ERROR-BOT // CRITICAL_VOIP] Errore fatale nella gestione chiamate:', e))
        }
    })
}

setInterval(() => {
    if (global.processedCalls.size > 10) {
        global.processedCalls.clear()
    }

}, 180000)

export async function participantsUpdate({ id, participants, action }) {
    if (global.db.data.chats[id]?.rileva === false) return

    try {
        let metadata = global.groupCache.get(id) || await fetchMetadata(this, id)
        if (!metadata) return

        global.groupCache.set(id, metadata, { ttl: 300 })
        for (const user of participants) {
            const normalizedUser = this.decodeJid(user)
            let userName = global.nameCache.get(normalizedUser);
            if (!userName) {
              userName = (await this.getName(normalizedUser)) || normalizedUser.split('@')[0] || 'Sconosciuto'
              global.nameCache.set(normalizedUser, userName);
            }
            switch (action) {
                case 'add':
                    break
                case 'remove':
                    break
                case 'promote':
                    break
                case 'demote':
                    break
            }
        }
    } catch (e) {
        console.error(chalk.red(`[ERROR-BOT // OVERRIDE_ERR] Errore in participantsUpdate per ${id}:`), e)
    }
}

export async function handler(chatUpdate) {
    this.msgqueque = this.msgqueque || []
    this.uptime = this.uptime || Date.now()
    if (!chatUpdate) return
    this.pushMessage(chatUpdate.messages).catch(console.error)
    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m) return
if (m.message?.protocolMessage?.type === 'MESSAGE_EDIT') {
    const key = m.message.protocolMessage.key;
    const editedMessage = m.message.protocolMessage.editedMessage;
    m.key = key;
    m.message = editedMessage;
    m.text = editedMessage.conversation || editedMessage.extendedTextMessage?.text || '';
    m.mtype = Object.keys(editedMessage)[0];
    console.log(chalk.yellow(`[⚙️ GLITCH_EDIT] Rilevata modifica pacchetto ${key.id} nel canale ${key.remoteJid}`));
}
    m = smsg(this, m, global.store)
    if (!m || !m.key || !m.chat || !m.sender) return
    if (m.fromMe) return
    if (m.key.participant && m.key.participant.includes(':') && m.key.participant.split(':')[1]?.includes('@')) return

    if (m.key) {
        m.key.remoteJid = this.decodeJid(m.key.remoteJid)
        if (m.key.participant) m.key.participant = this.decodeJid(m.key.participant)
    }
    if (!m.key.remoteJid) return
    if (!this.originalGroupParticipantsUpdate) {
        this.originalGroupParticipantsUpdate = this.groupParticipantsUpdate
        this.groupParticipantsUpdate = async function(chatId, users, action) {
            try {
                let metadata = global.groupCache.get(chatId)
                if (!metadata) {
                    metadata = await fetchMetadata(this, chatId)
                    if (metadata) global.groupCache.set(chatId, metadata, { ttl: 300 })
                }
                if (!metadata) {
                    console.error(chalk.red('[ERROR-BOT // METADATA_CRITICAL] Metadati assenti per un aggiornamento sicuro dei nodi.'))
                    return this.originalGroupParticipantsUpdate.call(this, chatId, users, action)
                }

                const correctedUsers = users.map(userJid => {
                    const decoded = this.decodeJid(userJid)
                    const phone = decoded.split('@')[0].replace(/:\d+$/, '')
                    const participant = metadata.participants.find(p => {
                        const pId = this.decodeJid(p.id)
                        const pPhone = pId.split('@')[0].replace(/:\d+$/, '')
                        return pPhone === phone
                    })
                    return participant ? participant.id : userJid
                })

                return this.originalGroupParticipantsUpdate.call(this, chatId, correctedUsers, action)
            } catch (e) {
                console.error(chalk.red('[ERROR-BOT // SYSTEM_ERR] Errore fatale in safeGroupParticipantsUpdate:'), e)
                throw e
            }
        }
    }

    initResponseHandler(this)

    let user = null
    let chat = null
    let usedPrefix = null
    let normalizedSender = null
    let normalizedBot = null
    try {
        let eventHandled = false
        if (m.message?.eventResponseMessage) {
            const { eventId, response } = m.message.eventResponseMessage
            const jid = this.decodeJid(m.key.remoteJid)
            const userId = this.decodeJid(m.key.participant || m.key.remoteJid)
            const action = response === 'going' ? 'join' : 'leave'

            try {
                if (!global.activeEvents) global.activeEvents = new Map()
                if (!global.activeGiveaways) global.activeGiveaways = new Map()

                let eventData = global.activeEvents.get(eventId) || global.activeGiveaways.get(jid)
                if (eventData) {
                    if (!eventData.participants) eventData.participants = new Set()
                    if (action === 'join') {
                        eventData.participants.add(userId)
                    } else {
                        eventData.participants.delete(userId)
                    }
                    eventHandled = true
                }
            } catch (e) {
                console.error(chalk.red('[ERROR-BOT // COMPONENT_ERR] Errore in eventResponseMessage:'), e)
            }
        }

        if (m.message?.interactiveResponseMessage) {
            const interactiveResponse = m.message.interactiveResponseMessage
            if (interactiveResponse.nativeFlowResponseMessage?.paramsJson) {
                try {
                    const params = JSON.parse(interactiveResponse.nativeFlowResponseMessage.paramsJson)
                    if (params.id) {
                        const fakeMessage = {
                            key: m.key,
                            message: { conversation: params.id },
                            messageTimestamp: m.messageTimestamp,
                            pushName: m.pushName,
                            broadcast: m.broadcast
                        }
                        const processedMsg = smsg(this, fakeMessage)
                        if (processedMsg) {
                            processedMsg.text = params.id
                            return handler.call(this, { messages: [processedMsg] })
                        }
                    }
                } catch (e) {
                    console.error(chalk.red('[ERROR-BOT // FLOW_PARSE_ERR] Errore nel parsing di nativeFlowResponse:'), e)
                }
            }
        }

        if (!global.db.data) await global.loadDatabase()
        m.exp = 0
        m.euro = false
        m.isCommand = false

        normalizedSender = this.decodeJid(m.sender)
        normalizedBot = this.decodeJid(this.user.jid)
        if (!normalizedSender) return;

        user = global.db.data.users[normalizedSender] || (global.db.data.users[normalizedSender] = {
            exp: 0,
            euro: 10,
            muto: false,
            registered: false,
            name: m.pushName || '?',
            age: -1,
            regTime: -1,
            banned: false,
            bank: 0,
            level: 0,
            firstTime: Date.now(),
            spam: 0
        })

        chat = global.db.data.chats[m.chat] || (global.db.data.chats[m.chat] = {
            isBanned: false,
            welcome: false,
            goodbye: false,
            ai: false,
            vocali: false,
            antiporno: false,
            antioneview: false,
            autolevelup: false,
            antivoip: false,
            rileva: false,
            modoadmin: false,
            antiLink: false,
            antiLink2: false,
            reaction: false,
            antispam: false,
            expired: 0,
            users: {}
        })

        let settings = global.db.data.settings[this.user.jid] || (global.db.data.settings[this.user.jid] = {
            autoread: false,
            jadibotmd: false,
            antiPrivate: true,
            soloCreatore: false,
            registrazioni: true, 
            status: 0
        })

        if (settings.registrazioni === false) {
            user.registered = true;
        }

        if (m.mtype === 'pollUpdateMessage') return
        if (m.mtype === 'reactionMessage') return
        let groupMetadata = m.isGroup ? global.groupCache.get(m.chat) : null
        let participants = null
        let normalizedParticipants = null
        let isBotAdmin = false
        let isAdmin = false
        let isRAdmin = false
        let isSam = global.owner.some(([num]) => num + '@s.whatsapp.net' === normalizedSender)
        let isROwner = isSam || global.owner.some(([num]) => num + '@s.whatsapp.net' === normalizedSender)
        let isOwner = isROwner || m.fromMe
        let isMods = isOwner || global.mods?.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(normalizedSender) || false
        let isPrems = isROwner || global.prems?.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(normalizedSender) || false

        let modsList = global.db.data.chats[m.chat]?.moderatori || []
        let isMod = modsList.includes(normalizedSender)

        if (m.isGroup) {
            if (!groupMetadata) {
                groupMetadata = await fetchGroupMetadataWithRetry(this, m.chat)
                if (groupMetadata) {
                    groupMetadata.fetchTime = Date.now()
                    global.groupCache.set(m.chat, groupMetadata, { ttl: 300 })
                }
            }
            if (groupMetadata) {
                participants = groupMetadata.participants
                normalizedParticipants = participants.map(u => {
                    const normalizedId = this.decodeJid(u.id)
                    return { ...u, id: normalizedId, jid: u.jid || normalizedId }
                })
                const normalizedOwner = groupMetadata.owner ? this.decodeJid(groupMetadata.owner) : null
                const normalizedOwnerLid = groupMetadata.ownerLid ? this.decodeJid(groupMetadata.ownerLid) : null

                isAdmin = (participants.some(u => {
                    const participantIds = [
                        this.decodeJid(u.id),
                        u.jid ? this.decodeJid(u.jid) : null,
                        u.lid ? this.decodeJid(u.lid) : null
                    ].filter(Boolean)
                    const isMatch = participantIds.includes(normalizedSender)
                    return isMatch && (u.admin === 'admin' || u.admin === 'superadmin' || u.isAdmin === true || u.admin === true)
                }) || isMod)

                isBotAdmin = participants.some(u => {
                    const participantIds = [
                        this.decodeJid(u.id),
                        u.jid ? this.decodeJid(u.jid) : null,
                        u.lid ? this.decodeJid(u.lid) : null
                    ].filter(Boolean)
                    const isMatch = participantIds.includes(normalizedBot)
                    return isMatch && (u.admin === 'admin' || u.admin === 'superadmin' || u.isAdmin === true || u.admin === true)
                }) || (normalizedBot === normalizedOwner || normalizedBot === normalizedOwnerLid)

                isRAdmin = isAdmin && (normalizedSender === normalizedOwner || normalizedSender === normalizedOwnerLid)

                if (m.isGroup && !isAdmin) {
                    const secondMetadata = await fetchGroupMetadataWithRetry(this, m.chat)
                    if (secondMetadata) {
                        secondMetadata.fetchTime = Date.now()
                        global.groupCache.set(m.chat, secondMetadata, { ttl: 300 })
                        participants = secondMetadata.participants
                        normalizedParticipants = participants.map(u => {
                            const normalizedId = this.decodeJid(u.id)
                            return { ...u, id: normalizedId, jid: u.jid || normalizedId }
                        })

                        isAdmin = (participants.some(u => {
                            const participantIds = [
                                this.decodeJid(u.id),
                                u.jid ? this.decodeJid(u.jid) : null,
                                u.lid ? this.decodeJid(u.lid) : null
                            ].filter(Boolean)
                            const isMatch = participantIds.includes(normalizedSender)
                            return isMatch && (u.admin === 'admin' || u.admin === 'superadmin' || u.isAdmin === true || u.admin === true)
                        }) || isMod)

                        isBotAdmin = participants.some(u => {
                            const participantIds = [
                                this.decodeJid(u.id),
                                u.jid ? this.decodeJid(u.jid) : null,
                                u.lid ? this.decodeJid(u.lid) : null
                            ].filter(Boolean)
                            const isMatch = participantIds.includes(normalizedBot)
                            return isMatch && (u.admin === 'admin' || u.admin === 'superadmin' || u.isAdmin === true || u.admin === true)
                        }) || (normalizedBot === normalizedOwner || normalizedBot === normalizedOwnerLid)
                    }
                }
            }
        }

        const ___dirname = join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
        for (let name in global.plugins) {
            let plugin = global.plugins[name]
            if (!plugin) continue

            const __filename = join(___dirname, name)
            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all.call(this, m, {
                        chatUpdate,
                        __dirname: ___dirname,
                        __filename
                    })
                } catch (e) {
                    console.error(chalk.red('[ERROR-BOT // HOOK_ERR] Fallimento in plugin.all:'), e)
                }
            }

            const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
            let _prefix = plugin.customPrefix || global.prefix || '.'
            let match = (_prefix instanceof RegExp ? [[_prefix.exec(m.text), _prefix]] :
                Array.isArray(_prefix) ? _prefix.map(p => [p instanceof RegExp ? p : new RegExp(str2Regex(p)).exec(m.text), p]) :
                typeof _prefix === 'string' ? [[new RegExp(str2Regex(_prefix)).exec(m.text), _prefix]] :
                [[[], new RegExp]]).find(p => p[1])

            if (typeof plugin.before === 'function') {
                if (await plugin.before.call(this, m, {
                    match,
                    conn: this,
                    participants: normalizedParticipants,
                    groupMetadata,
                    user: { admin: isAdmin ? 'admin' : null },
                    bot: { admin: isBotAdmin ? 'admin' : null },
                    isSam,
                    isROwner,
                    isOwner,
                    isRAdmin,
                    isAdmin,
                    isBotAdmin,
                    isPrems,
                    chatUpdate,
                    __dirname: ___dirname,
                    __filename
                })) continue
            }

            if (typeof plugin !== 'function') continue

            if (!match || !match[0]) continue

            usedPrefix = (match[0] || '')[0]
            if (usedPrefix) {
                let noPrefix = m.text.replace(usedPrefix, '')
                let [command, ...args] = noPrefix.trim().split` `.filter(v => v)
                args = args || []
                let _args = noPrefix.trim().split` `.slice(1)
                let text = _args.join` `
                command = command?.toLowerCase() || ''
                let fail = plugin.fail || global.dfail
                let isAccept = plugin.command instanceof RegExp ? plugin.command.test(command) :
                    Array.isArray(plugin.command) ? plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command) :
                    typeof plugin.command === 'string' ? plugin.command === command : false

                if (!isAccept) continue

                if (m.isGroup && (plugin.admin || plugin.botAdmin)) {
                    const freshMetadata = global.groupCache.get(m.chat) || await fetchGroupMetadataWithRetry(this, m.chat)
                    if (freshMetadata) {
                        freshMetadata.fetchTime = Date.now()
                        global.groupCache.set(m.chat, freshMetadata, { ttl: 300 })
                        groupMetadata = freshMetadata
                        participants = groupMetadata.participants
                        normalizedParticipants = participants.map(u => {
                            const normalizedId = this.decodeJid(u.id)
                            return { ...u, id: normalizedId, jid: u.jid || normalizedId }
                        })

                        const normalizedOwner = groupMetadata.owner ? this.decodeJid(groupMetadata.owner) : null
                        const normalizedOwnerLid = groupMetadata.ownerLid ? this.decodeJid(groupMetadata.ownerLid) : null

                        isAdmin = (participants.some(u => {
                            const participantIds = [
                                this.decodeJid(u.id),
                                u.jid ? this.decodeJid(u.jid) : null,
                                u.lid ? this.decodeJid(u.lid) : null
                            ].filter(Boolean)
                            const isMatch = participantIds.includes(normalizedSender)
                            return isMatch && (u.admin === 'admin' || u.admin === 'superadmin' || u.isAdmin === true || u.admin === true)
                        }) || isMod)

                        isBotAdmin = participants.some(u => {
                            const participantIds = [
                                this.decodeJid(u.id),
                                u.jid ? this.decodeJid(u.jid) : null,
                                u.lid ? this.decodeJid(u.lid) : null
                            ].filter(Boolean)
                            const isMatch = participantIds.includes(normalizedBot)
                            return isMatch && (u.admin === 'admin' || u.admin === 'superadmin' || u.isAdmin === true || u.admin === true)
                        }) || (normalizedBot === normalizedOwner || normalizedBot === normalizedOwnerLid)

                        isRAdmin = isAdmin && (normalizedSender === normalizedOwner || normalizedSender === normalizedOwnerLid)
                    }
                }

                if (plugin.disabled && !isOwner) {
                    fail('disabled', m, this)
                    continue
                }

                if (user.muto && !isROwner && !isOwner) {
                    await this.sendMessage(m.chat, { text: `⚠️ **[MUTED_USER]** // Hai il cazzo di blood in bocca, non puoi usare i comandi.` }, { quoted: m }).catch(e => console.error('[ERRORE] Errore nell\'invio del messaggio:', e))
                    return
                }

                const ignoredGlobally = global.ignoredUsersGlobal.has(normalizedSender)
                const ignoredInGroup = m.isGroup && global.ignoredUsersGroup[m.chat]?.has(normalizedSender)
                if ((ignoredGlobally || ignoredInGroup) && !isROwner) {
                    await this.sendMessage(m.chat, { text: `⚠️ **[BLOCKED_NODE]** // Richiesta rifiutata. Permessi non concessi sul terminale.` }, { quoted: m }).catch(e => console.error('[ERRORE] Errore nell\'invio del messaggio:', e))
                    return
                }

                m.plugin = name
                if (chat.isBanned && !isROwner && !['gp-sbanchat.js', 'creatore-exec.js', 'gp-delete.js'].includes(name)) return
                if (user.banned && !isROwner && name !== 'creatore-banuser.js') {
                    if (user.antispam > 2) return
                    await this.sendMessage(m.chat, {
                        text: `⚠️ **[DENIED_HOST]**\n\n*Blood ti ha disconnesso dall'ecosistema di ERROR-BOT*.\n\n${user.bannedReason ? `🥀 Glitch: ${user.bannedReason}` : `🥀 Blood non ha bisogno di motivazioni.`}\n\n📟 Invia *${usedPrefix}segnala* se ritieni si tratti di un errore di tracciamento.`
                    }, { quoted: m }).catch(e => console.error('[ERRORE] Errore nell\'invio del messaggio:', e))
                    user.antispam++
                    return
                }

                if (m.isGroup && !isOwner && !isROwner && !isAdmin && chat.antispam) {
                    const groupData = global.groupSpam[m.chat] || (global.groupSpam[m.chat] = {
                        count: 0,
                        firstCommandTimestamp: 0,
                        isSuspended: false
                    })
                    const now = Date.now()
                    if (groupData.isSuspended) return

                    if (now - groupData.firstCommandTimestamp > 60000) {
                        groupData.count = 1
                        groupData.firstCommandTimestamp = now
                    } else {
                        groupData.count++
                    }

                    if (groupData.count > 8) {
                        groupData.isSuspended = true
                        await this.reply(m.chat, `📟 **[OVERLOAD_SHIELD]** // \`Anti-spam attivo\`\n\n> Traffico comandi troppo intenso sul server. Esecuzione interrotta per \`15 secondi\` per deframmentare la cache.\n\n*🟢 Gli amministratori bypassano questo protocollo.*`, m).catch(e => console.error('[ERRORE] Errore nell\'invio della risposta:', e))
                        setTimeout(() => {
                            delete global.groupSpam[m.chat]
                            console.log(chalk.cyan(`[Anti-Spam] Canale pulito. Ripristinati comandi nel gruppo: ${m.chat}`))
                        }, 15000)
                        return
                    }
                }

                if (chat.modoadmin && !isOwner && !isROwner && m.isGroup && !isAdmin) return
                if (settings.soloCreatore && !isROwner) return

                if (plugin.sam && !isSam) {
                    fail('sam', m, this)
                    continue
                }
                if (plugin.rowner && !isROwner) {
                    fail('rowner', m, this)
                    continue
                }
                if (plugin.owner && !isOwner) {
                    fail('owner', m, this)
                    continue
                }
                if (plugin.mods && !isMods) {
                    fail('mods', m, this)
                    continue
                }
                if (plugin.premium && !isPrems) {
                    fail('premium', m, this)
                    continue
                }
                if (plugin.group && !m.isGroup) {
                    fail('group', m, this)
                    continue
                }
                if (plugin.botAdmin && !isBotAdmin) {
                    fail('botAdmin', m, this)
                    continue
                }
                if (plugin.admin && !isAdmin) {
                    fail('admin', m, this)
                    continue
                }
                if (plugin.private && m.isGroup) {
                    fail('private', m, this)
                    continue
                }

                if (plugin.register && !user.registered) {
                    fail('unreg', m, this)
                    continue
                }

                m.isCommand = true
                let xp = 'exp' in plugin ? parseInt(plugin.exp) : 17
                if (xp > 200) {
                    await this.reply(m.chat, 'bzzzzz', m).catch(e => console.error('[ERRORE] Errore nella risposta:', e))
                } else {
                    m.exp += xp
                }

                if (!isPrems && plugin.euro && user.euro < plugin.euro) {
                    await this.reply(m.chat, `📟 **[INSUFFICIENT_FUNDS]** // Transazione fallita. Crediti non sufficienti sul wallet.`, m, null, global.fake).catch(e => console.error('[ERRORE] Errore nella risposta:', e))
                    continue
                }

                let extra = {
                    match,
                    usedPrefix,
                    noPrefix,
                    _args,
                    args,
                    command,
                    text,
                    conn: this,
                    participants: normalizedParticipants,
                    groupMetadata,
                    user: { admin: isAdmin ? 'admin' : null },
                    bot: { admin: isBotAdmin ? 'admin' : null },
                    isSam,
                    isROwner,
                    isOwner,
                    isRAdmin,
                    isAdmin,
                    isBotAdmin,
                    isPrems,
                    chatUpdate,
                    __dirname: ___dirname,
                    __filename
                }

                try {
                    await plugin.call(this, m, extra)
                    if (!isPrems) m.euro = plugin.euro || false
                } catch (e) {
                    m.error = e
                    console.error(chalk.red(`[ERROR-BOT // CORE_ERR] Eccezione riscontrata nella chat ${m.chat} da ${m.sender}:`), e)
                    if (e && e.message && e.message.includes('rate-overlimit')) {
                        console.warn(chalk.yellow('[AVVISO] Rate limit raggiunto sul canale WhatsApp. Ritento injector tra 2000ms...'))
                        await delay(2000)
                    }
                    let textErr = format(e)
                    await this.reply(m.chat, textErr, m).catch(err => console.error('[ERRORE] Errore nella risposta:', err))
                } finally {
                    if (typeof plugin.after === 'function') {
                        try {
                            await plugin.after.call(this, m, extra)
                        } catch (e) {
                            console.error(chalk.red('[ERROR-BOT // INJECT_ERR] Errore in plugin.after:'), e)
                        }
                    }
                    if (m.euro) {
                        await this.reply(m.chat, `\`📟 Payload eseguito. Caricati *${+m.euro}* crediti dal core.\``, m, null, global.rcanal).catch(e => console.error('[ERRORE] Errore nell\'invio della risposta:', e))
                    }
                }
                break
            }
        }
    } catch (e) {
        console.error(chalk.red(`[ERROR-BOT // INTERCEPTOR_CRITICAL] Fallimento fatale nel modulo handler per ${m.chat}:`), e)
    } finally {
        if (m && user && user.muto && !m.fromMe) {
            await this.sendMessage(m.chat, { delete: m.key }).catch(e => console.error('[ERRORE] Errore nell\'eliminazione del messaggio:', e))
        }

        if (m && user) {
            user.exp += m.exp || 0
            user.euro -= m.euro * 1 || 0
            if (!user.messages) user.messages = 0;
            user.messages++;
            if (m.isGroup) {
                if (!chat.users) chat.users = {};
                const senderId = normalizedSender;
                if (!chat.users[senderId]) {
                    chat.users[senderId] = { messages: 0 };
                }
                chat.users[senderId].messages++;
            }

            if (m.plugin) {
                let stats = global.db.data.stats || (global.db.data.stats = {})
                let stat = stats[m.plugin] || (stats[m.plugin] = {
                    total: 0,
                    success: 0,
                    last: 0,
                    lastSuccess: 0
                })
                const now = +new Date
                stat.total += 1
                stat.last = now
                if (!m.error) {
                    stat.success += 1
                    stat.lastSuccess = now
                }
            }
        }

        try {
            if (!global.opts['noprint'] && m) await (await import(`./lib/print.js`)).default(m, this)
        } catch (e) {
            console.error(chalk.red('[ERROR-BOT // PRINT_ERR] Errore nella visualizzazione log a schermo:'), e)
        }

        let settingsREAD = global.db.data.settings[this.user.jid] || {}
        if ((global.opts['autoread'] || settingsREAD.autoread2) && m) {
            await this.readMessages([m.key]).catch(e => console.error('[ERRORE] Errore nella lettura del messaggio:', e))
        }

        if (chat && chat.reaction && m?.text?.match(/(mente|zione|tà|ivo|osa|issimo|ma|però|eppure|anche|ma|no|se|ai|ciao|si)/gi) && !m.fromMe) {
            const emot = pickRandom([
                "🍟", "😃", "😄", "😁", "😆", "🍓", "😅", "😂", "🤣", "🥲", "☺️", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰"
            ])
            await this.sendMessage(m.chat, { react: { text: emot, key: m.key } }).catch(e => console.error('[ERRORE] Errore nell\'invio della reazione:', e))
        }
    }
}

global.dfail = async (type, m, conn) => {
    const settings = global.db.data.settings[conn.user.jid] || {}
    if (type === 'unreg' && settings.registrazioni === false) return

    const nome = m.pushName || 'sam'
    const etarandom = Math.floor(Math.random() * 21) + 13
        const msg = {
        sam: '🔒 **[OVERRIDE_RESTRICTED]**\n\n> Accesso negato dal sistema. Solo il modulo principale Blood può lanciare questo exploit.',
        rowner: '👑 **[ROOT_PRIVILEGES_REQUIRED]**\n\n> Livello di autenticazione non sufficiente. Comando riservato alla cerchia principale dei client configurati.',
        owner: '🛡️ **[MASTER_ACCESS_ONLY]**\n\n> Restrizione firewall rilevata. Solo gli sviluppatori accreditati nel file di configurazione possono procedere.',
        mods: '⚙️ **[MODERATOR_BYPASS_FAILED]**\n\n> Richiesta respinta. Questo payload necessita di privilegi intermedi di livello Sottocapo.',
        premium: '💎 **[PREMIUM_LICENSE_REQUIRED]**\n\n> Funzionalità criptata. È richiesto l\'aggiornamento del tuo nodo utente allo stato Premium.',
        group: '👥 **[LOCAL_NETWORK_ONLY]**\n\n> Errore di reindirizzamento. Questo pacchetto dati può essere iniettato solo all\'interno dei canali di un gruppo.',
        private: '📩 **[PRIVATE_UPLINK_ONLY]**\n\n> Protocollo sicuro attivato. Comunica direttamente sulla console privata per completare l\'azione.',
        admin: '🛠️ **[ADMIN_CLEARANCE_REQUIRED]**\n\n> Rifiuto del server. Operazione esclusiva per gli amministratori autorizzati del gruppo.',
        botAdmin: '🤖 **[BOT_ELEVATION_MISSING]**\n\n> Impossibile procedere. ERROR-BOT richiede di essere elevato ad Amministratore per manipolare i parametri del gruppo.',
        unreg: `📛 **[UNREGISTERED_HOST]**\n\n> Connessione rifiutata. Il tuo account non è censito nel database centrale di ERROR-BOT.\n\n📟 Per registrarti, invia il comando:\n\`.reg ${nome} ${etarandom}\``,
        restrict: '🚫 **[MODULE_DISABLED]**\n\n> Controllo fallito. Questa estensione è stata disattivata o congelata temporaneamente.',
        disabled: '🚫 **[COMMAND_TERMINATED]**\n\n> Questo script è disattivato a livello globale.'
    }[type]
    if (msg) {
        conn.reply(m.chat, msg, m, global.rcanal).catch(e => console.error('[ERRORE] Errore in dfail:', e))
    }
}

function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)]
}

let file = global.__filename(import.meta.url, true)
watchFile(file, async () => { 
    unwatchFile(file)     
    console.log(chalk.bgHex('#00FF00')(chalk.black.bold(" [📟 SYSTEM_ALERT] // File: 'handler.js' aggiornato ed iniettato con successo nel core. ")))
})
