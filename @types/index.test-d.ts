import {expectType, expectAssignable} from 'tsd';
import AbortController from 'abort-controller';
import Blob from 'fetch-blob';

import fetch, {Request, Response, Headers, Body, FetchError, AbortError} from '.';
import * as _fetch from '.';

async function run() {
	const getResponse = await fetch('https://bigfile.com/test.zip');
	expectType<boolean>(getResponse.ok);
	expectType<number>(getResponse.size);
	expectType<number>(getResponse.status);
	expectType<string>(getResponse.statusText);
	expectType<() => Response>(getResponse.clone);

	// Test async iterator over body
	expectType<NodeJS.ReadableStream | null>(getResponse.body);
	if (getResponse.body) {
		for await (const data of getResponse.body) {
			expectType<Buffer | string>(data);
		}
	}

	// Test Buffer
	expectType<Buffer>(await getResponse.buffer());

	// Test arrayBuffer
	expectType<ArrayBuffer>(await getResponse.arrayBuffer());

	// Test JSON, returns unknown
	expectType<unknown>(await getResponse.json());

	// Headers iterable
	expectType<Headers>(getResponse.headers);

	// Post
	try {
		const request = new Request('http://byjka.com/buka');
		expectType<string>(request.url);
		expectType<Headers>(request.headers);

		const headers = new Headers({byaka: 'buke'});
		expectType<(a: string, b: string) => void>(headers.append);
		expectType<(a: string) => string | null>(headers.get);
		expectType<(name: string, value: string) => void>(headers.set);
		expectType<(name: string) => void>(headers.delete);
		expectType<() => IterableIterator<string>>(headers.keys);
		expectType<() => IterableIterator<[string, string]>>(headers.entries);
		expectType<() => IterableIterator<[string, string]>>(headers[Symbol.iterator]);

		const postResponse = await fetch(request, {method: 'POST', headers});
		expectType<Blob>(await postResponse.blob());
	} catch (error: unknown) {
		if (error instanceof FetchError) {
			throw new TypeError(error.errno as string | undefined);
		}

		if (error instanceof AbortError) {
			throw error;
		}
	}

	// export *
	const wildResponse = await _fetch.default('https://google.com');
	expectType<boolean>(wildResponse.ok);
	expectType<number>(wildResponse.size);
	expectType<number>(wildResponse.status);
	expectType<string>(wildResponse.statusText);
	expectType<() => Response>(wildResponse.clone);

	// Others
	const response = new Response();
	expectType<string>(response.url);
	expectAssignable<Body>(response);

	const abortController = new AbortController();
	const request = new Request('url', {signal: abortController.signal});
	expectAssignable<Body>(request);

	/* eslint-disable no-new */
	new Headers({Header: 'value'});
	// new Headers(['header', 'value']); // should not work
	new Headers([['header', 'value']]);
	new Headers(new Headers());
	new Headers([
		new Set(['a', '1']),
		['b', '2'],
		new Map([['a', null], ['3', null]]).keys()
	]);
	/* eslint-enable no-new */
}

run().finally(() => {
	console.log('✅');
});
