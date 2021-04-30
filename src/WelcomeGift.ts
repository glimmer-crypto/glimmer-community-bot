import db from "./Database"
import { sha256 } from "./utils"

const WelcomeGift = {
  async addPuzzle(puzzle: string, answer: string) {
    const puzzles = await db.get("welcome_gift_puzzles") ?? {}
    const answerHash = sha256(answer)
    if (puzzle[answerHash] === puzzle) { return }

    puzzles[answerHash] = puzzle
    await db.set("welcome_gift_puzzles", puzzles)
  },
  async getPuzzle(gift: db.WelcomeGift): Promise<string | null> {
    const puzzles = await db.get("welcome_gift_puzzles") ?? {}
    return puzzles[gift.passwordHash]
  },
  async addWallet(wallet: db.Wallet, password: string, amount: number) {
    const passwordHash = sha256(password)
    const puzzles = await db.get("welcome_gift_puzzles") ?? {}
    if (!puzzles[passwordHash]) {
      return false
    }

    const gifts = await db.get("welcome_gifts") ?? []
    gifts.push({
      wallet,
      passwordHash,
      amount
    })
    await db.set("welcome_gifts", gifts)

    return true
  },
  async shiftWallet(): Promise<db.WelcomeGift | null> {
    const gifts = await db.get("welcome_gifts")
    if (!gifts || !gifts.length) { return null }

    const gift = gifts.shift() ?? null
    await db.set("welcome_gifts", gifts)

    return gift
  }
}

export default WelcomeGift