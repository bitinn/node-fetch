export default {
	files: ['test-new/**', '!test-new/utils', '!test-new/commonjs'],
	ignoredByWatcher: ['{coverage,docs,test-new,@types}/**'],
	nodeArguments: [
		'--experimental-modules'
	]
};
