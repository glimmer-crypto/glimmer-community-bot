import type { Client } from "@replit/database"

const dbClient: Client = new (require("@replit/database"))()
const cache: Record<string, unknown> = {}

interface PuzzleData {
  answerHash: string
}

interface StoredMember {
  puzzlesSolved: number
  initialPuzzleHash?: string
}

export async function get(key: "ongoing_puzzle"): Promise<PuzzleData | null>
export async function get(key: string): Promise<Record<string, StoredMember>>
export async function get(key: string): Promise<unknown> {
  let value = cache[key]
  if (value) {
    return value
  } else {
    value = await dbClient.get(key)
    cache[key] = value

    if (key.startsWith("members_")) {
      setTimeout(() => cache[key] = undefined, 1_000)
    }
    return value
  }
}

export async function set(key: "ongoing_puzzle", value: PuzzleData): Promise<void>
export async function set(key: string, value: any): Promise<void>
export async function set(key: string, value: any) {
  cache[key] = value
  
  if (value === null || value === undefined) {
    await dbClient.delete(key)
  } else {
    await dbClient.set(key, value)
  }
}

export async function setMemberInfo(id: string, value: StoredMember) {
  const dbKey = "member_" + id.slice(0, 3)
  const members = await get(dbKey)
  members[id.slice(3, 0)] = value
  await set(dbKey, members)
}

export async function getMemberInfo(id: string): Promise<StoredMember | null> {
  const members = await get("member_" + id.slice(0, 3))
  return members[id.slice(3, 0)]
}

export async function deleteItem(key: string) {
  cache[key] = null
  await dbClient.delete(key)
}

const db = {
  get, set, deleteItem, getMemberInfo, setMemberInfo
}

export default db