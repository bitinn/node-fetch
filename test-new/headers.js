import test from 'ava';
import {Headers} from '../src/index.js';

test('should have attributes conforming to Web IDL', t => {
	const headers = new Headers();
	const enumerableProperties = [];

	// eslint-disable-next-line guard-for-in
	for (const property in headers) {
		enumerableProperties.push(property);
	}

	const toCheck = [
		'get',
		'forEach',
		'values',
		'entries',
		'append',
		'delete',
		'getAll',
		'has',
		'set',
		'sort',
		'keys'
	];

	t.deepEqual(enumerableProperties, toCheck);
	t.is(Object.entries(headers).length, 0);
});

test('should allow iterating through all headers with forEach', t => {
	const headers = new Headers([
		['b', '2'],
		['c', '4'],
		['b', '3'],
		['a', '1']
	]);

	const result = [];
	headers.forEach((value, key) => {
		result.push([key, value]);
	});

	t.deepEqual(result, [
		['a', '1'],
		['b', '2, 3'],
		['c', '4']
	]);
});

test('should allow iterating through all headers with for-of loop', t => {
	const headers = new Headers([
		['b', '2'],
		['c', '4'],
		['a', '1']
	]);
	headers.append('b', '3');

	const result = [];
	for (const pair of headers) {
		result.push(pair);
	}

	t.is(typeof headers[Symbol.iterator], 'function');
	t.deepEqual(result, [
		['a', '1'],
		['b', '2, 3'],
		['c', '4']
	]);
});

test('should allow iterating through all headers with entries()', t => {
	const headers = new Headers([
		['b', '2'],
		['c', '4'],
		['a', '1']
	]);
	headers.append('b', '3');

	const result = [];
	for (const pair of headers.entries()) {
		result.push([pair[0], pair[1]]);
	}

	t.is(typeof headers.entries()[Symbol.iterator], 'function');
	t.deepEqual(result, [
		['a', '1'],
		['b', '2, 3'],
		['c', '4']
	]);
});

test('should allow iterating through all headers with keys()', t => {
	const headers = new Headers([
		['b', '2'],
		['c', '4'],
		['a', '1']
	]);
	headers.append('b', '3');

	const result = [];
	for (const key of headers.keys()) {
		result.push(key);
	}

	t.is(typeof headers.keys()[Symbol.iterator], 'function');
	t.deepEqual(result, ['a', 'b', 'c']);
});

test('should allow iterating through all headers with values()', t => {
	const headers = new Headers([
		['b', '2'],
		['c', '4'],
		['a', '1']
	]);
	headers.append('b', '3');

	const result = [];
	for (const value of headers.values()) {
		result.push(value);
	}

	t.is(typeof headers.values()[Symbol.iterator], 'function');
	t.deepEqual(result, ['1', '2, 3', '4']);
});

test('should reject illegal header', t => {
	const headers = new Headers();

	t.throws(() => new Headers({'He y': 'ok'}), {instanceOf: TypeError});
	t.throws(() => new Headers({'Hé-y': 'ok'}), {instanceOf: TypeError});
	t.throws(() => new Headers({'He-y': 'ăk'}), {instanceOf: TypeError});
	t.throws(() => new Headers({'He-y': 'ăk'}), {instanceOf: TypeError});
	t.throws(() => headers.append('Hé-y', 'ok'), {instanceOf: TypeError});
	t.throws(() => headers.delete('Hé-y'), {instanceOf: TypeError});
	t.throws(() => headers.has('Hé-y'), {instanceOf: TypeError});
	t.throws(() => headers.get('Hé-y'), {instanceOf: TypeError});
	t.throws(() => headers.set('Hé-y', 'ok'), {instanceOf: TypeError});
	// Should reject empty header
	t.throws(() => headers.append('', 'ok'), {instanceOf: TypeError});
});

test('should ignore unsupported attributes while reading headers', t => {
	const FakeHeader = function () { };
	FakeHeader.prototype.z = 'fake';

	const response = new FakeHeader();
	response.a = 'string';
	response.b = ['1', '2'];
	response.c = '';
	response.d = [];
	response.e = 1;
	response.f = [1, 2];
	response.g = {a: 1};
	response.h = undefined;
	response.i = null;
	response.j = Number.NaN;
	response.k = true;
	response.l = false;
	response.m = Buffer.from('test');

	const h1 = new Headers(response);
	h1.set('n', [1, 2]);
	h1.append('n', ['3', 4]);

	const h1Raw = h1.raw();

	t.true(h1Raw.a.includes('string'));
	t.true(h1Raw.b.includes('1,2'));
	t.true(h1Raw.c.includes(''));
	t.true(h1Raw.d.includes(''));
	t.true(h1Raw.e.includes('1'));
	t.true(h1Raw.f.includes('1,2'));
	t.true(h1Raw.g.includes('[object Object]'));
	t.true(h1Raw.h.includes('undefined'));
	t.true(h1Raw.i.includes('null'));
	t.true(h1Raw.j.includes('NaN'));
	t.true(h1Raw.k.includes('true'));
	t.true(h1Raw.l.includes('false'));
	t.true(h1Raw.m.includes('test'));
	t.true(h1Raw.n.includes('1,2'));
	t.true(h1Raw.n.includes('3,4'));

	t.is(h1Raw.z, undefined);
});

test('should wrap headers', t => {
	const h1 = new Headers({
		a: '1'
	});
	const h1Raw = h1.raw();

	const h2 = new Headers(h1);
	h2.set('b', '1');
	const h2Raw = h2.raw();

	const h3 = new Headers(h2);
	h3.append('a', '2');
	const h3Raw = h3.raw();

	t.true(h1Raw.a.includes('1'));
	t.false(h1Raw.a.includes('2'));

	t.true(h2Raw.a.includes('1'));
	t.false(h2Raw.a.includes('2'));
	t.true(h2Raw.b.includes('1'));

	t.true(h3Raw.a.includes('1'));
	t.true(h3Raw.a.includes('2'));
	t.true(h3Raw.b.includes('1'));
});

test('should accept headers as an iterable of tuples', t => {
	let headers;

	headers = new Headers([
		['a', '1'],
		['b', '2'],
		['a', '3']
	]);
	t.is(headers.get('a'), '1, 3');
	t.is(headers.get('b'), '2');

	headers = new Headers([
		new Set(['a', '1']),
		['b', '2'],
		new Map([['a', null], ['3', null]]).keys()
	]);
	t.is(headers.get('a'), '1, 3');
	t.is(headers.get('b'), '2');

	headers = new Headers(new Map([
		['a', '1'],
		['b', '2']
	]));
	t.is(headers.get('a'), '1');
	t.is(headers.get('b'), '2');
});

test('should throw a TypeError if non-tuple exists in a headers initializer', t => {
	t.throws(() => new Headers([['b', '2', 'huh?']]), {instanceOf: TypeError});
	t.throws(() => new Headers(['b2']), {instanceOf: TypeError});
	t.throws(() => new Headers('b2'), {instanceOf: TypeError});
	t.throws(() => new Headers({[Symbol.iterator]: 42}), {instanceOf: TypeError});
});
