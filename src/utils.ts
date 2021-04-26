import * as crypto from "crypto"

export function sha256(msg: string) {
  return crypto.createHash("sha256").update(msg).digest("base64")
}