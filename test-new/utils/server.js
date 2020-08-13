import http from 'http';
import zlib from 'zlib';
import parted from 'parted';
const {multipart: Multipart} = parted;

export default class TestServer {
	constructor() {
		this.server = http.createServer(this.router);
		this.port = 30001;
		this.hostname = 'localhost';
		// Node 8 default keepalive timeout is 5000ms
		// make it shorter here as we want to close server quickly at the end of tests
		this.server.keepAliveTimeout = 1000;
		this.server.on('error', err => {
			console.log(err.stack);
		});
		this.server.on('connection', socket => {
			socket.setTimeout(1500);
		});
	}

	start(cb) {
		this.server.listen(this.port, this.hostname, cb);
	}

	stop(cb) {
		this.server.close(cb);
	}

	mockResponse(responseHandler) {
		this.server.nextResponseHandler = responseHandler;
		return `http://${this.hostname}:${this.port}/mocked`;
	}

	router(request, response) {
		const p = request.url;

		if (p === '/mocked') {
			if (this.nextResponseHandler) {
				this.nextResponseHandler(response);
				this.nextResponseHandler = undefined;
			} else {
				throw new Error('No mocked response. Use ’TestServer.mockResponse()’.');
			}
		}

		if (p === '/hello') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/plain');
			response.end('world');
		}

		if (p.includes('question')) {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/plain');
			response.end('ok');
		}

		if (p === '/plain') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/plain');
			response.end('text');
		}

		if (p === '/options') {
			response.statusCode = 200;
			response.setHeader('Allow', 'GET, HEAD, OPTIONS');
			response.end('hello world');
		}

		if (p === '/html') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/html');
			response.end('<html></html>');
		}

		if (p === '/json') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'application/json');
			response.end(JSON.stringify({
				name: 'value'
			}));
		}

		if (p === '/gzip') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/plain');
			response.setHeader('Content-Encoding', 'gzip');
			zlib.gzip('hello world', (err, buffer) => {
				if (err) {
					throw err;
				}

				response.end(buffer);
			});
		}

		if (p === '/gzip-truncated') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/plain');
			response.setHeader('Content-Encoding', 'gzip');
			zlib.gzip('hello world', (err, buffer) => {
				if (err) {
					throw err;
				}

				// Truncate the CRC checksum and size check at the end of the stream
				response.end(buffer.slice(0, -8));
			});
		}

		if (p === '/gzip-capital') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/plain');
			response.setHeader('Content-Encoding', 'GZip');
			zlib.gzip('hello world', (err, buffer) => {
				if (err) {
					throw err;
				}

				response.end(buffer);
			});
		}

		if (p === '/deflate') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/plain');
			response.setHeader('Content-Encoding', 'deflate');
			zlib.deflate('hello world', (err, buffer) => {
				if (err) {
					throw err;
				}

				response.end(buffer);
			});
		}

		if (p === '/brotli') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/plain');
			if (typeof zlib.createBrotliDecompress === 'function') {
				response.setHeader('Content-Encoding', 'br');
				zlib.brotliCompress('hello world', (err, buffer) => {
					if (err) {
						throw err;
					}

					response.end(buffer);
				});
			}
		}

		if (p === '/deflate-raw') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/plain');
			response.setHeader('Content-Encoding', 'deflate');
			zlib.deflateRaw('hello world', (err, buffer) => {
				if (err) {
					throw err;
				}

				response.end(buffer);
			});
		}

		if (p === '/sdch') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/plain');
			response.setHeader('Content-Encoding', 'sdch');
			response.end('fake sdch string');
		}

		if (p === '/invalid-content-encoding') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/plain');
			response.setHeader('Content-Encoding', 'gzip');
			response.end('fake gzip string');
		}

		if (p === '/timeout') {
			setTimeout(() => {
				response.statusCode = 200;
				response.setHeader('Content-Type', 'text/plain');
				response.end('text');
			}, 1000);
		}

		if (p === '/slow') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/plain');
			response.write('test');
			setTimeout(() => {
				response.end('test');
			}, 1000);
		}

		if (p === '/cookie') {
			response.statusCode = 200;
			response.setHeader('Set-Cookie', ['a=1', 'b=1']);
			response.end('cookie');
		}

		if (p === '/size/chunk') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/plain');
			setTimeout(() => {
				response.write('test');
			}, 10);
			setTimeout(() => {
				response.end('test');
			}, 20);
		}

		if (p === '/size/long') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/plain');
			response.end('testtest');
		}

		if (p === '/redirect/301') {
			response.statusCode = 301;
			response.setHeader('Location', '/inspect');
			response.end();
		}

		if (p === '/redirect/302') {
			response.statusCode = 302;
			response.setHeader('Location', '/inspect');
			response.end();
		}

		if (p === '/redirect/303') {
			response.statusCode = 303;
			response.setHeader('Location', '/inspect');
			response.end();
		}

		if (p === '/redirect/307') {
			response.statusCode = 307;
			response.setHeader('Location', '/inspect');
			response.end();
		}

		if (p === '/redirect/308') {
			response.statusCode = 308;
			response.setHeader('Location', '/inspect');
			response.end();
		}

		if (p === '/redirect/chain') {
			response.statusCode = 301;
			response.setHeader('Location', '/redirect/301');
			response.end();
		}

		if (p === '/redirect/no-location') {
			response.statusCode = 301;
			response.end();
		}

		if (p === '/redirect/slow') {
			response.statusCode = 301;
			response.setHeader('Location', '/redirect/301');
			setTimeout(() => {
				response.end();
			}, 1000);
		}

		if (p === '/redirect/slow-chain') {
			response.statusCode = 301;
			response.setHeader('Location', '/redirect/slow');
			setTimeout(() => {
				response.end();
			}, 10);
		}

		if (p === '/redirect/slow-stream') {
			response.statusCode = 301;
			response.setHeader('Location', '/slow');
			response.end();
		}

		if (p === '/error/400') {
			response.statusCode = 400;
			response.setHeader('Content-Type', 'text/plain');
			response.end('client error');
		}

		if (p === '/error/404') {
			response.statusCode = 404;
			response.setHeader('Content-Encoding', 'gzip');
			response.end();
		}

		if (p === '/error/500') {
			response.statusCode = 500;
			response.setHeader('Content-Type', 'text/plain');
			response.end('server error');
		}

		if (p === '/error/reset') {
			response.destroy();
		}

		if (p === '/error/premature') {
			response.writeHead(200, {'content-length': 50});
			response.write('foo');
			setTimeout(() => {
				response.destroy();
			}, 100);
		}

		if (p === '/error/json') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'application/json');
			response.end('invalid json');
		}

		if (p === '/no-content') {
			response.statusCode = 204;
			response.end();
		}

		if (p === '/no-content/gzip') {
			response.statusCode = 204;
			response.setHeader('Content-Encoding', 'gzip');
			response.end();
		}

		if (p === '/no-content/brotli') {
			response.statusCode = 204;
			response.setHeader('Content-Encoding', 'br');
			response.end();
		}

		if (p === '/not-modified') {
			response.statusCode = 304;
			response.end();
		}

		if (p === '/not-modified/gzip') {
			response.statusCode = 304;
			response.setHeader('Content-Encoding', 'gzip');
			response.end();
		}

		if (p === '/inspect') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'application/json');
			let body = '';
			request.on('data', c => {
				body += c;
			});
			request.on('end', () => {
				response.end(JSON.stringify({
					method: request.method,
					url: request.url,
					headers: request.headers,
					body
				}));
			});
		}

		if (p === '/multipart') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'application/json');
			const parser = new Multipart(request.headers['content-type']);
			let body = '';
			parser.on('part', (field, part) => {
				body += field + '=' + part;
			});
			parser.on('end', () => {
				response.end(JSON.stringify({
					method: request.method,
					url: request.url,
					headers: request.headers,
					body
				}));
			});
			request.pipe(parser);
		}

		if (p === '/m%C3%B6bius') {
			response.statusCode = 200;
			response.setHeader('Content-Type', 'text/plain');
			response.end('ok');
		}
	}
}

