import test from 'ava';
import fetch from '../src/index.js';

test('should accept base64-encoded gif data uri', async t => {
	const response = await fetch('data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=');
	const buffer = await response.buffer();

	t.is(response.status, 200);
	t.is(response.headers.get('Content-Type'), 'image/gif');
	t.true(buffer instanceof Buffer);
});

test('should accept data uri with specified charset', async t => {
	const response = await fetch('data:text/plain;charset=UTF-8;page=21,the%20data:1234,5678');
	const text = await response.text();

	t.is(response.status, 200);
	t.is(response.headers.get('Content-Type'), 'text/plain;charset=UTF-8;page=21');
	t.is(text, 'the data:1234,5678');
});

test('should accept data uri of plain text', async t => {
	const response = await fetch('data:,Hello%20World!');
	const text = await response.text();

	t.is(response.status, 200);
	t.is(response.headers.get('Content-Type'), 'text/plain;charset=US-ASCII');
	t.is(text, 'Hello World!');
});

test('should reject invalid data uri', async t => {
	await t.throwsAsync(fetch('data:@@@@'), {message: /malformed data: URI/});
});
