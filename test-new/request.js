import test from 'ava';
import stream from 'stream';
import http from 'http';
import {TextEncoder} from 'util';
import AbortController from 'abort-controller';
import FormData from 'form-data';
import Blob from 'fetch-blob';

import TestServer from './utils/server.js';
import {Request} from '../src/index.js';

const local = new TestServer();
let base;

test.before(() => {
	local.start();
	base = `http://${local.hostname}:${local.port}/`;
});

test.after(() => {
	local.stop();
});

test('should have attributes conforming to Web IDL', t => {
	const request = new Request('https://github.com/');
	const enumerableProperties = [];

	// eslint-disable-next-line guard-for-in
	for (const property in request) {
		enumerableProperties.push(property);
	}

	const toCheck = [
		'size',
		'follow',
		'compress',
		'counter',
		'agent',
		'highWaterMark',
		'insecureHTTPParser',
		'method',
		'url',
		'headers',
		'redirect',
		'signal',
		'clone',
		'body',
		'bodyUsed',
		'arrayBuffer',
		'blob',
		'json',
		'text'
	];

	t.deepEqual(enumerableProperties, toCheck);

	for (const toCheck of [
		'body', 'bodyUsed', 'method', 'url', 'headers', 'redirect', 'signal'
	]) {
		t.throws(() => {
			request[toCheck] = 'abc';
		});
	}
});

test('should support wrapping Request instance', t => {
	const url = `${base}hello`;

	const form = new FormData();
	form.append('a', '1');
	const {signal} = new AbortController();

	const r1 = new Request(url, {
		method: 'POST',
		follow: 1,
		body: form,
		signal
	});
	const r2 = new Request(r1, {
		follow: 2
	});

	t.is(r2.url, url);
	t.is(r2.method, 'POST');
	t.is(r2.signal, signal);
	// Note that we didn't clone the body
	t.is(r2.body, form);
	t.is(r1.follow, 1);
	t.is(r2.follow, 2);
	t.is(r1.counter, 0);
	t.is(r2.counter, 0);
});

test('should override signal on derived Request instances', t => {
	const parentAbortController = new AbortController();
	const derivedAbortController = new AbortController();
	const parentRequest = new Request(`${base}hello`, {
		signal: parentAbortController.signal
	});
	const derivedRequest = new Request(parentRequest, {
		signal: derivedAbortController.signal
	});

	t.is(parentRequest.signal, parentAbortController.signal);
	t.is(derivedRequest.signal, derivedAbortController.signal);
});

test('should allow removing signal on derived Request instances', t => {
	const parentAbortController = new AbortController();
	const parentRequest = new Request(`${base}hello`, {
		signal: parentAbortController.signal
	});
	const derivedRequest = new Request(parentRequest, {
		signal: null
	});

	t.is(parentRequest.signal, parentAbortController.signal);
	t.is(derivedRequest.signal, null);
});

test('should throw error with GET/HEAD requests with body', t => {
	t.throws(() => new Request(base, {body: ''}), {instanceOf: TypeError});
	t.throws(() => new Request(base, {body: 'a'}), {instanceOf: TypeError});
	t.throws(() => new Request(base, {body: '', method: 'HEAD'}), {instanceOf: TypeError});
	t.throws(() => new Request(base, {body: 'a', method: 'HEAD'}), {instanceOf: TypeError});
	t.throws(() => new Request(base, {body: 'a', method: 'get'}), {instanceOf: TypeError});
	t.throws(() => new Request(base, {body: 'a', method: 'head'}), {instanceOf: TypeError});
});

test('should default to null as body', async t => {
	const request = new Request(base);
	const result = await request.text();

	t.is(request.body, null);
	t.is(result, '');
});

test('should support parsing headers', t => {
	const url = base;
	const request = new Request(url, {
		headers: {
			a: '1'
		}
	});

	t.is(request.url, url);
	t.is(request.headers.get('a'), '1');
});

test('should support arrayBuffer() method', async t => {
	const url = base;
	const request = new Request(url, {
		method: 'POST',
		body: 'a=1'
	});
	const result = await request.arrayBuffer();
	const string = String.fromCharCode.apply(null, new Uint8Array(result));

	t.is(request.url, url);
	t.true(result instanceof ArrayBuffer);
	t.is(string, 'a=1');
});

test('should support text() method', async t => {
	const url = base;
	const request = new Request(url, {
		method: 'POST',
		body: 'a=1'
	});
	const result = await request.text();

	t.is(request.url, url);
	t.is(result, 'a=1');
});

test('should support json() method', async t => {
	const url = base;
	const request = new Request(url, {
		method: 'POST',
		body: '{"a":1}'
	});
	const result = await request.json();

	t.is(request.url, url);
	t.is(result.a, 1);
});

test('should support buffer() method', async t => {
	const url = base;
	const request = new Request(url, {
		method: 'POST',
		body: 'a=1'
	});
	const result = await request.buffer();

	t.is(request.url, url);
	t.is(result.toString(), 'a=1');
});

test('should support blob() method', async t => {
	const url = base;
	const request = new Request(url, {
		method: 'POST',
		body: Buffer.from('a=1')
	});
	const result = await request.blob();

	t.is(request.url, url);
	t.true(result instanceof Blob);
	t.is(result.size, 3);
	t.is(result.type, '');
});

test('should support clone() method', async t => {
	const url = base;
	const body = stream.Readable.from('a=1');
	const agent = new http.Agent();
	const {signal} = new AbortController();
	const request = new Request(url, {
		body,
		method: 'POST',
		redirect: 'manual',
		headers: {
			b: '2'
		},
		follow: 3,
		compress: false,
		agent,
		signal
	});
	const cl = request.clone();
	const results = await Promise.all([cl.text(), request.text()]);

	t.is(cl.url, url);
	t.is(cl.method, 'POST');
	t.is(cl.redirect, 'manual');
	t.is(cl.headers.get('b'), '2');
	t.is(cl.follow, 3);
	t.false(cl.compress);
	t.is(cl.counter, 0);
	t.is(cl.agent, agent);
	t.is(cl.signal, signal);
	// Clone body shouldn't be the same body
	t.not(cl.body, body);
	t.is(results[0], 'a=1');
	t.is(results[1], 'a=1');
});

test('should support ArrayBuffer as body', async t => {
	const encoder = new TextEncoder();
	const request = new Request(base, {
		method: 'POST',
		body: encoder.encode('a=1').buffer
	});
	const result = await request.text();

	t.is(result, 'a=1');
});

test('should support Uint8Array as body', async t => {
	const encoder = new TextEncoder();
	const request = new Request(base, {
		method: 'POST',
		body: encoder.encode('a=1')
	});
	const result = await request.text();

	t.is(result, 'a=1');
});

test('should support DataView as body', async t => {
	const encoder = new TextEncoder();
	const request = new Request(base, {
		method: 'POST',
		body: new DataView(encoder.encode('a=1').buffer)
	});
	const result = await request.text();

	t.is(result, 'a=1');
});

