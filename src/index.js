/**
 * Index.js
 *
 * a request API compatible with window.fetch
 *
 * All spec algorithm step numbers are based on https://fetch.spec.whatwg.org/commit-snapshots/ae716822cb3a61843226cd090eefc6589446c1d2/.
 */

import http from 'http';
import https from 'https';
import zlib from 'zlib';
import Stream, {PassThrough, pipeline as pump} from 'stream';
import dataURIToBuffer from 'data-uri-to-buffer';

import Body, {writeToStream, getTotalBytes} from './body';
import Response from './response';
import Headers, {createHeadersLenient} from './headers';
import Request, {getNodeRequestOptions} from './request';
import FetchError from './errors/fetch-error';
import AbortError from './errors/abort-error';

/**
 * Fetch function
 *
 * @param   Mixed    url   Absolute url or Request instance
 * @param   Object   opts  Fetch options
 * @return  Promise
 */
export default function fetch(url, options_) {
	// Allow custom promise
	if (!fetch.Promise) {
		throw new Error('native promise missing, set fetch.Promise to your favorite alternative');
	}

	// Regex for data uri
	const dataUriRegex = /^\s*data:([a-z]+\/[a-z]+(;[a-z-]+=[a-z-]+)?)?(;base64)?,[\w!$&',()*+;=\-.~:@/?%\s]*\s*$/i;

	// If valid data uri
	if (dataUriRegex.test(url)) {
		const data = dataURIToBuffer(url);
		const res = new Response(data, {headers: {'Content-Type': data.type}});
		return fetch.Promise.resolve(res);
	}

	// If invalid data uri
	if (url.toString().startsWith('data:')) {
		const request = new Request(url, options_);
		return fetch.Promise.reject(new FetchError(`[${request.method}] ${request.url} invalid URL`, 'system'));
	}

	Body.Promise = fetch.Promise;

	// Wrap http.request into fetch
	return new fetch.Promise((resolve, reject) => {
		// Build request object
		const request = new Request(url, options_);
		const options = getNodeRequestOptions(request);

		const send = (options.protocol === 'https:' ? https : http).request;
		const {signal} = request;
		let response = null;

		const abort = () => {
			const error = new AbortError('The operation was aborted.');
			reject(error);
			if (request.body && request.body instanceof Stream.Readable) {
				request.body.destroy(error);
			}

			if (!response || !response.body) {
				return;
			}

			response.body.emit('error', error);
		};

		if (signal && signal.aborted) {
			abort();
			return;
		}

		const abortAndFinalize = () => {
			abort();
			finalize();
		};

		// Send request
		const request_ = send(options);

		if (signal) {
			signal.addEventListener('abort', abortAndFinalize);
		}

		function finalize() {
			request_.abort();
			if (signal) {
				signal.removeEventListener('abort', abortAndFinalize);
			}
		}

		if (request.timeout) {
			request_.setTimeout(request.timeout, () => {
				finalize();
				reject(new FetchError(`network timeout at: ${request.url}`, 'request-timeout'));
			});
		}

		request_.on('error', err => {
			reject(new FetchError(`request to ${request.url} failed, reason: ${err.message}`, 'system', err));
			finalize();
		});

		request_.on('response', res => {
			const headers = createHeadersLenient(res.headers);

			// HTTP fetch step 5
			if (fetch.isRedirect(res.statusCode)) {
				// HTTP fetch step 5.2
				const location = headers.get('Location');

				// HTTP fetch step 5.3
				const locationURL = location === null ? null : new URL(location, request.url);

				// HTTP fetch step 5.5
				switch (request.redirect) {
					case 'error':
						reject(new FetchError(`redirect mode is set to error: ${request.url}`, 'no-redirect'));
						finalize();
						return;
					case 'manual':
						// Node-fetch-specific step: make manual redirect a bit easier to use by setting the Location header value to the resolved URL.
						if (locationURL !== null) {
							// Handle corrupted header
							try {
								headers.set('Location', locationURL);
							} catch (error) {
								// istanbul ignore next: nodejs server prevent invalid response headers, we can't test this through normal request
								reject(error);
							}
						}

						break;
					case 'follow': {
						// HTTP-redirect fetch step 2
						if (locationURL === null) {
							break;
						}

						// HTTP-redirect fetch step 5
						if (request.counter >= request.follow) {
							reject(new FetchError(`maximum redirect reached at: ${request.url}`, 'max-redirect'));
							finalize();
							return;
						}

						// Update host due to redirection
						request.headers.set('host', [locationURL.host]);

						// HTTP-redirect fetch step 6 (counter increment)
						// Create a new Request object.
						const requestOptions = {
							headers: new Headers(request.headers),
							follow: request.follow,
							counter: request.counter + 1,
							agent: request.agent,
							compress: request.compress,
							method: request.method,
							body: request.body,
							signal: request.signal,
							timeout: request.timeout
						};

						// HTTP-redirect fetch step 9
						if (res.statusCode !== 303 && request.body && getTotalBytes(request) === null) {
							reject(new FetchError('Cannot follow redirect with body being a readable stream', 'unsupported-redirect'));
							finalize();
							return;
						}

						// HTTP-redirect fetch step 11
						if (res.statusCode === 303 || ((res.statusCode === 301 || res.statusCode === 302) && request.method === 'POST')) {
							requestOptions.method = 'GET';
							requestOptions.body = undefined;
							requestOptions.headers.delete('content-length');
						}

						// HTTP-redirect fetch step 15
						resolve(fetch(new Request(locationURL, requestOptions)));
						finalize();
						return;
					}

					default:
					// Do nothing
				}
			}

			// Prepare response
			res.once('end', () => {
				if (signal) {
					signal.removeEventListener('abort', abortAndFinalize);
				}
			});

			let body = pump(res, new PassThrough(), error => {
				reject(error);
			});

			const responseOptions = {
				url: request.url,
				status: res.statusCode,
				statusText: res.statusMessage,
				headers,
				size: request.size,
				timeout: request.timeout,
				counter: request.counter,
				highWaterMark: request.highWaterMark
			};

			// HTTP-network fetch step 12.1.1.3
			const codings = headers.get('Content-Encoding');

			// HTTP-network fetch step 12.1.1.4: handle content codings

			// in following scenarios we ignore compression support
			// 1. compression support is disabled
			// 2. HEAD request
			// 3. no Content-Encoding header
			// 4. no content response (204)
			// 5. content not modified response (304)
			if (!request.compress || request.method === 'HEAD' || codings === null || res.statusCode === 204 || res.statusCode === 304) {
				response = new Response(body, responseOptions);
				resolve(response);
				return;
			}

			// For Node v6+
			// Be less strict when decoding compressed responses, since sometimes
			// servers send slightly invalid responses that are still accepted
			// by common browsers.
			// Always using Z_SYNC_FLUSH is what cURL does.
			const zlibOptions = {
				flush: zlib.Z_SYNC_FLUSH,
				finishFlush: zlib.Z_SYNC_FLUSH
			};

			// For gzip
			if (codings === 'gzip' || codings === 'x-gzip') {
				body = pump(body, zlib.createGunzip(zlibOptions), error => {
					reject(error);
				});
				response = new Response(body, responseOptions);
				resolve(response);
				return;
			}

			// For deflate
			if (codings === 'deflate' || codings === 'x-deflate') {
				// Handle the infamous raw deflate response from old servers
				// a hack for old IIS and Apache servers
				const raw = pump(res, new PassThrough(), error => {
					reject(error);
				});
				raw.once('data', chunk => {
					// See http://stackoverflow.com/questions/37519828
					if ((chunk[0] & 0x0F) === 0x08) {
						body = pump(body, zlib.createInflate(), error => {
							reject(error);
						});
					} else {
						body = pump(body, zlib.createInflateRaw(), error => {
							reject(error);
						});
					}

					response = new Response(body, responseOptions);
					resolve(response);
				});
				return;
			}

			// For br
			if (codings === 'br' && typeof zlib.createBrotliDecompress === 'function') {
				body = pump(body, zlib.createBrotliDecompress(), error => {
					reject(error);
				});
				response = new Response(body, responseOptions);
				resolve(response);
				return;
			}

			// Otherwise, use response as-is
			response = new Response(body, responseOptions);
			resolve(response);
		});

		writeToStream(request_, request);
	});
}

/**
 * Redirect code matching
 *
 * @param   Number   code  Status code
 * @return  Boolean
 */
fetch.isRedirect = code => [301, 302, 303, 307, 308].includes(code);

// Expose Promise
fetch.Promise = global.Promise;
export {
	Headers,
	Request,
	Response,
	FetchError
};
