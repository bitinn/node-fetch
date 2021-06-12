import {FormData} from 'formdata-node';
import Blob from 'fetch-blob';

import chai from 'chai';

import {getFormDataLength, getBoundary, formDataIterator} from '../src/utils/form-data.js';
import read from './utils/read-stream.js';

const {expect} = chai;

const carriage = '\r\n';

const getFooter = boundary => `--${boundary}--${carriage.repeat(2)}`;

describe('FormData', () => {
	it('should return a length for empty form-data', () => {
		const form = new FormData();
		const boundary = getBoundary();

		expect(getFormDataLength(form, boundary)).to.be.equal(Buffer.byteLength(getFooter(boundary)));
	});

	it('should add a Blob field\'s size to the FormData length', () => {
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

		expect(getFormDataLength(form, boundary)).to.be.equal(expected);
	});

	it('should return a length for a Blob field', () => {
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

		expect(getFormDataLength(form, boundary)).to.be.equal(expected);
	});

	it('should create a body from empty form-data', async () => {
		const form = new FormData();
		const boundary = getBoundary();

		expect(String(await read(formDataIterator(form, boundary)))).to.be.equal(getFooter(boundary));
	});

	it('should set default content-type', async () => {
		const form = new FormData();
		const boundary = getBoundary();

		form.set('blob', new Blob([]));

		expect(String(await read(formDataIterator(form, boundary)))).to.contain('Content-Type: application/octet-stream');
	});

	it('should create a body with a FormData field', async () => {
		const form = new FormData();
		const boundary = getBoundary();
		const string = 'Hello, World!';

		form.set('field', string);

		const expected = `--${boundary}${carriage}` +
		`Content-Disposition: form-data; name="field"${carriage.repeat(2)}` +
		string +
		`${carriage}${getFooter(boundary)}`;

		expect(String(await read(formDataIterator(form, boundary)))).to.be.equal(expected);
	});

	it('should create a body with a FormData Blob field', async () => {
		const form = new FormData();
		const boundary = getBoundary();

		const expected = `--${boundary}${carriage}` +
		'Content-Disposition: form-data; name="blob"; ' +
		`filename="blob"${carriage}Content-Type: text/plain${carriage.repeat(2)}` +
		'Hello, World!' +
		`${carriage}${getFooter(boundary)}`;

		form.set('blob', new Blob(['Hello, World!'], {type: 'text/plain'}));

		expect(String(await read(formDataIterator(form, boundary)))).to.be.equal(expected);
	});
});
