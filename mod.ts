import { createBot, Intents, startBot, sendMessage, editMessage, Message, addReaction } from "https://deno.land/x/discordeno@13.0.0/mod.ts"
import * as Brigadier from "npm:brigadier-ts"
import env from "./env.json" assert { type: "json" }

const sleep = (time: number) => new Promise((r) => setTimeout(r, time))

let threads: bigint[] = []

const dispatcher: Brigadier.CommandDispatcher<Message> = new Brigadier.CommandDispatcher()

const bot = createBot({
    token: env.token,
    intents: Intents.Guilds | Intents.GuildMessages | Intents.MessageContent,
    events: {
        ready() {
            console.log("Successfully connected to gateway");
        },
        async threadCreate(_, thread) {
            if (threads.indexOf(thread.id) != -1) return
            if (thread.guildId != BigInt("1101964863871406182")) return
            threads.push(thread.id)
            let message = await sendMessage(bot, thread.id, {
                content: "Adding people to the thread..."
            })

            await sleep(500)
            editMessage(bot, thread.id, message.id, {
                content: "<@&1102016351813509261>, welcome!"
            })
        },
        messageCreate(_, message) {
            if (message.isFromBot || message.webhookId) return 
            if (!message.content.startsWith("#!")) return
            try {
                dispatcher.execute(message.content.substring(2), message)
            } catch (err: any) {
                sendMessage(bot, message.channelId, {
                    content: err.toString()
                })
            }
        }
    },
})

let pollEmotes = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"]

async function poll(name: string, options: string[], channelId: bigint) {
    if (options.length > 10) {
        sendMessage(bot, channelId, {
            content: "Poll cannot exceed 10 options."
        })
        return
    }

    let content = `@everyone: **Poll time!**\n> **${name}**\n`

    let i = 0
    for (let opt of options) {
        content += `${pollEmotes[i]} ${opt}\n`
        i++
    }

    const message = sendMessage(bot, channelId, { content })
    i = 0
    for (let _ in options) {
        await sleep(100)
        await addReaction(bot, channelId, (await message).id, pollEmotes[i])
        i++
    }
}

dispatcher.register(Brigadier.literal("poll").then(
    Brigadier.argument("name", Brigadier.string()).then(
        Brigadier.argument("options", Brigadier.greedyString()).executes((c) => {
            poll(c.get("name"), c.get("options").split(","), c.getSource().channelId)
            return 1
        })
    )
))

await startBot(bot)
