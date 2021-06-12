import chai from 'chai';
import fetch from '../src/index.js';

const {expect} = chai;

describe('external encoding', () => {
	describe('data uri', () => {
		it('should accept base64-encoded gif data uri', () => {
			return fetch('data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=').then(r => {
				expect(r.status).to.equal(200);
				expect(r.headers.get('Content-Type')).to.equal('image/gif');

				return r.buffer().then(b => {
					expect(b).to.be.an.instanceOf(Buffer);
				});
			});
		});

		it('should accept data uri with specified charset', async () => {
			const r = await fetch('data:text/plain;charset=UTF-8;page=21,the%20data:1234,5678');
			expect(r.status).to.equal(200);
			expect(r.headers.get('Content-Type')).to.equal('text/plain;charset=UTF-8;page=21');

			const b = await r.text();
			expect(b).to.equal('the data:1234,5678');
		});

		it('should accept data uri of plain text', () => {
			return fetch('data:,Hello%20World!').then(r => {
				expect(r.status).to.equal(200);
				expect(r.headers.get('Content-Type')).to.equal('text/plain;charset=US-ASCII');
				return r.text().then(t => expect(t).to.equal('Hello World!'));
			});
		});

		it('should reject invalid data uri', () => {
			return fetch('data:@@@@').catch(error => {
				expect(error).to.exist;
				expect(error.message).to.include('malformed data: URI');
			});
		});
	});
});
