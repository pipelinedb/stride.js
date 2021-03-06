# stride.js

[![CircleCI](https://circleci.com/gh/pipelinedb/stride.js.svg?style=shield)](https://circleci.com/gh/pipelinedb/stride.js)
[![npm version](https://badge.fury.io/js/%40pipelinedb%2Fstride.svg)](https://badge.fury.io/js/%40pipelinedb%2Fstride)

JavaScript client for [Stride](https://www.stride.io/docs)

## Install

```sh
npm install --save @pipelinedb/stride
```

Then in your project, you just need to instantiate a `Stride` instance using one of your [API keys](https://www.stride.io/docs#security):

```js
const Stride = require('@pipelinedb/stride')

let stride = new Stride('my_secret_key')
stride.post('/collect/mydata', {some: 'data', ...}).then(({status, response}) => {
  doStuff()
})
```

# Usage

`stride.js` is a relatively thin wrapper around the [Stride HTTP API](https://www.stride.io/docs). There are only a few main methods: `get`, `post`, `put`, `delete`, `subscribe`. Generally, each method returns a `Promise` and follows the signature:

```js
stride.method(url, [data]).then(({status, [response], [stream]}) => {
  // status: Integer HTTP state
  // response: Object server response (via `get`, `post`, `delete`)
  // stream: Node readable object Stream (via `subscribe()`)
})
```

## get()

* `url` - Endpoint to `GET` from. Must not include the version, i.e. just `/collect`

```js
stride.get('/collect').then(({status, response}) => {
  // status: 200,
  // response: [
  //   "commits",
  //   "pull_requests",
  //   "app_events",
  //   "web_logs"
  // ]
})
```

## post()

* `url` - Endpoint to `POST` to
* `data` - data to post to server

```js
let commit = {
  "$timestamp": "2015-05-05T23:40:27Z",
  "repo": "pipelinedb/pipelinedb",
  "username": "usmanm",
  "sha1": "690e6814144a174d38ff501c5d89bfff5ff8d6de"
}
stride.post('/collect/commits', commit).then(({status, response}) => {
  // status: 200,
  // response: null
})
```

## put()

* `url` - Endpoint to `PUT` to
* `data` - data to post to server

```js
let newQuery = {
  "query": "SELECT * FROM my_process",
}
stride.put('/analyze/a_query_name', newQuery).then(({status, response}) => {
  // status: 200,
  // response: null
})
```

## delete()

* `url` - Endpoint to `DELETE`. Must not include the version, i.e. just `/collect`

```js
stride.delete('/collect/commits').then(({status, response}) => {
  // status: 200,
  // response: null
})
```

## subscribe()

Due to the streaming nature of `subscribe()`, its usage is a little more complex than the other methods.

When the promise resolves, it will give you a `stream`&mdash;a Node [Readable Stream](https://nodejs.org/api/stream.html#stream_readable_streams) which allows you to [pipe](https://nodejs.org/api/stream.html#stream_readable_pipe_destination_options) it to other streams or subscribe [events](https://nodejs.org/api/stream.html#stream_event_data) to retrieve objects.

* `url` - Endpoint to subscribe to. Must not include the version, i.e. just `/collect`

```js
stride.subscribe('/collect/commits/subscribe').then(({status, stream}) => {
  stream.on('data', (obj) => {
    // `stream` is an Object stream, meaning that it will emit JavaScript
    // objects rather than strings. You will get one event per call of this
    // function.
    doSomethingWithTheObject(obj)
  })

  stream.on('error', (err) => {
    // When there is an error
  })

  stream.on('end', () => {
    // When you destroy the stream; the server will never hang up
  })

  // ...
  stream.destroy() // when you're done listening
})
```

You can pipe the stream to other streams, e.g. `stdout`.

```js
const through2 = require('through2')
stride.subscribe('/collect/commits/subscribe').then(({status, stream}) => {
  stream
    .pipe(through2.obj(function (chunk, enc, callback) {
      this.push(JSON.stringify(chunk, null, '  ') + '\n')
      callback()
    }))
    .pipe(process.stdout)
})
```

If the server returns any status code other than 200, `stream` will be `null`:

```js
stride.subscribe('/collect/commits/subscribe').then(({status, stream}) => {
  // status: 404
  // stream: null
})
```
