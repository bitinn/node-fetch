const test = require('ava');
const fetch = require('../../');
const {Request, Response, Headers, FetchError, AbortError} = require('../../');
const {execFileSync} = require('child_process');

execFileSync('npm', ['run', 'build'], {stdio: 'inherit'});

test('default import must be a function', async t => {
	t.is(typeof fetch, 'function');
});

test('FetchError must be an Error', async t => {
	t.true(new FetchError() instanceof Error);
});

test('AbortError must be an extension of Error', async t => {
	t.true(new AbortError() instanceof Error);
});

test('Request class is not exposing correct functionality', async t => {
	t.true(new Request('https://www.test.com').headers instanceof Headers);
});

test('Response class is not exposing correct functionality', async t => {
	t.is(new Response(null, {headers: {a: 'a'}}).headers.get('a'), 'a');
});

test('Fetch function works correctly', async t => {
	const response = await fetch(`data:text/plain;base64,${Buffer.from('Hello World!').toString('base64')}`);
	const text = await response.text();

	t.is(text, 'Hello World!');
});
