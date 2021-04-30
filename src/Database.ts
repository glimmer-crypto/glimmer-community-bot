import "./load-env"
import type { Client } from "@replit/database"

const dbClient: Client = new (require("@replit/database"))()
const cache: dbTypes = {}

type dbTypes = {
  "welcome_gift_puzzles"?: Record<string, string>
  "welcome_gifts"?: db.WelcomeGift[]
  "ongoing_puzzle"?: db.PuzzleData
  "members_count"?: number

  [otherKey: string]: unknown
}

export async function get<Key extends keyof dbTypes & string>(key: Key): Promise<dbTypes[Key]> {
  let value = cache[key]
  if (value) {
    return value
  } else {
    value = await dbClient.get(key) as dbTypes[Key]
    cache[key] = value

    if (key.startsWith("members_")) {
      setTimeout(() => cache[key] = undefined, 1_000)
    }
    return value
  }
}

export async function set<Key extends keyof dbTypes & string>(key: Key, value: dbTypes[Key]) {
  cache[key] = value

  if (value === null || value === undefined) {
    await dbClient.delete(key)
  } else {
    await dbClient.set(key, value)
  }
}

export async function setMemberInfo(id: string, value: db.Member) {
  const dbKey = "members_" + id.slice(-3)
  const members = await get(dbKey) as Record<string, db.Member> ?? {}
  members[id.slice(0, -3)] = value
  await set(dbKey, members)
}

export async function getMemberInfo(id: string): Promise<db.Member | null> {
  const members = await get("members_" + id.slice(-3)) as Record<string, db.Member> | null
  return members?.[id.slice(0, -3)] ?? null
}

export async function deleteItem(key: string) {
  cache[key] = null
  await dbClient.delete(key)
}

export async function increment(key: string, amount = 1) {
  const value = await get(key)
  if (!value) {
    await set(key, amount)
    return amount
  } else {
    const newVal = (cache[key] as number) += amount
    await set(key, cache[key])

    return newVal
  }
}

const db = {
  get, set, deleteItem, getMemberInfo, setMemberInfo, increment, client: dbClient
}

namespace db {
  export interface PuzzleData {
    answerHash: string,
    solvers: Record<string, true>
  }
  
  export interface Member {
    puzzlesSolved: number
    initialPuzzleHash?: string
  }

  export interface Wallet {
    publicAddress: string
    privateKey: string
    salt: string,
    iterations: number
  }

  export interface WelcomeGift {
    wallet: Wallet
    amount: number
    passwordHash: string
  }
}

export default db