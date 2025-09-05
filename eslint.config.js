import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import neverthrow from 'eslint-plugin-neverthrow';
import { fixupPluginRules } from '@eslint/compat';

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
	  globals: {
	    ...globals.browser,
	    ...globals.node
	  }
	}
  },
  {
    files: ['**/*.svelte'],

    languageOptions: {
	  parserOptions: {
	    parser: ts.parser,
      extraFileExtensions: ['.svelte'],
	  }
	}
  },
  {
    rules: {
      'quotes': ['error', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true }]
    }
  },
  {
    ignores: ['build/', '.svelte-kit/', 'dist/']
  },
  {
    plugins: {
      neverthrow: fixupPluginRules(neverthrow),
    }
  }
);
