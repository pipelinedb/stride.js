'use strict'

const http = require('http')

module.exports = class MockServer {
  constructor () {
    this.port = 18181
    this.server = http.createServer(this.handleRequest.bind(this))
  }

  getUrl () {
    return `http://localhost:${this.port}`
  }

  listen () {
    this.server.listen(this.port)
  }

  close (callback) {
    this.server.close(callback)
  }

  handleRequest (req, res) {
    // Check out this micro webframework. Next big thing, I can feel it.
    return Routes[req.url](req, res)
  }
}

let Routes = {
  '/v1/collect/success': function (req, res) {
    getBody(req).then((body) => {
      // Pass request things back so the tests can verify them
      let out = {status: 'ok', req: {
        body,
        method: req.method,
        headers: req.headers
      }}
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(`${JSON.stringify(out)}\n`)
    })
  },

  '/v1/collect/error': function (req, res) {
    let out = {message: 'bad request'}
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(`${JSON.stringify(out)}\n`)
  },

  '/v1/collect/success/subscribe': function (req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
    let interval = setInterval(() => {
      try {
        res.write(`${generateEvent()}\r\n${generateEvent()}\r\n`)
      } catch (e) {
        clearInterval(interval)
      }
    }, 10)
    setTimeout(() => {
      clearInterval(interval)
      res.end(`\n`)
    }, 100)
  },

  '/v1/collect/error/subscribe': function (req, res) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(`\n`)
  },

  '/v1/analyze/success': function (req, res) {
    getBody(req).then((body) => {
      // Pass request things back so the tests can verify them
      let out = {status: 'ok', req: {
        body,
        method: req.method,
        headers: req.headers
      }}
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
      res.end(`${JSON.stringify(out)}\n`)
    })
  },

  '/v1/analyze/error': function (req, res) {
    let out = {message: 'bad request'}
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
    res.end(`${JSON.stringify(out)}\n`)
  }
}

function getBody (req) {
  return new Promise(function (resolve) {
    let body = []
    req
      .on('data', (chunk) => body.push(chunk))
      .on('end', () => {
        body = Buffer.concat(body).toString().trim()
        body = body ? JSON.parse(body) : null
        resolve(body)
      })
  })
}

function generateEvent () {
  return JSON.stringify({
    "$timestamp": new Date().getTime(),
    "repo": "pipelinedb/pipelinedb",
  }, null, '  ')
}
