import * as Discord from "discord.js"

import { sha256, amountFromString } from "./utils"
import db from "./Database"
import WelcomeGift from "./WelcomeGift"

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
        answerHash: sha256(answer),
        solvers: {}
      })
      return "A new puzzle has been set up"
    }
  },
  async clearpuzzle() {
    db.deleteItem("ongoing_puzzle")
    return "Cleared the ongoing puzzle"
  },

  async addgiftpuzzle(puzzleData) {
    const split = puzzleData.split(';')
    if (split.length < 2) return "`.addgiftpuzzle` command must be formatted like `[puzzle]; [password]`"

    await WelcomeGift.addPuzzle(split[0], split[1].trim())
    return "The puzzle has been added"
  },
  async deletegiftpuzzle(answer) {
    const puzzles = await db.get("welcome_gift_puzzles")
    if (!puzzles) {
      return "No puzzles are defined, use `.addgiftpuzzle` to create one"
    }

    if (puzzles[answer]) {
      delete puzzles[answer]
    } else {
      const answerHash = sha256(answer)
      if (puzzles[answerHash]) {
        delete puzzles[answerHash]
      } else {
        return "No puzzles matched that answer/hash"
      }
    }

    await db.set("welcome_gift_puzzles", puzzles)
    return "Deleted puzzle"
  },
  async addgiftwallet(walletData) {
    const split = walletData.split(';')
    if (split.length < 3) return "`.addgiftwallet` command must be formatted like `[wallet JSON]; [password]; [amount]`"

    try {
      const amount = amountFromString(split[2])
      if (isNaN(amount)) {
        return "Amount specified is invalid"
      }

      let wallet = JSON.parse(split[0])
      if (!wallet.salt || !wallet.iterations || !wallet.publicAddress || !wallet.privateKey) {
        return "Wallet data must be an encrypted wallet's JSON object"
      }
      wallet = {
        salt: wallet.salt,
        publicAddress: wallet.publicAddress,
        privateKey: wallet.privateKey,
        iterations: wallet.iterations
      }
      
      const added = await WelcomeGift.addWallet(wallet, split[1].trim(), amount)
      if (added) {
        return "Added a gift wallet: `" + wallet.publicAddress + "`"
      } else {
        return "No puzzles found with the specified password"
      }
    } catch (err) {
      return "Invalid wallet data `" + err.message + "`"
    }
  },

  async dump() {
    const all = await db.client.getAll()
    return "```\n" + JSON.stringify(all, null, 2) + "\n```"
  },
  // async deletealldata() {
  //   await db.client.empty()
  //   return "All data has been cleared"
  // }
}

export default async function parseSudoCommand(message: Discord.Message) {
  const { content } = message
  let split = content.slice(1).split(" ")
  const commandName = split[0]
  const command = SudoCommands[commandName]

  if (!command) { return }
  const response = await command(content.slice(commandName.length + 2), message)
  message.channel.send(response)
}