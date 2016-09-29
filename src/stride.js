'use strict'

const _ = require('lodash')
const Base64 = require('js-base64').Base64
const promisify = require('es6-promisify')
const through2 = require('through2')
const hyperquest = require('hyperquest')
const request = promisify(require('request'), {multiArgs: true})

const defaultOptions = {
  baseURL: 'https://api.stride.io',
  version: 'v1'
}

class Stride {
  constructor (token, options) {
    this.token = token
    this.base64Token = Base64.encode(`${token}:`)
    this.options = _.defaults({}, options, defaultOptions)
  }

  get (url) {
    return this._callAPIMethod('GET', url)
  }

  post (url, data) {
    return this._callAPIMethod('POST', url, data)
  }

  delete (url) {
    return this._callAPIMethod('DELETE', url)
  }

  subscribe (url, optionalCallback) {
    let req = this._hyperquest('GET', url, (err, res) => {
      console.log('err?', err);
      console.log('res?', res);
    })
    let stream = req.pipe(SubscribeObjectTransform)
    stream.destroy = () => req.destroy()
    if (optionalCallback) {
      stream.on('data', (data) => optionalCallback(null, data))
      req.on('error', (res) => optionalCallback(res))
    }
    return stream
  }

  _callAPIMethod (method, url, args) {
    let options = this._getRequestOptions(method, url, args)
    return request(options).then((result) => {
      let message = result[0]
      let response = result[1]
      return {response, status: message.statusCode}
    })
  }

  _request (method, url, args) {
    let options = this._getRequestOptions(method, url, args)
    return request(options)
  }

  _getRequestOptions (method, url, body) {
    return {
      url,
      body,
      method,
      baseUrl: this._getBaseURL(),
      json: true,
      headers: this._getHeaders()
    }
  }

  _hyperquest (method, url, cb) {
    let absoluteURL = this._getBaseURL() + url
    return hyperquest(absoluteURL, this._getHyperquestOptions(method), cb)
  }

  _getHyperquestOptions (method) {
    return {
      method,
      headers: this._getHeaders()
    }
  }

  _getBaseURL () {
    return `${this.options.baseURL}/${this.options.version}`
  }

  _getHeaders () {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Basic ${this.base64Token}`
    }
  }
}

const SubscribeObjectTransform = through2.obj(function (chunk, encoding, callback) {
  let objects = chunk.toString('utf8').trim().split('\r\n')
  for (let obj of objects) {
    if (obj = obj.trim()) {
      obj = JSON.parse(obj)
      if (obj && typeof obj === 'object') this.push(obj)
    }
  }
  callback()
})

module.exports = Stride

// GET https://api.stride.io/v1/collect
// GET https://api.stride.io/v1/collect/commits
// GET https://api.stride.io/v1/collect/commits/subscribe
// POST https://api.stride.io/v1/collect - bulk events for multiple streams
// POST https://api.stride.io/v1/collect/commits
// DELETE https://api.stride.io/v1/collect/commits
//
// GET https://api.stride.io/v1/process
// GET https://api.stride.io/v1/process/users_per_day
// GET https://api.stride.io/v1/process/users_per_day/subscribe
// POST https://api.stride.io/process/users_per_day
// DELETE https://api.stride.io/v1/process/users_per_day
//
// GET https://api.stride.io/analyze/total_commits/results
// GET https://api.stride.io/v1/analyze
// GET https://api.stride.io/v1/analyze/total_commits
// POST https://api.stride.io/analyze
// POST https://api.stride.io/analyze/total_commits
// DELETE https://api.stride.io/v1/process/users_per_day
