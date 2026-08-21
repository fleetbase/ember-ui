'use strict';

module.exports = {
    root: true,
    parser: '@babel/eslint-parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        requireConfigFile: false,
        babelOptions: {
            plugins: [['@babel/plugin-proposal-decorators', { decoratorsBeforeExport: true }]],
        },
    },
    plugins: ['ember'],
    extends: ['eslint:recommended', 'plugin:ember/recommended', 'plugin:prettier/recommended'],
    env: {
        browser: true,
    },
    globals: {
        module: 'readonly',
        require: 'readonly',
        socketClusterClient: 'readonly',
    },
    rules: {
        'ember/no-array-prototype-extensions': 'off',
        'ember/no-computed-properties-in-native-classes': 'off',
        'ember/no-classic-classes': 'off',
        'ember/no-empty-glimmer-component-classes': 'off',
        'n/no-unpublished-require': [
            'error',
            {
                allowModules: [
                    'resolve',
                    'postcss-import',
                    'postcss-preset-env',
                    'postcss-each',
                    'postcss-mixins',
                    'postcss-conditionals-renewed',
                    'postcss-at-rules-variables',
                    'broccoli-funnel',
                    'broccoli-merge-trees',
                    'autoprefixer',
                    'tailwindcss',
                    '@tailwindcss/forms',
                    // Build-time only: required from index.js when COVERAGE=true.
                    'ember-cli-code-coverage',
                ],
            },
        ],
    },
    overrides: [
        // node files
        {
            files: [
                './.eslintrc.js',
                './.prettierrc.js',
                './.stylelintrc.js',
                './ember-cli-build.js',
                './index.js',
                './testem.js',
                './blueprints/*/index.js',
                './config/**/*.js',
                './scripts/check-coverage.js',
                './scripts/check-coverage-test.js',
                './tests/dummy/config/**/*.js',
            ],
            parserOptions: {
                sourceType: 'script',
            },
            env: {
                browser: false,
                node: true,
            },
            extends: ['plugin:n/recommended'],
        },
        // QUnit test files. `no-hooks-from-ancestor-modules` is the one that matters most here:
        // a nested `module('…', function (hooks) { … })` shadows the outer hooks, which QUnit 3
        // turns into a hard error. It is easy to reintroduce and the suite stays green when you do.
        {
            files: ['tests/**/*-test.js'],
            plugins: ['qunit'],
            extends: ['plugin:qunit/recommended'],
            rules: {
                // Opinionated and noisy for this suite: most tests assert an obvious, fixed number
                // of things, and an expect() count that drifts is worse than none.
                'qunit/require-expect': 'off',
            },
        },
    ],
};
