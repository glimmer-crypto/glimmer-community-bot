import * as crypto from "crypto"

export function sha256(msg: string) {
  return crypto.createHash("sha256").update(msg).digest("base64")
}

const glimmer = {
  CoinTable: {
    SUBDIVISION: 10000000
  }
}

export function amountFromString(string) {
  const split = string.split(".")
  const major = parseInt(split[0]) * glimmer.CoinTable.SUBDIVISION
  if (split.length === 1) {
    return major
  }

  let minorStr = split[1]
  const decimals = Math.floor(Math.log10(glimmer.CoinTable.SUBDIVISION))
  while (minorStr.length < decimals) {
    minorStr += "0"
  }

  const minor = parseInt(minorStr)
  return major + minor
}

export function amountString(amount) {
  if (isNaN(amount) || amount === null) { return 0 }

  const major = Math.floor(amount / glimmer.CoinTable.SUBDIVISION).toLocaleString()
  let minor = (amount % glimmer.CoinTable.SUBDIVISION).toString()

  if (minor == "0") { return major }

  const decimals = Math.floor(Math.log10(glimmer.CoinTable.SUBDIVISION))
  while (minor.length < decimals) {
    minor = "0" + minor
  }
  while (minor.endsWith("0")) {
    minor = minor.slice(0, -1)
  }

  return major + "." + minor
}

export function ordinalNumber(num: number): string {
  let ordinalSuffix = "th"
  const lastTwoDigits = num % 100
  if (lastTwoDigits < 10 || lastTwoDigits > 20) {
    const lastDigit = num % 10
    if (lastDigit === 1) {
      ordinalSuffix = "st"
    } else if (lastDigit === 2) {
      ordinalSuffix = "nd"
    } else if (lastDigit === 3) {
      ordinalSuffix = "rd"
    }
  }

  return num.toLocaleString() + ordinalSuffix
}