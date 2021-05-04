import {Readable} from 'stream';

// 64 KiB (same size chrome slice theirs blob into Uint8array's)
const POOL_SIZE = 65536;

/* c8 ignore start */
async function * read(blob) {
	let position = 0;
	while (position !== blob.size) {
		const chunk = blob.slice(position, Math.min(blob.size, position + POOL_SIZE));
		// eslint-disable-next-line no-await-in-loop
		const buffer = await chunk.arrayBuffer();
		position += buffer.byteLength;
		yield new Uint8Array(buffer);
	}
}
/* c8 ignore end */

export function blobToNodeStream(blob) {
	return Readable.from(blob.stream ? blob.stream() : read(blob), {
		objectMode: false
	});
}
