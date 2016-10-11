'use strict'

const _ = require('lodash')
const Base64 = require('js-base64').Base64
const promisify = require('es6-promisify')
const through2 = require('through2')
const hyperquest = require('hyperquest')
const request = promisify(require('request'), {multiArgs: true})
const version = require('root-require')('package.json').version

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

  put (url, data) {
    return this._callAPIMethod('PUT', url, data)
  }

  delete (url) {
    return this._callAPIMethod('DELETE', url)
  }

  subscribe (url) {
    const self = this
    this.validateURLForMethod('GET_STREAM', url)
    return new Promise(function (resolve) {
      let req, stream
      req = self._hyperquest('GET', url, (err, message) => {
        let status = message.statusCode, stream = null
        if (status === 200) {
          stream = req.pipe(SubscribeObjectTransform())
          let streamDestroy = stream.destroy.bind(stream)
          stream.destroy = () => req.destroy()
        }
        resolve({status, stream})
      })
    })
  }

  validateURLForMethod (method, url) {
    let error = validateURLForMethod(method, url)
    if (error) throw new Error(`URL ${url} malformed: ${error}`)
  }

  _callAPIMethod (method, url, args) {
    this.validateURLForMethod(method, url)
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
      'User-Agent': `stride.js (version: ${version})`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Basic ${this.base64Token}`
    }
  }
}

function SubscribeObjectTransform() {
  return through2.obj(function (chunk, encoding, callback) {
    let objects = chunk.toString('utf8').trim().split('\r\n')
    for (let obj of objects) {
      if (obj = obj.trim()) {
        obj = JSON.parse(obj)
        if (obj && typeof obj === 'object') this.push(obj)
      }
    }
    callback()
  })
}

function validateURLForMethod (method, url) {
  url = url.split('?')[0]
  let error = validateURL(url)
  if (error) return error

  let supported = false
  let patterns = SupportedURLPatterns[method]
  for (let pattern of patterns) {
    if (pattern.test(url)) supported = true
  }
  if (!supported) return `URL not supported for the ${method} method`

  return null
}

function validateURL (url) {
  for (var key in ValidationRegExps) {
    if (!ValidationRegExps[key].test(url)) return ValidationMessages[key]
  }
  return null
}

const ValidationRegExps = {
  hasLeadingSlash: /^\//,
  missingVersionNumber: /^\/[^v]/,
  isValidEndpoint: /^(\/collect|\/process|\/analyze)/,
}

const ValidationMessages = {
  hasLeadingSlash: 'Endpoints should have leading slash. e.g. `/collect`',
  missingVersionNumber: 'Please omit the version number. e.g. `/collect`',
  isValidEndpoint: 'Only the `/collect`, `/process`, and `/analyze` endpoints are supported',
}

const SupportedURLPatterns = {
  GET: [
    /^\/collect$/,
    /^\/collect\/[a-zA-Z]\w*$/,
    /^\/process$/,
    /^\/process\/[a-zA-Z]\w*$/,
    /^\/process\/[a-zA-Z]\w*\/stats$/,
    /^\/analyze$/,
    /^\/analyze\/[a-zA-Z]\w*$/,
    /^\/analyze\/[a-zA-Z]\w*\/results$/
  ],
  POST: [
    /^\/collect$/,
    /^\/collect\/[a-zA-Z]\w*$/,
    /^\/process\/[a-zA-Z]\w*$/,
    /^\/analyze$/,
    /^\/analyze\/[a-zA-Z]\w*$/
  ],
  PUT: [
    /^\/analyze\/[a-zA-Z]\w*$/
  ],
  DELETE: [
    /^\/collect\/[a-zA-Z]\w*$/,
    /^\/process\/[a-zA-Z]\w*$/,
    /^\/analyze\/[a-zA-Z]\w*$/
  ],
  GET_STREAM: [
    /^\/collect\/[a-zA-Z]\w*\/subscribe$/,
    /^\/process\/[a-zA-Z]\w*\/subscribe$/
  ]
}

module.exports = Stride
