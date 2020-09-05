
import stream from 'stream';
import chai from 'chai';
import chaiPromised from 'chai-as-promised';
import {TextEncoder} from 'util';
import Blob from 'fetch-blob';
import {builtinModules} from 'module';
import {randomBytes} from 'crypto';
import {Response} from '../src/index.js';

const {expect} = chai;
chai.use(chaiPromised);

describe('Response', () => {
	it('should have attributes conforming to Web IDL', () => {
		const res = new Response();
		const enumerableProperties = [];
		for (const property in res) {
			enumerableProperties.push(property);
		}

		for (const toCheck of [
			'body',
			'bodyUsed',
			'arrayBuffer',
			'blob',
			'json',
			'text',
			'url',
			'status',
			'ok',
			'redirected',
			'statusText',
			'headers',
			'clone'
		]) {
			expect(enumerableProperties).to.contain(toCheck);
		}

		for (const toCheck of [
			'body',
			'bodyUsed',
			'url',
			'status',
			'ok',
			'redirected',
			'statusText',
			'headers'
		]) {
			expect(() => {
				res[toCheck] = 'abc';
			}).to.throw();
		}
	});

	it('should support empty options', () => {
		const res = new Response(stream.Readable.from('a=1'));
		return res.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should support parsing headers', () => {
		const res = new Response(null, {
			headers: {
				a: '1'
			}
		});
		expect(res.headers.get('a')).to.equal('1');
	});

	it('should support text() method', () => {
		const res = new Response('a=1');
		return res.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should support json() method', () => {
		const res = new Response('{"a":1}');
		return res.json().then(result => {
			expect(result.a).to.equal(1);
		});
	});

	it('should support buffer() method', () => {
		const res = new Response('a=1');
		return res.buffer().then(result => {
			expect(result.toString()).to.equal('a=1');
		});
	});

	it('should support blob() method', () => {
		const res = new Response('a=1', {
			method: 'POST',
			headers: {
				'Content-Type': 'text/plain'
			}
		});
		return res.blob().then(result => {
			expect(result).to.be.an.instanceOf(Blob);
			expect(result.size).to.equal(3);
			expect(result.type).to.equal('text/plain');
		});
	});

	it('should support clone() method', () => {
		const body = stream.Readable.from('a=1');
		const res = new Response(body, {
			headers: {
				a: '1'
			},
			url: 'https://dummy.com',
			status: 346,
			statusText: 'production'
		});
		const cl = res.clone();
		expect(cl.headers.get('a')).to.equal('1');
		expect(cl.url).to.equal('https://dummy.com');
		expect(cl.status).to.equal(346);
		expect(cl.statusText).to.equal('production');
		expect(cl.ok).to.be.false;
		// Clone body shouldn't be the same body
		expect(cl.body).to.not.equal(body);
		return cl.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should support stream as body', () => {
		const body = stream.Readable.from('a=1');
		const res = new Response(body);
		return res.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should support string as body', () => {
		const res = new Response('a=1');
		return res.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should support buffer as body', () => {
		const res = new Response(Buffer.from('a=1'));
		return res.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should support ArrayBuffer as body', () => {
		const encoder = new TextEncoder();
		const res = new Response(encoder.encode('a=1'));
		return res.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should support blob as body', () => {
		const res = new Response(new Blob(['a=1']));
		return res.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should support Uint8Array as body', () => {
		const encoder = new TextEncoder();
		const res = new Response(encoder.encode('a=1'));
		return res.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should support DataView as body', () => {
		const encoder = new TextEncoder();
		const res = new Response(new DataView(encoder.encode('a=1').buffer));
		return res.text().then(result => {
			expect(result).to.equal('a=1');
		});
	});

	it('should default to null as body', () => {
		const res = new Response();
		expect(res.body).to.equal(null);

		return res.text().then(result => expect(result).to.equal(''));
	});

	it('should default to 200 as status code', () => {
		const res = new Response(null);
		expect(res.status).to.equal(200);
	});

	it('should default to empty string as url', () => {
		const res = new Response();
		expect(res.url).to.equal('');
	});

	if (builtinModules.includes('worker_threads')) {
		it('should not block message loop on large json', async () => {
			const bigObject = {
				a: randomBytes(0o100000).toString('hex'),
				b: [randomBytes(0xFFFF).toString('base64')]
			};
			const res = new Response(JSON.stringify(bigObject));
			let ticks = 0;
			const json = await Promise.race([res.json(), new Promise(resolve => {
				const interval = setInterval(() => {
					ticks++;
					if (ticks > 500) {
						resolve(clearInterval(interval));
					}
				}, 0);
			})]);
			expect(ticks).to.be.greaterThan(5); // magic number, but it's actually is 0 when sync JSON.parse is used
			expect(json).to.be.deep.equal(bigObject);
		});

		it('should be possible to catch JSON parsing error on a large response', async () => {
			const res = new Response(randomBytes(0xFFFF).toString('base64'));
			return expect(res.json()).to.eventually.be.rejectedWith(SyntaxError, /Unexpected/);
		});
	}
});
