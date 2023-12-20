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
                    'postcss-import',
                    'postcss-preset-env',
                    'postcss-each',
                    'postcss-mixins',
                    'postcss-conditionals-renewed',
                    'postcss-at-rules-variables',
                    'autoprefixer',
                    'tailwindcss',
                    '@tailwindcss/forms',
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
                './.template-lintrc.js',
                './ember-cli-build.js',
                './index.js',
                './testem.js',
                './blueprints/*/index.js',
                './config/**/*.js',
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
    ],
};
