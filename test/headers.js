import {format} from 'util';
import chai from 'chai';
import chaiIterator from 'chai-iterator';
import {Headers} from '../src/index.js';

chai.use(chaiIterator);

const {expect} = chai;

describe('Headers', () => {
	it('should have attributes conforming to Web IDL', () => {
		const headers = new Headers();
		expect(Object.getOwnPropertyNames(headers)).to.be.empty;
		const enumerableProperties = [];

		for (const property in headers) {
			enumerableProperties.push(property);
		}

		for (const toCheck of [
			'append',
			'delete',
			'entries',
			'forEach',
			'get',
			'has',
			'keys',
			'set',
			'values'
		]) {
			expect(enumerableProperties).to.contain(toCheck);
		}
	});

	it('should allow iterating through all headers with forEach', () => {
		const headers = new Headers([
			['b', '2'],
			['c', '4'],
			['b', '3'],
			['a', '1']
		]);
		expect(headers).to.have.property('forEach');

		const result = [];
		for (const [key, value] of headers.entries()) {
			result.push([key, value]);
		}

		expect(result).to.deep.equal([
			['a', '1'],
			['b', '2, 3'],
			['c', '4']
		]);
	});

	it('should be iterable with forEach', () => {
		const headers = new Headers();
		headers.append('Accept', 'application/json');
		headers.append('Accept', 'text/plain');
		headers.append('Content-Type', 'text/html');

		const results = [];
		headers.forEach((value, key, object) => {
			results.push({value, key, object});
		});

		expect(results.length).to.equal(2);
		expect({key: 'accept', value: 'application/json, text/plain', object: headers}).to.deep.equal(results[0]);
		expect({key: 'content-type', value: 'text/html', object: headers}).to.deep.equal(results[1]);
	});

	it('should set "this" to undefined by default on forEach', () => {
		const headers = new Headers({Accept: 'application/json'});
		headers.forEach(function () {
			expect(this).to.be.undefined;
		});
	});

	it('should accept thisArg as a second argument for forEach', () => {
		const headers = new Headers({Accept: 'application/json'});
		const thisArg = {};
		headers.forEach(function () {
			expect(this).to.equal(thisArg);
		}, thisArg);
	});

	it('should allow iterating through all headers with for-of loop', () => {
		const headers = new Headers([
			['b', '2'],
			['c', '4'],
			['a', '1']
		]);
		headers.append('b', '3');
		expect(headers).to.be.iterable;

		const result = [];
		for (const pair of headers) {
			result.push(pair);
		}

		expect(result).to.deep.equal([
			['a', '1'],
			['b', '2, 3'],
			['c', '4']
		]);
	});

	it('should allow iterating through all headers with entries()', () => {
		const headers = new Headers([
			['b', '2'],
			['c', '4'],
			['a', '1']
		]);
		headers.append('b', '3');

		expect(headers.entries()).to.be.iterable
			.and.to.deep.iterate.over([
				['a', '1'],
				['b', '2, 3'],
				['c', '4']
			]);
	});

	it('should allow iterating through all headers with keys()', () => {
		const headers = new Headers([
			['b', '2'],
			['c', '4'],
			['a', '1']
		]);
		headers.append('b', '3');

		expect(headers.keys()).to.be.iterable
			.and.to.iterate.over(['a', 'b', 'c']);
	});

	it('should allow iterating through all headers with values()', () => {
		const headers = new Headers([
			['b', '2'],
			['c', '4'],
			['a', '1']
		]);
		headers.append('b', '3');

		expect(headers.values()).to.be.iterable
			.and.to.iterate.over(['1', '2, 3', '4']);
	});

	it('should reject illegal header', () => {
		const headers = new Headers();
		expect(() => new Headers({'He y': 'ok'})).to.throw(TypeError);
		expect(() => new Headers({'Hé-y': 'ok'})).to.throw(TypeError);
		expect(() => new Headers({'He-y': 'ăk'})).to.throw(TypeError);
		expect(() => headers.append('Hé-y', 'ok')).to.throw(TypeError);
		expect(() => headers.delete('Hé-y')).to.throw(TypeError);
		expect(() => headers.get('Hé-y')).to.throw(TypeError);
		expect(() => headers.has('Hé-y')).to.throw(TypeError);
		expect(() => headers.set('Hé-y', 'ok')).to.throw(TypeError);
		// Should reject empty header
		expect(() => headers.append('', 'ok')).to.throw(TypeError);
	});

	it('should ignore unsupported attributes while reading headers', () => {
		const FakeHeader = function () {};
		// Prototypes are currently ignored
		// This might change in the future: #181
		FakeHeader.prototype.z = 'fake';

		const res = new FakeHeader();
		res.a = 'string';
		res.b = ['1', '2'];
		res.c = '';
		res.d = [];
		res.e = 1;
		res.f = [1, 2];
		res.g = {a: 1};
		res.h = undefined;
		res.i = null;
		res.j = Number.NaN;
		res.k = true;
		res.l = false;
		res.m = Buffer.from('test');

		const h1 = new Headers(res);
		h1.set('n', [1, 2]);
		h1.append('n', ['3', 4]);

		const h1Raw = h1.raw();

		expect(h1Raw.a).to.include('string');
		expect(h1Raw.b).to.include('1,2');
		expect(h1Raw.c).to.include('');
		expect(h1Raw.d).to.include('');
		expect(h1Raw.e).to.include('1');
		expect(h1Raw.f).to.include('1,2');
		expect(h1Raw.g).to.include('[object Object]');
		expect(h1Raw.h).to.include('undefined');
		expect(h1Raw.i).to.include('null');
		expect(h1Raw.j).to.include('NaN');
		expect(h1Raw.k).to.include('true');
		expect(h1Raw.l).to.include('false');
		expect(h1Raw.m).to.include('test');
		expect(h1Raw.n).to.include('1,2');
		expect(h1Raw.n).to.include('3,4');

		expect(h1Raw.z).to.be.undefined;
	});

	it('should wrap headers', () => {
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

		expect(h1Raw.a).to.include('1');
		expect(h1Raw.a).to.not.include('2');

		expect(h2Raw.a).to.include('1');
		expect(h2Raw.a).to.not.include('2');
		expect(h2Raw.b).to.include('1');

		expect(h3Raw.a).to.include('1');
		expect(h3Raw.a).to.include('2');
		expect(h3Raw.b).to.include('1');
	});

	it('should accept headers as an iterable of tuples', () => {
		let headers;

		headers = new Headers([
			['a', '1'],
			['b', '2'],
			['a', '3']
		]);
		expect(headers.get('a')).to.equal('1, 3');
		expect(headers.get('b')).to.equal('2');

		headers = new Headers([
			new Set(['a', '1']),
			['b', '2'],
			new Map([['a', null], ['3', null]]).keys()
		]);
		expect(headers.get('a')).to.equal('1, 3');
		expect(headers.get('b')).to.equal('2');

		headers = new Headers(new Map([
			['a', '1'],
			['b', '2']
		]));
		expect(headers.get('a')).to.equal('1');
		expect(headers.get('b')).to.equal('2');
	});

	it('should throw a TypeError if non-tuple exists in a headers initializer', () => {
		expect(() => new Headers([['b', '2', 'huh?']])).to.throw(TypeError);
		expect(() => new Headers(['b2'])).to.throw(TypeError);
		expect(() => new Headers('b2')).to.throw(TypeError);
		expect(() => new Headers({[Symbol.iterator]: 42})).to.throw(TypeError);
	});

	it('should use a custom inspect function', () => {
		const headers = new Headers([
			['Host', 'thehost'],
			['Host', 'notthehost'],
			['a', '1'],
			['b', '2'],
			['a', '3']
		]);

		// eslint-disable-next-line quotes
		expect(format(headers)).to.equal("{ a: [ '1', '3' ], b: '2', host: 'thehost' }");
	});
});
