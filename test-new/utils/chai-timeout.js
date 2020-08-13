import pTimeout from 'p-timeout';

export default ({Assertion}, utils) => {
	utils.addProperty(Assertion.prototype, 'timeout', async function () {
		let timeouted = false;
		await pTimeout(this._obj, 150, () => {
			timeouted = true;
		});
		return this.assert(
			timeouted,
			'expected promise to timeout but it was resolved',
			'expected promise not to timeout but it timed out'
		);
	});
};
