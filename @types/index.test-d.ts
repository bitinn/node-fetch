import { expectType, expectAssignable } from 'tsd';
import AbortController from 'abort-controller';
import Blob = require('fetch-blob');

import fetch, { Request, Response, Headers, Body, FetchError, AbortError } from '.';
import * as _fetch from '.';
import __fetch = require('.');

async function run() {
	const getRes = await fetch('https://bigfile.com/test.zip');
	expectType<boolean>(getRes.ok);
	expectType<number>(getRes.size);
	expectType<number>(getRes.status);
	expectType<string>(getRes.statusText);
	expectType<() => Response>(getRes.clone);

	// Test async iterator over body
	expectType<NodeJS.ReadableStream | null>(getRes.body);
	if (getRes.body) {
		for await (const data of getRes.body) {
			expectType<Buffer | string>(data);
		}
	}

	// Test Buffer
	expectType<Buffer>(await getRes.buffer());

	// Test arrayBuffer
	expectType<ArrayBuffer>(await getRes.arrayBuffer());

	// Test JSON, returns unknown
	expectType<unknown>(await getRes.json());

	// Headers iterable
	expectType<Headers>(getRes.headers);

	// Post
	try {
		const request = new Request('http://byjka.com/buka');
		expectType<string>(request.url);
		expectType<Headers>(request.headers);

		const headers = new Headers({ byaka: 'buke' });
		expectType<(a: string, b: string) => void>(headers.append);
		expectType<(a: string) => string | null>(headers.get);
		expectType<(name: string, value: string) => void>(headers.set);
		expectType<(name: string) => void>(headers.delete);
		expectType<() => IterableIterator<string>>(headers.keys);
		expectType<() => IterableIterator<[string, string]>>(headers.entries);
		expectType<() => IterableIterator<[string, string]>>(headers[Symbol.iterator]);

		const postRes = await fetch(request, { method: 'POST', headers });
		expectType<Blob>(await postRes.blob());
	} catch (error) {
		if (error instanceof FetchError) {
			throw new TypeError(error.errno);
		}

		if (error instanceof AbortError) {
			throw error;
		}
	}

	// export *
	const wildRes = await _fetch('https://google.com');
	expectType<boolean>(wildRes.ok);
	expectType<number>(wildRes.size);
	expectType<number>(wildRes.status);
	expectType<string>(wildRes.statusText);
	expectType<() => Response>(wildRes.clone);

	// export = require
	const reqRes = await __fetch('https://google.com');
	expectType<boolean>(reqRes.ok);
	expectType<number>(reqRes.size);
	expectType<number>(reqRes.status);
	expectType<string>(reqRes.statusText);
	expectType<() => Response>(reqRes.clone);

	// Others
	const response = new Response();
	expectType<string>(response.url);
	expectAssignable<Body>(response);

	const abortController = new AbortController()
	const request = new Request('url', { signal: abortController.signal });
	expectAssignable<Body>(request);

	new Headers({ 'Header': 'value' });
	// new Headers(['header', 'value']); // should not work
	new Headers([['header', 'value']]);
	new Headers(new Headers());
	new Headers([
		new Set(['a', '1']),
		['b', '2'],
		new Map([['a', null], ['3', null]]).keys()
	]);

	fetch.isRedirect = (code: number) => true;

	expectType<Response>(Response.redirect('https://google.com'));
	expectType<Response>(Response.redirect('https://google.com', 301));
}

run().finally(() => {
	console.log('✅');
});
