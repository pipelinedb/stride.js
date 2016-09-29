'use strict'

const Stride = require('stride')
const MockServer = require('./mock-server')

describe("Stride.js", function () {
  let server, stride
  beforeEach(function () {
    server = new MockServer()
    server.listen()
    stride = new Stride('aToken', {baseURL: server.getUrl()})
  })

  afterEach(function () {
    server.close()
  })

  describe("get()", function () {
    it("gets a successful response", function () {
      return stride.get('/collect/success').then((result) => {
        let status = result.status, res = result.response
        expect(status).to.equal(200)
        expect(res.req.method).to.equal('GET')
        expect(res.req.headers['accept']).to.equal('application/json')
        expect(res.req.headers['content-type']).to.equal('application/json')
        expect(res.req.headers.authorization).to.equal(`Basic ${stride.base64Token}`)
      })
    })

    it("gets an error response", function () {
      return stride.get('/collect/error').then((result) => {
        let status = result.status, res = result.response
        expect(status).to.equal(400)
        expect(res).to.eql({message: 'bad request'})
      })
    })
  })

  describe("delete()", function () {
    it("deletes successfully", function () {
      return stride.delete('/collect/success').then((result) => {
        let status = result.status, res = result.response
        expect(status).to.equal(200)
        expect(res.req.method).to.equal('DELETE')
        expect(res.req.headers['accept']).to.equal('application/json')
        expect(res.req.headers['content-type']).to.equal('application/json')
        expect(res.req.headers.authorization).to.equal(`Basic ${stride.base64Token}`)
      })
    })

    it("handles an error response", function () {
      return stride.delete('/collect/error').then((result) => {
        let status = result.status, res = result.response
        expect(status).to.equal(400)
        expect(res).to.eql({message: 'bad request'})
      })
    })
  })

  describe("post()", function () {
    let postData
    beforeEach(function () {
      postData = {my: 'data', turtles: 'yep'}
    })

    it("posts successfully", function () {
      return stride.post('/collect/success', postData).then((result) => {
        let status = result.status, res = result.response
        expect(status).to.equal(200)
        expect(res.req.body).to.eql(postData)
        expect(res.req.method).to.equal('POST')
        expect(res.req.headers['accept']).to.equal('application/json')
        expect(res.req.headers['content-type']).to.equal('application/json')
        expect(res.req.headers.authorization).to.equal(`Basic ${stride.base64Token}`)
      })
    })

    it("handles an error response", function () {
      return stride.post('/collect/error').then((result) => {
        let status = result.status, res = result.response
        expect(status).to.equal(400)
        expect(res).to.eql({message: 'bad request'})
      })
    })
  })

  describe("subscribe()", function () {
    it("subscribes to events until the server closes the connection", function (done) {
      stride.subscribe('/collect/success/subscribe').then((result) => {
        let status = result.status, stream = result.stream
        expect(status).to.equal(200)

        let items = []
        stream.on('data', (obj) => items.push(obj))
        stream.on('end', () => {
          expect(items.length).to.be.greaterThan(2)
          expect(items[0]['$timestamp']).to.be.ok
          expect(items[0].repo).to.equal('pipelinedb/pipelinedb')
          done()
        })
      })
    })

    it("can close the connection with stream.destroy()", function (done) {
      stride.subscribe('/collect/success/subscribe').then((result) => {
        let status = result.status, stream = result.stream
        expect(status).to.equal(200)

        let items = []
        stream.on('data', (obj) => {
          items.push(obj)
          stream.destroy()
        })
        stream.on('end', () => {
          expect(items.length).to.equal(2)
          expect(items[0]['$timestamp']).to.be.ok
          expect(items[0].repo).to.equal('pipelinedb/pipelinedb')
          done()
        })
      })
    })

    it("does not return a stream when non-200 status", function () {
      return stride.subscribe('/collect/error/subscribe').then((result) => {
        let status = result.status, stream = result.stream
        expect(status).to.equal(500)
        expect(stream).not.to.be.ok
      })
    })
  })

})
