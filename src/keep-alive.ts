import * as http from "http"

const pingServer = http.createServer((req, res) => {
  res.end("pong")
})
pingServer.listen(3000)