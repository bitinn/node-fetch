export default async function readStream(stream) {
	const chunks = [];

	for await (const chunk of stream) {
		chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
	}

	return Buffer.concat(chunks);
}
