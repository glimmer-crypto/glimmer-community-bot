import "./load-env"
import "./keep-alive"

import * as Discord from "discord.js"

import db from "./Database"
import parseSudoCommand from "./SudoCommands"
import { sha256, amountString, ordinalNumber } from "./utils"
import WelcomeGift from "./WelcomeGift"

const client = new Discord.Client()

const server = {
  id: "830039917341835295",
  roles: {
    puzzler: "836205423455371295",
    member: "837453599302090803"
  },
  channels: {
    rules: "836203001991397378",
    welcome: "837746639966961764"
  },
  messages: {
    acceptRules: "837450386401919037"
  }
}

async function addMember(user: Discord.User) {
  await giveRole(user, server.roles.member)
  const storedMember = await db.getMemberInfo(user.id)

  if (!storedMember) { // We have a new member!
    const memberNum = await db.increment("member_count")
    const welcome = await client.channels.fetch(server.channels.welcome) as Discord.TextChannel
    welcome.send(`Welcome <@${user.id}> you are the **${ordinalNumber(memberNum)}** person to join the community`)

    const giftWallet = await sendGift(user)

    db.setMemberInfo(user.id, {
      puzzlesSolved: 0,
      initialPuzzleHash: giftWallet?.passwordHash
    })
  }
}

async function sendGift(user: Discord.User) {
  const dm = await user.createDM()

  let giftWallet: db.WelcomeGift | null = null
  let giftPuzzle: string | null = null

  while (!giftPuzzle) {
    giftWallet = await WelcomeGift.shiftWallet()
    if (!giftWallet) { return null }

    giftPuzzle = await WelcomeGift.getPuzzle(giftWallet)
  }

  let giftText = `Below you will find a wallet object containing ${amountString(giftWallet?.amount)} Glimmer\n\n\n`
  giftText += JSON.stringify(giftWallet?.wallet, null, 2) + "\n\n\n"
  giftText += "----------Begin Secret----------\n"
  giftText += giftPuzzle
  giftText += "\n---------- End Secret ----------"
  giftText = "```" + giftText + "```"

  dm.send(new Discord.MessageEmbed({
    title: `Welcome to the Glimmer Community ${user.username}`,
    description: `Your welcome gift is below. [More information](https://discord.com/channels/830039917341835295/836205213576724500)\n\n\n${giftText}`
  }))

  return giftWallet
}

async function giveRole(user: Discord.User | Discord.GuildMember, roleId: string): Promise<boolean> {
  try {
    const guild = await client.guilds.fetch(server.id)
    const member = await guild.members.fetch(user)
    const role = await guild.roles.fetch(roleId)

    if (member && role) {
      await member.roles.add(role)
      return true
    } else {
      return false
    }
  } catch (err) {
    console.error(err)
    return false
  }
}

async function removeRole(user: Discord.User | Discord.GuildMember, roleId: string): Promise<boolean> {
  try {
    const guild = await client.guilds.fetch(server.id)
    const member = await guild.members.fetch(user)
    const role = await guild.roles.fetch(roleId)

    if (member && role) {
      await member.roles.remove(role)
      return true
    } else {
      return false
    }
  } catch (err) {
    console.error(err)
    return false
  }
}

async function givePuzzlerRole(user: Discord.User, puzzlesSolved: number) {
  if (puzzlesSolved > 1) {
    giveRole(user, server.roles.puzzler)
  }
}

const puzzleSolvedMessage = (author: Discord.User): Discord.MessageEmbedOptions => {
  return {
    title: `Well done ${author.username}!`,
    description: "You sucessfully solved the puzzle. To claim your reward follow the instructions located [here](https://discord.com/channels/830039917341835295/836205213576724500)"
  }
}

client.on("message", async (message) => {
  const { content, author, channel } = message
  if (author.bot) return // Ignore bot messages

  if (channel.type === "dm" && message.author.id !== "830039282399969290") {
    if (content.length > 256 || content.length < 3) return

    const storedMember = await db.getMemberInfo(author.id)
    if (!storedMember) {
      channel.send("Join the Discord server to participate in giveaways\nhttps://discord.gg/6Y6wEN6MEB")
    } else {
      if (storedMember.initialPuzzleHash) {
        if (sha256(content) === storedMember.initialPuzzleHash) {
          storedMember.puzzlesSolved += 1
          storedMember.initialPuzzleHash = undefined

          db.setMemberInfo(author.id, storedMember)

          try {
            givePuzzlerRole(author, storedMember.puzzlesSolved)

            channel.send(new Discord.MessageEmbed({
              title: "Well done",
              description: "You sucessfully solved the puzzle. To claim your reward follow the directions located [here](https://discord.com/channels/830039917341835295/836205213576724500). You have additionally been granted the `Puzzler` role."
            }))
          } catch (err) {
            channel.send("**Well done**")
            console.error(err)
          }
        }
      } else {
        const ongoingPuzzle = await db.get("ongoing_puzzle")
        if (ongoingPuzzle && !ongoingPuzzle.solvers[author.id] && sha256(content) === ongoingPuzzle.answerHash) {
          storedMember.puzzlesSolved += 1
  
          ongoingPuzzle.solvers[author.id] = true

          if (Object.keys(ongoingPuzzle.solvers).length >= 10) {
            await db.deleteItem("ongoing_puzzle")
          } else {
            await db.set("ongoing_puzzle", ongoingPuzzle)
          }

          await db.setMemberInfo(author.id, storedMember)

          channel.send(
            new Discord.MessageEmbed(puzzleSolvedMessage(author))
          )

          try {
            await givePuzzlerRole(author, storedMember.puzzlesSolved)
          } catch (err) {
            // Ignore error
          }
        }
      }
    }
  } else if (content[0] !== ".") {
    // Ignore messages that don't start with `.`
  } else if (content.toLowerCase() === ".ping") {
    message.channel.send("pong")
  } else if (message.author.id === "830039282399969290") {
    parseSudoCommand(message)
  }
})

client.on("messageReactionAdd", async (reaction, user) => {
  if (user instanceof Discord.User && reaction.message.id === server.messages.acceptRules && reaction.emoji.name === "✅") { // Accept rules
    addMember(user)
  }
})

client.on("messageReactionRemove", async (reaction, user) => {
  if (user instanceof Discord.User && reaction.message.id === server.messages.acceptRules && reaction.emoji.name === "✅") { // Unaccept rules
    removeRole(user, server.roles.member)
  }
})

async function cacheImportantMessages() {
  const guild = await client.guilds.fetch(server.id)
  const rulesChannel = await client.channels.fetch(server.channels.rules) as Discord.TextChannel
  const rulesMessage = await rulesChannel.messages.fetch(server.messages.acceptRules)
}

client.on("ready", async () => {
  await cacheImportantMessages()

  console.log("Discord client is ready")
})

// https://discord.com/oauth2/authorize?client_id=836260039239925860&scope=bot&permissions=8
client.login(process.env.DISCORD_BOT_TOKEN)