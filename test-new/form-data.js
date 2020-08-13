import test from 'ava';
import FormData from 'formdata-node';
import Blob from 'fetch-blob';

import read from './utils/read-stream.js';
import {getFormDataLength, getBoundary, formDataIterator} from '../src/utils/form-data.js';

const carriage = '\r\n';
const getFooter = boundary => `--${boundary}--${carriage.repeat(2)}`;

test('should return a length for empty form-data', t => {
	const form = new FormData();
	const boundary = getBoundary();

	t.is(getFormDataLength(form, boundary), Buffer.byteLength(getFooter(boundary)));
});

test('should add a Blob field\'s size to the FormData length', t => {
	const form = new FormData();
	const boundary = getBoundary();

	const string = 'Hello, world!';
	const expected = Buffer.byteLength(
		`--${boundary}${carriage}` +
		`Content-Disposition: form-data; name="field"${carriage.repeat(2)}` +
		string +
		`${carriage}${getFooter(boundary)}`
	);

	form.set('field', string);

	t.is(getFormDataLength(form, boundary), expected);
});

test('should return a length for a Blob field', t => {
	const form = new FormData();
	const boundary = getBoundary();

	const blob = new Blob(['Hello, world!'], {type: 'text/plain'});

	form.set('blob', blob);

	const expected = blob.size + Buffer.byteLength(
		`--${boundary}${carriage}` +
		'Content-Disposition: form-data; name="blob"; ' +
		`filename="blob"${carriage}Content-Type: text/plain` +
		`${carriage.repeat(3)}${getFooter(boundary)}`
	);

	t.is(getFormDataLength(form, boundary), expected);
});

test('should create a body from empty form-data', async t => {
	const form = new FormData();
	const boundary = getBoundary();

	t.is(String(await read(formDataIterator(form, boundary))), getFooter(boundary));
});

test('should set default content-type', async t => {
	const form = new FormData();
	const boundary = getBoundary();

	form.set('blob', new Blob([]));

	t.true(String(await read(formDataIterator(form, boundary))).includes('Content-Type: application/octet-stream'));
});

test('should create a body with a FormData field', async t => {
	const form = new FormData();
	const boundary = getBoundary();
	const string = 'Hello, World!';

	form.set('field', string);

	const expected = `--${boundary}${carriage}` +
	`Content-Disposition: form-data; name="field"${carriage.repeat(2)}` +
	string +
	`${carriage}${getFooter(boundary)}`;

	t.is(String(await read(formDataIterator(form, boundary))), expected);
});

test('should create a body with a FormData Blob field', async t => {
	const form = new FormData();
	const boundary = getBoundary();

	const expected = `--${boundary}${carriage}` +
	'Content-Disposition: form-data; name="blob"; ' +
	`filename="blob"${carriage}Content-Type: text/plain${carriage.repeat(2)}` +
	'Hello, World!' +
	`${carriage}${getFooter(boundary)}`;

	form.set('blob', new Blob(['Hello, World!'], {type: 'text/plain'}));

	t.is(String(await read(formDataIterator(form, boundary))), expected);
});
