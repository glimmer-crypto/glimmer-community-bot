import "./load-env"
import "./keep-alive"

import * as Discord from "discord.js"

import db from "./Database"
import parseSudoCommand from "./SudoCommands"
import { sha256 } from "./utils"

const client = new Discord.Client()

client.on("guildMemberAdd", async (member) => {
  const dm = await member.createDM()
  console.log("New member", member)

  const storedMember = await db.getMemberInfo(member.id)

  if (!storedMember) { // We have a new member!
    dm.send(
      new Discord.MessageEmbed(welcomeMessage(member))
    )

    db.setMemberInfo(member.id, {
      puzzlesSolved: 0
    })
  }
})

const welcomeMessage = (member: Discord.GuildMember): Discord.MessageEmbedOptions => {
  return {
    title: `Welcome to the Glimmer Community ${member.displayName}`,
    description: "You will be rewarded for your efforts. [More information](https://discord.com/channels/830039917341835295/836205213576724500)"
  }
}


client.on("message", async (message) => {
  const { content, author, channel } = message
  if (author.bot) return // Ignore bot messages

  if (channel.type === "dm") {
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

          const server = await client.guilds.fetch("830039917341835295")
          const member = await server.members.fetch(author)
          const puzzlerRole = await server.roles.fetch("836205423455371295")

          if (member && puzzlerRole) {
            member.roles.add(puzzlerRole)
          } else {
            console.log("Member", member)
            console.log("Role", puzzlerRole)
          }
        }
      } else {
        const ongoingPuzzle = await db.get("ongoing_puzzle")
        if (ongoingPuzzle && sha256(content) === ongoingPuzzle.answerHash) {
          storedMember.puzzlesSolved += 1
  
          await db.deleteItem("ongoing_puzzle")
          await db.setMemberInfo(author.id, storedMember)
          
          channel.send(
            new Discord.MessageEmbed(puzzleSolvedMessage(author))
          )
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

const puzzleSolvedMessage = (author: Discord.User): Discord.MessageEmbedOptions => {
  return {
    title: `Well done ${author.username}!`,
    description: "You sucessfully solved the puzzle. To claim your reward follow the directions located [here](https://discord.com/channels/830039917341835295/836205213576724500)"
  }
}


client.on("ready", async () => {
  console.log("Discord client is ready")
})

// https://discord.com/oauth2/authorize?client_id=836260039239925860&scope=bot&permissions=8
client.login(process.env.DISCORD_BOT_TOKEN)