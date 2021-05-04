import chai from 'chai';

import fetch, {Request, Headers} from '../src/index.js';
import {
	DEFAULT_REFERRER_POLICY, ReferrerPolicy, stripURLForUseAsAReferrer, validateReferrerPolicy,
	isOriginPotentiallyTrustworthy, isUrlPotentiallyTrustworthy, determineRequestsReferrer,
	parseReferrerPolicyFromHeader
} from '../src/utils/referrer.js';
import TestServer from './utils/server.js';

const {expect} = chai;

describe('fetch() with referrer and referrerPolicy', () => {
	const local = new TestServer();
	let base;

	before(async () => {
		await local.start();
		base = `http://${local.hostname}:${local.port}/`;
	});

	after(async () => {
		return local.stop();
	});

	it('should send request without a referrer by default', () => {
		return fetch(`${base}inspect`).then(res => res.json()).then(res => {
			expect(res.headers.referer).to.be.undefined;
		});
	});

	it('should send request with a referrer', () => {
		return fetch(`${base}inspect`, {
			referrer: base,
			referrerPolicy: 'unsafe-url'
		}).then(res => res.json()).then(res => {
			expect(res.headers.referer).to.equal(base);
		});
	});

	it('should send request with referrerPolicy strict-origin-when-cross-origin by default', () => {
		return Promise.all([
			fetch(`${base}inspect`, {
				referrer: base
			}).then(res => res.json()).then(res => {
				expect(res.headers.referer).to.equal(base);
			}),
			fetch(`${base}inspect`, {
				referrer: 'https://example.com'
			}).then(res => res.json()).then(res => {
				expect(res.headers.referer).to.be.undefined;
			})
		]);
	});

	it('should send request with a referrer and respect redirected referrer-policy', () => {
		return Promise.all([
			fetch(`${base}redirect/referrer-policy`, {
				referrer: base
			}).then(res => res.json()).then(res => {
				expect(res.headers.referer).to.equal(base);
			}),
			fetch(`${base}redirect/referrer-policy`, {
				referrer: 'https://example.com'
			}).then(res => res.json()).then(res => {
				expect(res.headers.referer).to.be.undefined;
			}),
			fetch(`${base}redirect/referrer-policy`, {
				referrer: 'https://example.com',
				referrerPolicy: 'unsafe-url'
			}).then(res => res.json()).then(res => {
				expect(res.headers.referer).to.equal('https://example.com/');
			}),
			fetch(`${base}redirect/referrer-policy/same-origin`, {
				referrer: 'https://example.com',
				referrerPolicy: 'unsafe-url'
			}).then(res => res.json()).then(res => {
				expect(res.headers.referer).to.undefined;
			})
		]);
	});
});

describe('Request constructor', () => {
	describe('referrer', () => {
		it('should leave referrer undefined by default', () => {
			const req = new Request('http://example.com');
			expect(req.referrer).to.be.undefined;
		});

		it('should accept empty string referrer as no-referrer', () => {
			const referrer = '';
			const req = new Request('http://example.com', {referrer});
			expect(req.referrer).to.equal(referrer);
		});

		it('should accept about:client referrer as client', () => {
			const referrer = 'about:client';
			const req = new Request('http://example.com', {referrer});
			expect(req.referrer).to.equal(referrer);
		});

		it('should accept about://client referrer as client', () => {
			const req = new Request('http://example.com', {referrer: 'about://client'});
			expect(req.referrer).to.equal('about:client');
		});

		it('should accept a string URL referrer', () => {
			const referrer = 'http://example.com/';
			const req = new Request('http://example.com', {referrer});
			expect(req.referrer).to.equal(referrer);
		});

		it('should accept a URL referrer', () => {
			const referrer = new URL('http://example.com');
			const req = new Request('http://example.com', {referrer});
			expect(req.referrer).to.equal(referrer.toString());
		});

		it('should accept a referrer from input', () => {
			const referrer = 'http://example.com/';
			const req = new Request(new Request('http://example.com', {referrer}));
			expect(req.referrer).to.equal(referrer.toString());
		});

		it('should throw a TypeError for an invalid URL', () => {
			expect(() => {
				const req = new Request('http://example.com', {referrer: 'foobar'});
				expect.fail(req);
			}).to.throw(TypeError, 'Invalid URL: foobar');
		});
	});

	describe('referrerPolicy', () => {
		it('should default refererPolicy to empty string', () => {
			const req = new Request('http://example.com');
			expect(req.referrerPolicy).to.equal('');
		});

		it('should accept refererPolicy', () => {
			const referrerPolicy = 'unsafe-url';
			const req = new Request('http://example.com', {referrerPolicy});
			expect(req.referrerPolicy).to.equal(referrerPolicy);
		});

		it('should accept referrerPolicy from input', () => {
			const referrerPolicy = 'unsafe-url';
			const req = new Request(new Request('http://example.com', {referrerPolicy}));
			expect(req.referrerPolicy).to.equal(referrerPolicy);
		});

		it('should throw a TypeError for an invalid referrerPolicy', () => {
			expect(() => {
				const req = new Request('http://example.com', {referrerPolicy: 'foobar'});
				expect.fail(req);
			}).to.throw(TypeError, 'Invalid referrerPolicy: foobar');
		});
	});
});

describe('utils/referrer', () => {
	it('default policy should be strict-origin-when-cross-origin', () => {
		expect(DEFAULT_REFERRER_POLICY).to.equal('strict-origin-when-cross-origin');
	});

	describe('stripURLForUseAsAReferrer', () => {
		it('should return no-referrer for null/undefined URL', () => {
			expect(stripURLForUseAsAReferrer(undefined)).to.equal('no-referrer');
			expect(stripURLForUseAsAReferrer(null)).to.equal('no-referrer');
		});

		it('should return no-referrer for about:, blob:, and data: URLs', () => {
			expect(stripURLForUseAsAReferrer('about:client')).to.equal('no-referrer');
			expect(stripURLForUseAsAReferrer('blob:theblog')).to.equal('no-referrer');
			expect(stripURLForUseAsAReferrer('data:,thedata')).to.equal('no-referrer');
		});

		it('should strip the username, password, and hash', () => {
			const urlStr = 'http://foo:bar@example.com/foo?q=search#theanchor';
			expect(stripURLForUseAsAReferrer(urlStr).toString())
				.to.equal('http://example.com/foo?q=search');
		});

		it('should strip the pathname and query when origin-only', () => {
			const urlStr = 'http://foo:bar@example.com/foo?q=search#theanchor';
			expect(stripURLForUseAsAReferrer(urlStr, true).toString())
				.to.equal('http://example.com/');
		});
	});

	describe('validateReferrerPolicy', () => {
		it('should return the referrer policy', () => {
			for (const referrerPolicy of ReferrerPolicy) {
				expect(validateReferrerPolicy(referrerPolicy)).to.equal(referrerPolicy);
			}
		});

		it('should throw a TypeError for invalid referrer policies', () => {
			expect(validateReferrerPolicy.bind(null, undefined))
				.to.throw(TypeError, 'Invalid referrerPolicy: undefined');
			expect(validateReferrerPolicy.bind(null, null))
				.to.throw(TypeError, 'Invalid referrerPolicy: null');
			expect(validateReferrerPolicy.bind(null, false))
				.to.throw(TypeError, 'Invalid referrerPolicy: false');
			expect(validateReferrerPolicy.bind(null, 0))
				.to.throw(TypeError, 'Invalid referrerPolicy: 0');
			expect(validateReferrerPolicy.bind(null, 'always'))
				.to.throw(TypeError, 'Invalid referrerPolicy: always');
		});
	});

	const testIsOriginPotentiallyTrustworthyStatements = func => {
		it('should be potentially trustworthy for HTTPS and WSS URLs', () => {
			expect(func(new URL('https://example.com'))).to.be.true;
			expect(func(new URL('wss://example.com'))).to.be.true;
		});

		it('should be potentially trustworthy for loopback IP address URLs', () => {
			expect(func(new URL('http://127.0.0.1'))).to.be.true;
			expect(func(new URL('http://127.1.2.3'))).to.be.true;
			expect(func(new URL('ws://[::1]'))).to.be.true;
		});

		it('should not be potentially trustworthy for "localhost" URLs', () => {
			expect(func(new URL('http://localhost'))).to.be.false;
		});

		it('should be potentially trustworthy for file: URLs', () => {
			expect(func(new URL('file://foo/bar'))).to.be.true;
		});

		it('should not be potentially trustworthy for all other origins', () => {
			expect(func(new URL('http://example.com'))).to.be.false;
			expect(func(new URL('ws://example.com'))).to.be.false;
		});
	};

	describe('isOriginPotentiallyTrustworthy', () => {
		testIsOriginPotentiallyTrustworthyStatements(isOriginPotentiallyTrustworthy);
	});

	describe('isUrlPotentiallyTrustworthy', () => {
		it('should be potentially trustworthy for about:blank and about:srcdoc', () => {
			expect(isUrlPotentiallyTrustworthy(new URL('about:blank'))).to.be.true;
			expect(isUrlPotentiallyTrustworthy(new URL('about:srcdoc'))).to.be.true;
		});

		it('should be potentially trustworthy for data: URLs', () => {
			expect(isUrlPotentiallyTrustworthy(new URL('data:,thedata'))).to.be.true;
		});

		it('should be potentially trustworthy for blob: and filesystem: URLs', () => {
			expect(isUrlPotentiallyTrustworthy(new URL('blob:theblob'))).to.be.true;
			expect(isUrlPotentiallyTrustworthy(new URL('filesystem:thefilesystem'))).to.be.true;
		});

		testIsOriginPotentiallyTrustworthyStatements(isUrlPotentiallyTrustworthy);
	});

	describe('determineRequestsReferrer', () => {
		it('should return null for no-referrer or empty referrerPolicy', () => {
			expect(determineRequestsReferrer({referrer: 'no-referrer'})).to.be.null;
			expect(determineRequestsReferrer({referrerPolicy: ''})).to.be.null;
		});

		it('should return no-referrer for about:client', () => {
			expect(determineRequestsReferrer({
				referrer: 'about:client',
				referrerPolicy: DEFAULT_REFERRER_POLICY
			})).to.equal('no-referrer');
		});

		it('should return just the origin for URLs over 4096 characters', () => {
			expect(determineRequestsReferrer({
				url: 'http://foo:bar@example.com/foo?q=search#theanchor',
				referrer: `http://example.com/${'0'.repeat(4096)}`,
				referrerPolicy: DEFAULT_REFERRER_POLICY
			}).toString()).to.equal('http://example.com/');
		});

		it('should alter the referrer URL by callback', () => {
			expect(determineRequestsReferrer({
				url: 'http://foo:bar@example.com/foo?q=search#theanchor',
				referrer: 'http://foo:bar@example.com/foo?q=search#theanchor',
				referrerPolicy: 'unsafe-url'
			}, {
				referrerURLCallback: referrerURL => {
					return new URL(referrerURL.toString().replace(/^http:/, 'myprotocol:'));
				}
			}).toString()).to.equal('myprotocol://example.com/foo?q=search');
		});

		it('should alter the referrer origin by callback', () => {
			expect(determineRequestsReferrer({
				url: 'http://foo:bar@example.com/foo?q=search#theanchor',
				referrer: 'http://foo:bar@example.com/foo?q=search#theanchor',
				referrerPolicy: 'origin'
			}, {
				referrerOriginCallback: referrerOrigin => {
					return new URL(referrerOrigin.toString().replace(/^http:/, 'myprotocol:'));
				}
			}).toString()).to.equal('myprotocol://example.com/');
		});

		it('should throw a TypeError for an invalid policy', () => {
			expect(() => {
				determineRequestsReferrer({
					url: 'http://foo:bar@example.com/foo?q=search#theanchor',
					referrer: 'http://foo:bar@example.com/foo?q=search#theanchor',
					referrerPolicy: 'always'
				});
			}).to.throw(TypeError, 'Invalid referrerPolicy: always');
		});

		const referrerPolicyTestLabel = ({currentURLTrust, referrerURLTrust, sameOrigin}) => {
			if (currentURLTrust === null && referrerURLTrust === null && sameOrigin === null) {
				return 'Always';
			}

			const result = [];

			if (currentURLTrust !== null) {
				result.push(`Current URL is ${currentURLTrust ? '' : 'not '}potentially trustworthy`);
			}

			if (referrerURLTrust !== null) {
				result.push(`Referrer URL is ${referrerURLTrust ? '' : 'not '}potentially trustworthy`);
			}

			if (sameOrigin !== null) {
				result.push(`Current URL & Referrer URL do ${sameOrigin ? '' : 'not '}have same origin`);
			}

			return result.join(', ');
		};

		const referrerPolicyTests = (referrerPolicy, matrix) => {
			describe(`Referrer policy: ${referrerPolicy}`, () => {
				for (const {currentURLTrust, referrerURLTrust, sameOrigin, result} of matrix) {
					describe(referrerPolicyTestLabel({currentURLTrust, referrerURLTrust, sameOrigin}), () => {
						const requests = [];

						if (sameOrigin === true || sameOrigin === null) {
							requests.push({
								referrerPolicy,
								url: 'http://foo:bar@example.com/foo?q=search#theanchor',
								referrer: 'http://foo:bar@example.com/foo?q=search#theanchor'
							});
						}

						if (sameOrigin === false || sameOrigin === null) {
							requests.push({
								referrerPolicy,
								url: 'http://foo:bar@example2.com/foo?q=search#theanchor',
								referrer: 'http://foo:bar@example.com/foo?q=search#theanchor'
							});
						}

						let requestsLength = requests.length;
						if (currentURLTrust === null) {
							for (let i = 0; i < requestsLength; i++) {
								const req = requests[i];
								requests.push({...req, url: req.url.replace(/^http:/, 'https:')});
							}
						} else if (currentURLTrust === true) {
							for (let i = 0; i < requestsLength; i++) {
								const req = requests[i];
								req.url = req.url.replace(/^http:/, 'https:');
							}
						} else if (currentURLTrust === false) {
							// nothing to do, default is not potentially trustworthy
						} else {
							throw new TypeError(`Invalid currentURLTrust condition: ${currentURLTrust}`);
						}

						requestsLength = requests.length;
						if (referrerURLTrust === null) {
							for (let i = 0; i < requestsLength; i++) {
								const req = requests[i];

								if (sameOrigin) {
									if (req.url.startsWith('https:')) {
										requests.splice(i, 1);
									} else {
										continue;
									}
								}

								requests.push({...req, referrer: req.referrer.replace(/^http:/, 'https:')});
							}
						} else if (referrerURLTrust === true) {
							for (let i = 0; i < requestsLength; i++) {
								const req = requests[i];
								req.referrer = req.referrer.replace(/^http:/, 'https:');
							}
						} else if (referrerURLTrust === false) {
							// nothing to do, default is not potentially trustworthy
						} else {
							throw new TypeError(`Invalid referrerURLTrust condition: ${referrerURLTrust}`);
						}

						it('should have tests', () => {
							expect(requests).to.not.be.empty;
						});

						for (const req of requests) {
							it(`should return ${result} for url: ${req.url}, referrer: ${req.referrer}`, () => {
								if (result === 'no-referrer') {
									return expect(determineRequestsReferrer(req).toString())
										.to.equal('no-referrer');
								}

								if (result === 'referrer-origin') {
									const referrerOrigih = stripURLForUseAsAReferrer(req.referrer, true);
									return expect(determineRequestsReferrer(req).toString())
										.to.equal(referrerOrigih.toString());
								}

								if (result === 'referrer-url') {
									const referrerURL = stripURLForUseAsAReferrer(req.referrer);
									return expect(determineRequestsReferrer(req).toString())
										.to.equal(referrerURL.toString());
								}

								throw new TypeError(`Invalid result: ${result}`);
							});
						}
					});
				}
			});
		};

		// 3.1 no-referrer
		referrerPolicyTests('no-referrer', [
			{currentURLTrust: null, referrerURLTrust: null, sameOrigin: null, result: 'no-referrer'}
		]);

		// 3.2 no-referrer-when-downgrade
		referrerPolicyTests('no-referrer-when-downgrade', [
			{currentURLTrust: false, referrerURLTrust: true, sameOrigin: null, result: 'no-referrer'},
			{currentURLTrust: null, referrerURLTrust: false, sameOrigin: null, result: 'referrer-url'},
			{currentURLTrust: true, referrerURLTrust: true, sameOrigin: null, result: 'referrer-url'}
		]);

		// 3.3 same-origin
		referrerPolicyTests('same-origin', [
			{currentURLTrust: null, referrerURLTrust: null, sameOrigin: false, result: 'no-referrer'},
			{currentURLTrust: null, referrerURLTrust: null, sameOrigin: true, result: 'referrer-url'}
		]);

		// 3.4 origin
		referrerPolicyTests('origin', [
			{currentURLTrust: null, referrerURLTrust: null, sameOrigin: null, result: 'referrer-origin'}
		]);

		// 3.5 strict-origin
		referrerPolicyTests('strict-origin', [
			{currentURLTrust: false, referrerURLTrust: true, sameOrigin: null, result: 'no-referrer'},
			{currentURLTrust: null, referrerURLTrust: false, sameOrigin: null, result: 'referrer-origin'},
			{currentURLTrust: true, referrerURLTrust: true, sameOrigin: null, result: 'referrer-origin'}
		]);

		// 3.6 origin-when-cross-origin
		referrerPolicyTests('origin-when-cross-origin', [
			{currentURLTrust: null, referrerURLTrust: null, sameOrigin: false, result: 'referrer-origin'},
			{currentURLTrust: null, referrerURLTrust: null, sameOrigin: true, result: 'referrer-url'}
		]);

		// 3.7 strict-origin-when-cross-origin
		referrerPolicyTests('strict-origin-when-cross-origin', [
			{currentURLTrust: false, referrerURLTrust: true, sameOrigin: false, result: 'no-referrer'},
			{currentURLTrust: null, referrerURLTrust: false, sameOrigin: false,
				result: 'referrer-origin'},
			{currentURLTrust: true, referrerURLTrust: true, sameOrigin: false, result: 'referrer-origin'},
			{currentURLTrust: null, referrerURLTrust: null, sameOrigin: true, result: 'referrer-url'}
		]);

		// 3.8 unsafe-url
		referrerPolicyTests('unsafe-url', [
			{currentURLTrust: null, referrerURLTrust: null, sameOrigin: null, result: 'referrer-url'}
		]);
	});

	describe('parseReferrerPolicyFromHeader', () => {
		it('should return an empty string when no referrer policy is found', () => {
			expect(parseReferrerPolicyFromHeader(new Headers())).to.equal('');
			expect(parseReferrerPolicyFromHeader(
				new Headers([['Referrer-Policy', '']])
			)).to.equal('');
		});

		it('should return the last valid referrer policy', () => {
			expect(parseReferrerPolicyFromHeader(
				new Headers([['Referrer-Policy', 'no-referrer']])
			)).to.equal('no-referrer');
			expect(parseReferrerPolicyFromHeader(
				new Headers([['Referrer-Policy', 'no-referrer unsafe-url']])
			)).to.equal('unsafe-url');
			expect(parseReferrerPolicyFromHeader(
				new Headers([['Referrer-Policy', 'foo no-referrer bar']])
			)).to.equal('no-referrer');
			expect(parseReferrerPolicyFromHeader(
				new Headers([['Referrer-Policy', 'foo no-referrer unsafe-url bar']])
			)).to.equal('unsafe-url');
		});

		it('should use all Referrer-Policy headers', () => {
			expect(parseReferrerPolicyFromHeader(
				new Headers([
					['Referrer-Policy', 'no-referrer'],
					['Referrer-Policy', '']
				])
			)).to.equal('no-referrer');
			expect(parseReferrerPolicyFromHeader(
				new Headers([
					['Referrer-Policy', 'no-referrer'],
					['Referrer-Policy', 'unsafe-url']
				])
			)).to.equal('unsafe-url');
			expect(parseReferrerPolicyFromHeader(
				new Headers([
					['Referrer-Policy', 'no-referrer foo'],
					['Referrer-Policy', 'bar unsafe-url wow']
				])
			)).to.equal('unsafe-url');
			expect(parseReferrerPolicyFromHeader(
				new Headers([
					['Referrer-Policy', 'no-referrer unsafe-url'],
					['Referrer-Policy', 'foo bar']
				])
			)).to.equal('unsafe-url');
		});
	});
});
