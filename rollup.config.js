import isBuiltin from 'is-builtin-module';
import babel from 'rollup-plugin-babel';
import tweakDefault from './build/rollup-plugin';

process.env.BABEL_ENV = 'rollup';

export default {
  input: 'src/index.js',
  output: [
    { file: 'lib/index.js', format: 'cjs', exports: 'named' },
    { file: 'lib/index.es.js', format: 'es', exports: 'named', intro: 'process.emitWarning("The .es.js file is deprecated. Use .mjs instead.");' },
    { file: 'lib/index.mjs', format: 'es', exports: 'named' },
  ],
  plugins: [
    babel({
      runtimeHelpers: true
    }),
    tweakDefault()
  ],
  external: function (id) {
    if (isBuiltin(id)) {
      return true;
    }
    id = id.split('/').slice(0, id[0] === '@' ? 2 : 1).join('/');
    return !!(require('./package.json').dependencies || {})[id];
  }
};
