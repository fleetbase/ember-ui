/* eslint-env node */
'use strict';

const path = require('path');
const postcssImport = require('postcss-import');
const postcssPresetEnv = require('postcss-preset-env');
const postcssEach = require('postcss-each');
const postcssMixins = require('postcss-mixins');
const postcssConditionals = require('postcss-conditionals-renewed');
const postcssAtRulesVariables = require('postcss-at-rules-variables');
const autoprefixer = require('autoprefixer');
const tailwind = require('tailwindcss');

module.exports = function buildPostcssOptions(browsers) {
    const tailwindConfigPath = path.resolve(__dirname, '../tailwind.config.js');

    return {
        compile: {
            enabled: true,
            // The host tree contains compiled addon templates as JavaScript.
            // Include them so new utility classes invalidate the CSS cache.
            cacheInclude: [/.*\.(css|scss|hbs|js)$/],
            plugins: [
                postcssAtRulesVariables,
                postcssImport({
                    path: ['node_modules', path.resolve(__dirname, '../addon/styles')],
                    plugins: [postcssAtRulesVariables, postcssImport],
                }),
                postcssMixins,
                // Ember CLI's targets are not automatically forwarded to an
                // instantiated preset. Avoid polyfilling selectors the host supports.
                postcssPresetEnv({ stage: 1, browsers, autoprefixer: false }),
                postcssEach,
                tailwind(tailwindConfigPath),
                autoprefixer({ overrideBrowserslist: browsers }),
            ],
        },
        filter: {
            enabled: true,
            // Conditionals must run after compile has expanded loop variables
            // and mixins. Tailwind and the expanders have already finished.
            plugins: [postcssConditionals],
        },
    };
};
