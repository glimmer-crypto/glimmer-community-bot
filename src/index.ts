import "./load-env"
import "./keep-alive"

import * as Discord from "discord.js"

const client = new Discord.Client()

client.on("ready", () => {
  console.log("Discord client is ready")
})

client.on("message", (message) => {
  if (message.content.toLowerCase() === "ping") {
    message.channel.send("pong")
  }
})