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

  describe("validateURLForMethod()", function () {
    function validate (method, url) {
      return stride.validateURLForMethod.bind(stride, method, url)
    }

    it("fails unless one of the 3 endpoints is specified", function () {
      expect(validate('GET', 'collect')).to.throw(/leading slash/)
      expect(validate('GET', '/v1/collect')).to.throw(/omit the version/)
      expect(validate('GET', '/nope')).to.throw(/\/collect.+endpoints are supported/)
      expect(validate('GET', '/collect')).not.to.throw()
      expect(validate('GET', '/process')).not.to.throw()
      expect(validate('GET', '/analyze')).not.to.throw()
    })

    it("allows only URLs supported by the API to pass through", function () {
      expect(validate('GET', '/collect')).not.to.throw()
      expect(validate('GET', '/collect/abc')).not.to.throw()
      expect(validate('GET', '/process')).not.to.throw()
      expect(validate('GET', '/process/abc')).not.to.throw()
      expect(validate('GET', '/analyze')).not.to.throw()
      expect(validate('GET', '/analyze/abc')).not.to.throw()
      expect(validate('GET', '/analyze/abc/results')).not.to.throw()
      expect(validate('GET', '/analyze/abc/results?start_date=something')).not.to.throw()

      expect(validate('POST', '/collect')).not.to.throw()
      expect(validate('POST', '/collect/abc')).not.to.throw()
      expect(validate('POST', '/process/abc')).not.to.throw()
      expect(validate('POST', '/analyze')).not.to.throw()
      expect(validate('POST', '/analyze/abc')).not.to.throw()

      expect(validate('PUT', '/analyze/abc')).not.to.throw()

      expect(validate('DELETE', '/collect')).to.throw(/URL not supported/)
      expect(validate('DELETE', '/collect/abc')).not.to.throw()
      expect(validate('DELETE', '/process/abc')).not.to.throw()

      expect(validate('GET_STREAM', '/collect')).to.throw(/URL not supported/)
      expect(validate('GET_STREAM', '/process')).to.throw(/URL not supported/)
      expect(validate('GET_STREAM', '/collect/a_B_9/subscribe')).not.to.throw()
      expect(validate('GET_STREAM', '/process/a_B_9/subscribe')).not.to.throw()
    })
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

  describe("put()", function () {
    let postData
    beforeEach(function () {
      postData = {my: 'data', turtles: 'yep'}
    })

    it("puts successfully", function () {
      return stride.put('/analyze/success', postData).then((result) => {
        let status = result.status, res = result.response
        expect(status).to.equal(200)
        expect(res.req.body).to.eql(postData)
        expect(res.req.method).to.equal('PUT')
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
