import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'src/**/*', 'scripts/**/*', 'android/**/*']
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
