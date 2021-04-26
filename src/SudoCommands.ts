import * as Discord from "discord.js"

import { sha256 } from "./utils"
import db from "./Database"

interface Commands {
  [name: string]: (parameters: string, message: Discord.Message) => Promise<Discord.MessageEmbedOptions | string>
}

const SudoCommands: Commands = {
  async setpuzzle(answer) {
    if (!answer) {
      return "You must enter the new answer after `.setpuzzle`"
    }

    const ongoingPuzzle = await db.get("ongoing_puzzle")
    if (ongoingPuzzle) {
      return "There is already an ongoing puzzle, use `.clearpuzzle` first"
    } else {
      db.set("ongoing_puzzle", {
        answerHash: sha256(answer)
      })
      return "A new puzzle has been set up"
    }
  },
  async clearpuzzle() {
    db.deleteItem("ongoing_puzzle")
    return "Cleared the ongoing puzzle"
  }
}

export default async function parseSudoCommand(message: Discord.Message) {
  const { content } = message
  let split = content.slice(1).split(" ")
  const commandName = split[0]
  const command = SudoCommands[commandName]

  const response = await command(content.slice(commandName.length + 2), message)
  message.channel.send(response)
}