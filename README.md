<div align="center">
	<img src="docs/media/Banner.svg" alt="Node Fetch"/>
	<br>
	<p>A light-weight module that brings <a href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API">Fetch API</a> to Node.js.</p>
	<a href="https://github.com/node-fetch/node-fetch/actions"><img src="https://github.com/node-fetch/node-fetch/workflows/CI/badge.svg?branch=master" alt="Build status"></a>
	<a href="https://coveralls.io/github/node-fetch/node-fetch"><img src="https://img.shields.io/coveralls/github/node-fetch/node-fetch" alt="Coverage status"></a>
	<a href="https://packagephobia.now.sh/result?p=node-fetch"><img src="https://badgen.net/packagephobia/install/node-fetch" alt="Current version"></a>
	<a href="https://www.npmjs.com/package/node-fetch"><img src="https://img.shields.io/npm/v/node-fetch" alt="Install size"></a>
	<a href="https://github.com/sindresorhus/awesome-nodejs"><img src="https://awesome.re/mentioned-badge.svg" alt="Mentioned in Awesome Node.js"></a>
	<a href="https://discord.gg/Zxbndcm"><img src="https://img.shields.io/discord/619915844268326952?color=%237289DA&label=Discord" alt="Discord"></a>
	<br>
	<br>
	<b>Consider supporting us on our Open Collective:</b>
	<br>
	<br>
	<a href="https://opencollective.com/node-fetch"><img src="https://opencollective.com/node-fetch/donate/button.png?color=blue" alt="Open Collective"></a>
</div>

---

**You might be looking for the [v2 docs](https://github.com/node-fetch/node-fetch/tree/2.x#readme)**

<!-- TOC -->

- [Motivation](#motivation)
- [Features](#features)
- [Difference from client-side fetch](#difference-from-client-side-fetch)
- [Installation](#installation)
- [Loading and configuring the module](#loading-and-configuring-the-module)
- [Upgrading](#upgrading)
- [Common Usage](#common-usage)
	- [Plain text or HTML](#plain-text-or-html)
	- [JSON](#json)
	- [Simple Post](#simple-post)
	- [Post with JSON](#post-with-json)
	- [Post with form parameters](#post-with-form-parameters)
	- [Handling exceptions](#handling-exceptions)
	- [Handling client and server errors](#handling-client-and-server-errors)
	- [Handling cookies](#handling-cookies)
- [Advanced Usage](#advanced-usage)
	- [Streams](#streams)
	- [Buffer](#buffer)
	- [Accessing Headers and other Meta data](#accessing-headers-and-other-meta-data)
	- [Extract Set-Cookie Header](#extract-set-cookie-header)
	- [Post data using a file stream](#post-data-using-a-file-stream)
	- [Post with form-data (detect multipart)](#post-with-form-data-detect-multipart)
	- [Request cancellation with AbortSignal](#request-cancellation-with-abortsignal)
- [API](#api)
	- [fetch(url[, options])](#fetchurl-options)
	- [Options](#options)
		- [Default Headers](#default-headers)
		- [Custom Agent](#custom-agent)
		- [Custom highWaterMark](#custom-highwatermark)
		- [Insecure HTTP Parser](#insecure-http-parser)
	- [Class: Request](#class-request)
		- [new Request(input[, options])](#new-requestinput-options)
	- [Class: Response](#class-response)
		- [new Response([body[, options]])](#new-responsebody-options)
		- [response.ok](#responseok)
		- [response.redirected](#responseredirected)
		- [response.type](#responsetype)
	- [Class: Headers](#class-headers)
		- [new Headers([init])](#new-headersinit)
	- [Interface: Body](#interface-body)
		- [body.body](#bodybody)
		- [body.bodyUsed](#bodybodyused)
		- [body.arrayBuffer()](#bodyarraybuffer)
		- [body.blob()](#bodyblob)
		- [body.json()](#bodyjson)
		- [body.text()](#bodytext)
		- [body.buffer()](#bodybuffer)
	- [Class: FetchError](#class-fetcherror)
	- [Class: AbortError](#class-aborterror)
- [TypeScript](#typescript)
- [Acknowledgement](#acknowledgement)
- [Team](#team)
				- [Former](#former)
- [License](#license)

<!-- /TOC -->

## Motivation

Instead of implementing `XMLHttpRequest` in Node.js to run browser-specific [Fetch polyfill](https://github.com/github/fetch), why not go from native `http` to `fetch` API directly? Hence, `node-fetch`, minimal code for a `window.fetch` compatible API on Node.js runtime.

See Jason Miller's [isomorphic-unfetch](https://www.npmjs.com/package/isomorphic-unfetch) or Leonardo Quixada's [cross-fetch](https://github.com/lquixada/cross-fetch) for isomorphic usage (exports `node-fetch` for server-side, `whatwg-fetch` for client-side).

## Features

- Stay consistent with `window.fetch` API.
- Make conscious trade-off when following [WHATWG fetch spec][whatwg-fetch] and [stream spec](https://streams.spec.whatwg.org/) implementation details, document known differences.
- Use native promise and async functions.
- Use native Node streams for body, on both request and response.
- Decode content encoding (gzip/deflate/brotli) properly, and convert string output (such as `res.text()` and `res.json()`) to UTF-8 automatically.
- Useful extensions such as redirect limit, response size limit, [explicit errors][error-handling.md] for troubleshooting.

## Difference from client-side fetch

- See known differences:
	- [As of v3.x](docs/v3-LIMITS.md)
	- [As of v2.x](docs/v2-LIMITS.md)
- If you happen to use a missing feature that `window.fetch` offers, feel free to open an issue.
- Pull requests are welcomed too!

## Installation

Current stable release (`3.x`)

```sh
npm install node-fetch
```

## Loading and configuring the module

```js
// CommonJS
const fetch = require('node-fetch');

// ES Module
import fetch from 'node-fetch';
```

If you want to patch the global object in node:

```js
const fetch = require('node-fetch');

if (!globalThis.fetch) {
	globalThis.fetch = fetch;
}
```

For versions of Node earlier than 12, use this `globalThis` [polyfill](https://mathiasbynens.be/notes/globalthis).

## Upgrading

Using an old version of node-fetch? Check out the following files:

- [2.x to 3.x upgrade guide](docs/v3-UPGRADE-GUIDE.md)
- [1.x to 2.x upgrade guide](docs/v2-UPGRADE-GUIDE.md)
- [Changelog](docs/CHANGELOG.md)

## Common Usage

NOTE: The documentation below is up-to-date with `3.x` releases, if you are using an older version, please check how to [upgrade](#upgrading).

### Plain text or HTML

```js
const fetch = require('node-fetch');

const response = await fetch('https://github.com/');
const body = await response.text();

console.log(body);
```

### JSON

```js
const fetch = require('node-fetch');

const response = await fetch('https://api.github.com/users/github');
const data = await response.json();

console.log(data);
```

### Simple Post

```js
const fetch = require('node-fetch');

const response = await fetch('https://httpbin.org/post', {method: 'POST', body: 'a=1'});
const data = await response.json();

console.log(data);
```

### Post with JSON

```js
const fetch = require('node-fetch');

const body = {a: 1};

const response = await fetch('https://httpbin.org/post', {
	method: 'post',
	body: JSON.stringify(body),
	headers: {'Content-Type': 'application/json'}
});
const data = await response.json();

console.log(data);
```

### Post with form parameters

`URLSearchParams` is available on the global object in Node.js as of v10.0.0. See [official documentation](https://nodejs.org/api/url.html#url_class_urlsearchparams) for more usage methods.

NOTE: The `Content-Type` header is only set automatically to `x-www-form-urlencoded` when an instance of `URLSearchParams` is given as such:

```js
const fetch = require('node-fetch');

const params = new URLSearchParams();
params.append('a', 1);

const response = await fetch('https://httpbin.org/post', {method: 'POST', body: params});
const data = await response.json();

console.log(data);
```

### Handling exceptions

NOTE: 3xx-5xx responses are _NOT_ exceptions, and should be handled in `then()`, see the next section.

Wrapping the fetch function into a `try/catch` block will catch _all_ exceptions, such as errors originating from node core libraries, like network errors, and operational errors which are instances of FetchError. See the [error handling document][error-handling.md] for more details.

```js
const fetch = require('node-fetch');

try {
	await fetch('https://domain.invalid/');
} catch (error) {
	console.log(error);
}
```

### Handling client and server errors

It is common to create a helper function to check that the response contains no client (4xx) or server (5xx) error responses:

```js
const fetch = require('node-fetch');

class HTTPResponseError extends Error {
	constructor(response, ...args) {
		this.response = response;
		super(`HTTP Error Response: ${response.status} ${response.statusText}`, ...args);
	}
}

const checkStatus = response => {
	if (response.ok) {
		// response.status >= 200 && response.status < 300
		return response;
	} else {
		throw new HTTPResponseError(response);
	}
}

const response = await fetch('https://httpbin.org/status/400');

try {
	checkStatus(response);
} catch (error) {
	console.error(error);

	const errorBody = await error.response.text();
	console.error(`Error body: ${errorBody}`);
}
```

### Handling cookies

Cookies are not stored by default. However, cookies can be extracted and passed by manipulating request and response headers. See [Extract Set-Cookie Header](#extract-set-cookie-header) for details.

## Advanced Usage

### Streams

The "Node.js way" is to use streams when possible. You can pipe `res.body` to another stream. This example uses [stream.pipeline](https://nodejs.org/api/stream.html#stream_stream_pipeline_streams_callback) to attach stream error handlers and wait for the download to complete.

```js
const {createWriteStream} = require('fs');
const {pipeline} = require('stream');
const {promisify} = require('util');
const fetch = require('node-fetch');

const streamPipeline = promisify(pipeline);

const response = await fetch('https://assets-cdn.github.com/images/modules/logos_page/Octocat.png');

if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);

await streamPipeline(response.body, createWriteStream('./octocat.png'));
```

In Node.js 14 you can also use async iterators to read `body`; however, be careful to catch
errors -- the longer a response runs, the more likely it is to encounter an error.

```js
const fetch = require('node-fetch');

const response = await fetch('https://httpbin.org/stream/3');

try {
	for await (const chunk of response.body) {
		console.dir(JSON.parse(chunk.toString()));
	}
} catch (err) {
	console.error(err.stack);
}
```

In Node.js 12 you can also use async iterators to read `body`; however, async iterators with streams
did not mature until Node.js 14, so you need to do some extra work to ensure you handle errors
directly from the stream and wait on it response to fully close.

```js
const fetch = require('node-fetch');

const read = async body => {
	let error;
	body.on('error', err => {
		error = err;
	});

	for await (const chunk of body) {
		console.dir(JSON.parse(chunk.toString()));
	}

	return new Promise((resolve, reject) => {
		body.on('close', () => {
			error ? reject(error) : resolve();
		});
	});
};

try {
	const response = await fetch('https://httpbin.org/stream/3');
	await read(response.body);
} catch (err) {
	console.error(err.stack);
}
```

### Buffer

If you prefer to cache binary data in full, use buffer(). (NOTE: buffer() is a `node-fetch` only API)

```js
const fetch = require('node-fetch');
const fileType = require('file-type');

const response = await fetch('https://octodex.github.com/images/Fintechtocat.png');
const buffer = await response.buffer();
const type = await fileType.fromBuffer(buffer)

console.log(type);
```

### Accessing Headers and other Meta data

```js
const fetch = require('node-fetch');

const response = await fetch('https://github.com/');

console.log(response.ok);
console.log(response.status);
console.log(response.statusText);
console.log(response.headers.raw());
console.log(response.headers.get('content-type'));
```

### Extract Set-Cookie Header

Unlike browsers, you can access raw `Set-Cookie` headers manually using `Headers.raw()`. This is a `node-fetch` only API.

```js
const fetch = require('node-fetch');

const response = await fetch('https://example.com');

// Returns an array of values, instead of a string of comma-separated values
console.log(response.headers.raw()['set-cookie']);
```

### Post data using a file stream

```js
const {createReadStream} = require('fs');
const fetch = require('node-fetch');

const stream = createReadStream('input.txt');

const response = await fetch('https://httpbin.org/post', {method: 'POST', body: stream});
const data = await response.json();

console.log(data)
```

### Post with form-data (detect multipart)

```js
const fetch = require('node-fetch');
const FormData = require('form-data');

const form = new FormData();
form.append('a', 1);

const response = await fetch('https://httpbin.org/post', {method: 'POST', body: form});
const data = await response.json();

console.log(data)

// OR, using custom headers
// NOTE: getHeaders() is non-standard API

const options = {
	method: 'POST',
	body: form,
	headers: form.getHeaders()
};

const response = await fetch('https://httpbin.org/post', options);
const data = await response.json();

console.log(data)
```

node-fetch also supports spec-compliant FormData implementations such as [form-data](https://github.com/form-data/form-data) and [formdata-node](https://github.com/octet-stream/form-data):

```js
const fetch = require('node-fetch');
const FormData = require('formdata-node');

const form = new FormData();
form.set('greeting', 'Hello, world!');

const response = await fetch('https://httpbin.org/post', {method: 'POST', body: form});
const data = await response.json();

console.log(data);
```

### Request cancellation with AbortSignal

You may cancel requests with `AbortController`. A suggested implementation is [`abort-controller`](https://www.npmjs.com/package/abort-controller).

An example of timing out a request after 150ms could be achieved as the following:

```js
const fetch = require('node-fetch');
const AbortController = require('abort-controller');

const controller = new AbortController();
const timeout = setTimeout(() => {
	controller.abort();
}, 150);

try {
	const response = await fetch('https://example.com', {signal: controller.signal});
	const data = await response.json();
} catch (error) {
	if (error instanceof fetch.AbortError) {
		console.log('request was aborted');
	}
} finally {
	clearTimeout(timeout);
}
```

See [test cases](https://github.com/node-fetch/node-fetch/blob/master/test/) for more examples.

## API

### fetch(url[, options])

- `url` A string representing the URL for fetching
- `options` [Options](#fetch-options) for the HTTP(S) request
- Returns: <code>Promise&lt;[Response](#class-response)&gt;</code>

Perform an HTTP(S) fetch.

`url` should be an absolute url, such as `https://example.com/`. A path-relative URL (`/file/under/root`) or protocol-relative URL (`//can-be-http-or-https.com/`) will result in a rejected `Promise`.

<a id="fetch-options"></a>

### Options

The default values are shown after each option key.

```js
{
	// These properties are part of the Fetch Standard
	method: 'GET',
	headers: {},            // Request headers. format is the identical to that accepted by the Headers constructor (see below)
	body: null,             // Request body. can be null, a string, a Buffer, a Blob, or a Node.js Readable stream
	redirect: 'follow',     // Set to `manual` to extract redirect headers, `error` to reject redirect
	signal: null,           // Pass an instance of AbortSignal to optionally abort requests

	// The following properties are node-fetch extensions
	follow: 20,             // maximum redirect count. 0 to not follow redirect
	compress: true,         // support gzip/deflate content encoding. false to disable
	size: 0,                // maximum response body size in bytes. 0 to disable
	agent: null,            // http(s).Agent instance or function that returns an instance (see below)
	highWaterMark: 16384,   // the maximum number of bytes to store in the internal buffer before ceasing to read from the underlying resource.
	insecureHTTPParser: false	// Use an insecure HTTP parser that accepts invalid HTTP headers when `true`.
}
```

#### Default Headers

If no values are set, the following request headers will be sent automatically:

| Header              | Value                                                  |
| ------------------- | ------------------------------------------------------ |
| `Accept-Encoding`   | `gzip,deflate,br` _(when `options.compress === true`)_ |
| `Accept`            | `*/*`                                                  |
| `Connection`        | `close` _(when no `options.agent` is present)_         |
| `Content-Length`    | _(automatically calculated, if possible)_              |
| `Transfer-Encoding` | `chunked` _(when `req.body` is a stream)_              |
| `User-Agent`        | `node-fetch`                                           |


Note: when `body` is a `Stream`, `Content-Length` is not set automatically.

#### Custom Agent

The `agent` option allows you to specify networking related options which are out of the scope of Fetch, including and not limited to the following:

- Support self-signed certificate
- Use only IPv4 or IPv6
- Custom DNS Lookup

See [`http.Agent`](https://nodejs.org/api/http.html#http_new_agent_options) for more information.

In addition, the `agent` option accepts a function that returns `http`(s)`.Agent` instance given current [URL](https://nodejs.org/api/url.html), this is useful during a redirection chain across HTTP and HTTPS protocol.

```js
const http = require('http');
const https = require('https');

const httpAgent = new http.Agent({
	keepAlive: true
});
const httpsAgent = new https.Agent({
	keepAlive: true
});

const options = {
	agent: function(_parsedURL) {
		if (_parsedURL.protocol == 'http:') {
			return httpAgent;
		} else {
			return httpsAgent;
		}
	}
};
```

<a id="custom-highWaterMark"></a>

#### Custom highWaterMark

Stream on Node.js have a smaller internal buffer size (16kB, aka `highWaterMark`) from client-side browsers (>1MB, not consistent across browsers). Because of that, when you are writing an isomorphic app and using `res.clone()`, it will hang with large response in Node.

The recommended way to fix this problem is to resolve cloned response in parallel:

```js
const fetch = require('node-fetch');

const response = await fetch('https://example.com');
const r1 = await response.clone();

const results = await Promise.all([response.json(), r1.text()]);

console.log(results[0]);
console.log(results[1]);
```

If for some reason you don't like the solution above, since `3.x` you are able to modify the `highWaterMark` option:

```js
const fetch = require('node-fetch');

const response = await fetch('https://example.com', {
	// About 1MB
	highWaterMark: 1024 * 1024
});

const result = await res.clone().buffer();
console.dir(result);
```

#### Insecure HTTP Parser

Passed through to the `insecureHTTPParser` option on http(s).request. See [`http.request`](https://nodejs.org/api/http.html#http_http_request_url_options_callback) for more information.


<a id="class-request"></a>

### Class: Request

An HTTP(S) request containing information about URL, method, headers, and the body. This class implements the [Body](#iface-body) interface.

Due to the nature of Node.js, the following properties are not implemented at this moment:

- `type`
- `destination`
- `referrer`
- `referrerPolicy`
- `mode`
- `credentials`
- `cache`
- `integrity`
- `keepalive`

The following node-fetch extension properties are provided:

- `follow`
- `compress`
- `counter`
- `agent`
- `highWaterMark`

See [options](#fetch-options) for exact meaning of these extensions.

#### new Request(input[, options])

<small>_(spec-compliant)_</small>

- `input` A string representing a URL, or another `Request` (which will be cloned)
- `options` [Options][#fetch-options] for the HTTP(S) request

Constructs a new `Request` object. The constructor is identical to that in the [browser](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request).

In most cases, directly `fetch(url, options)` is simpler than creating a `Request` object.

<a id="class-response"></a>

### Class: Response

An HTTP(S) response. This class implements the [Body](#iface-body) interface.

The following properties are not implemented in node-fetch at this moment:

- `trailer`

#### new Response([body[, options]])

<small>_(spec-compliant)_</small>

- `body` A `String` or [`Readable` stream][node-readable]
- `options` A [`ResponseInit`][response-init] options dictionary

Constructs a new `Response` object. The constructor is identical to that in the [browser](https://developer.mozilla.org/en-US/docs/Web/API/Response/Response).

Because Node.js does not implement service workers (for which this class was designed), one rarely has to construct a `Response` directly.

#### response.ok

<small>_(spec-compliant)_</small>

Convenience property representing if the request ended normally. Will evaluate to true if the response status was greater than or equal to 200 but smaller than 300.

#### response.redirected

<small>_(spec-compliant)_</small>

Convenience property representing if the request has been redirected at least once. Will evaluate to true if the internal redirect counter is greater than 0.

#### response.type

<small>_(deviation from spec)_</small>

Convenience property representing the response's type. node-fetch only supports `'default'` and `'error'` and does not make use of [filtered responses](https://fetch.spec.whatwg.org/#concept-filtered-response).

<a id="class-headers"></a>

### Class: Headers

This class allows manipulating and iterating over a set of HTTP headers. All methods specified in the [Fetch Standard][whatwg-fetch] are implemented.

#### new Headers([init])

<small>_(spec-compliant)_</small>

- `init` Optional argument to pre-fill the `Headers` object

Construct a new `Headers` object. `init` can be either `null`, a `Headers` object, an key-value map object or any iterable object.

```js
// Example adapted from https://fetch.spec.whatwg.org/#example-headers-class
const {Headers} = require('node-fetch');

const meta = {
	'Content-Type': 'text/xml',
	'Breaking-Bad': '<3'
};
const headers = new Headers(meta);

// The above is equivalent to
const meta = [['Content-Type', 'text/xml'], ['Breaking-Bad', '<3']];
const headers = new Headers(meta);

// You can in fact use any iterable objects, like a Map or even another Headers
const meta = new Map();
meta.set('Content-Type', 'text/xml');
meta.set('Breaking-Bad', '<3');
const headers = new Headers(meta);
const copyOfHeaders = new Headers(headers);
```

<a id="iface-body"></a>

### Interface: Body

`Body` is an abstract interface with methods that are applicable to both `Request` and `Response` classes.

The following methods are not yet implemented in node-fetch at this moment:

- `formData()`

#### body.body

<small>_(deviation from spec)_</small>

- Node.js [`Readable` stream][node-readable]

Data are encapsulated in the `Body` object. Note that while the [Fetch Standard][whatwg-fetch] requires the property to always be a WHATWG `ReadableStream`, in node-fetch it is a Node.js [`Readable` stream][node-readable].

#### body.bodyUsed

<small>_(spec-compliant)_</small>

- `Boolean`

A boolean property for if this body has been consumed. Per the specs, a consumed body cannot be used again.

#### body.arrayBuffer()

#### body.blob()

#### body.json()

#### body.text()

<small>_(spec-compliant)_</small>

- Returns: `Promise`

Consume the body and return a promise that will resolve to one of these formats.

#### body.buffer()

<small>_(node-fetch extension)_</small>

- Returns: `Promise<Buffer>`

Consume the body and return a promise that will resolve to a Buffer.

<a id="class-fetcherror"></a>

### Class: FetchError

<small>_(node-fetch extension)_</small>

An operational error in the fetching process. See [ERROR-HANDLING.md][] for more info.

<a id="class-aborterror"></a>

### Class: AbortError

<small>_(node-fetch extension)_</small>

An Error thrown when the request is aborted in response to an `AbortSignal`'s `abort` event. It has a `name` property of `AbortError`. See [ERROR-HANDLING.MD][] for more info.

## TypeScript

**Since `3.x` types are bundled with `node-fetch`, so you don't need to install any additional packages.**

For older versions please use the type definitions from [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped):

```sh
npm install --save-dev @types/node-fetch
```

## Acknowledgement

Thanks to [github/fetch](https://github.com/github/fetch) for providing a solid implementation reference.

## Team

| [![David Frank](https://github.com/bitinn.png?size=100)](https://github.com/bitinn) | [![Jimmy Wärting](https://github.com/jimmywarting.png?size=100)](https://github.com/jimmywarting) | [![Antoni Kepinski](https://github.com/xxczaki.png?size=100)](https://github.com/xxczaki) | [![Richie Bendall](https://github.com/Richienb.png?size=100)](https://github.com/Richienb) | [![Gregor Martynus](https://github.com/gr2m.png?size=100)](https://github.com/gr2m) |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [David Frank](https://bitinn.net/)                                                  | [Jimmy Wärting](https://jimmy.warting.se/)                                                        | [Antoni Kepinski](https://kepinski.me)                                                    | [Richie Bendall](https://www.richie-bendall.ml/)                                           | [Gregor Martynus](https://twitter.com/gr2m)                                         |

###### Former

- [Timothy Gu](https://github.com/timothygu)
- [Jared Kantrowitz](https://github.com/jkantr)

## License

[MIT](LICENSE.md)

[whatwg-fetch]: https://fetch.spec.whatwg.org/
[response-init]: https://fetch.spec.whatwg.org/#responseinit
[node-readable]: https://nodejs.org/api/stream.html#stream_readable_streams
[mdn-headers]: https://developer.mozilla.org/en-US/docs/Web/API/Headers
[error-handling.md]: https://github.com/node-fetch/node-fetch/blob/master/docs/ERROR-HANDLING.md
