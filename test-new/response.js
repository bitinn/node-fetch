import test from 'ava';
import * as stream from 'stream';
import {TextEncoder} from 'util';
import Blob from 'fetch-blob';
import {Response} from '../src/index.js';
import TestServer from './utils/server.js';

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
	const response = new Response();
	const enumerableProperties = [];

	// eslint-disable-next-line guard-for-in
	for (const property in response) {
		enumerableProperties.push(property);
	}

	const toCheck = [
		'size',
		'url',
		'status',
		'ok',
		'redirected',
		'statusText',
		'headers',
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
		'body',
		'bodyUsed',
		'url',
		'status',
		'ok',
		'redirected',
		'statusText',
		'headers'
	]) {
		t.throws(() => {
			response[toCheck] = 'abc';
		});
	}
});

test('should support empty options', async t => {
	const response = new Response(stream.Readable.from('a=1'));
	const result = await response.text();

	t.is(result, 'a=1');
});

test('should support parsing headers', t => {
	const response = new Response(null, {
		headers: {
			a: '1'
		}
	});

	t.is(response.headers.get('a'), '1');
});

test('should support text() method', async t => {
	const response = new Response('a=1');
	const result = await response.text();

	t.is(result, 'a=1');
});

test('should support json() method', async t => {
	const response = new Response('{"a":1}');
	const result = await response.json();

	t.is(result.a, 1);
});

test('should support buffer() method', async t => {
	const response = new Response('a=1');
	const result = await response.buffer();

	t.is(result.toString(), 'a=1');
});

test('should support blob() method', async t => {
	const response = new Response('a=1', {
		method: 'POST',
		headers: {
			'Content-Type': 'text/plain'
		}
	});
	const result = await response.blob();

	t.true(result instanceof Blob);
	t.is(result.size, 3);
	t.is(result.type, 'text/plain');
});

test('should support clone() method', async t => {
	const body = stream.Readable.from('a=1');
	const response = new Response(body, {
		headers: {
			a: '1'
		},
		url: base,
		status: 346,
		statusText: 'production'
	});
	const cl = response.clone();
	const result = await cl.text();

	t.is(cl.headers.get('a'), '1');
	t.is(cl.url, base);
	t.is(cl.status, 346);
	t.is(cl.statusText, 'production');
	t.false(cl.ok);
	// Clone body shouldn't be the same body
	t.not(cl.body, body);
	t.is(result, 'a=1');
});

test('should support stream as body', async t => {
	const body = stream.Readable.from('a=1');
	const response = new Response(body);
	const result = await response.text();

	t.is(result, 'a=1');
});

test('should support string as body', async t => {
	const response = new Response('a=1');
	const result = await response.text();

	t.is(result, 'a=1');
});

test('should support buffer as body', async t => {
	const response = new Response(Buffer.from('a=1'));
	const result = await response.text();

	t.is(result, 'a=1');
});

test('should support ArrayBuffer as body', async t => {
	const encoder = new TextEncoder();
	const response = new Response(encoder.encode('a=1'));
	const result = await response.text();

	t.is(result, 'a=1');
});

test('should support blob as body', async t => {
	const response = new Response(new Blob(['a=1']));
	const result = await response.text();

	t.is(result, 'a=1');
});

test('should support Uint8Array as body', async t => {
	const encoder = new TextEncoder();
	const response = new Response(encoder.encode('a=1'));
	const result = await response.text();

	t.is(result, 'a=1');
});

test('should support DataView as body', async t => {
	const encoder = new TextEncoder();
	const response = new Response(new DataView(encoder.encode('a=1').buffer));
	const result = await response.text();

	t.is(result, 'a=1');
});

test('should default to null as body', async t => {
	const response = new Response();
	t.is(response.body, null);

	const result = await response.text();

	t.is(result, '');
});

test('should default to 200 as status code', t => {
	const response = new Response(null);
	t.is(response.status, 200);
});

test('should default to empty string as url', t => {
	const response = new Response(null);
	t.is(response.url, '');
});

