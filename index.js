'use strict';
const { name } = require('./package');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const path = require('path');
const postcssImport = require('postcss-import');
const postcssPresetEnv = require('postcss-preset-env');
const postcssEach = require('postcss-each');
const postcssMixins = require('postcss-mixins');
const postcssConditionals = require('postcss-conditionals-renewed');
const postcssAtRulesVariables = require('postcss-at-rules-variables');
const autoprefixer = require('autoprefixer');
const tailwind = require('tailwindcss');

const tailwindConfigPath = path.resolve(__dirname, 'tailwind.js');
const postcssOptions = {
    compile: {
        enabled: true,
        cacheInclude: [/.*\.(css|scss|hbs)$/, /.*\/tailwind\/config\.js$/, /.*tailwind\.js$/],
        plugins: [
            postcssAtRulesVariables,
            postcssImport({
                path: ['node_modules'],
                plugins: [postcssAtRulesVariables, postcssImport],
            }),
            postcssMixins,
            postcssPresetEnv({ stage: 1 }),
            postcssEach,
            tailwind(tailwindConfigPath),
            autoprefixer,
        ],
    },
    filter: {
        enabled: true,
        plugins: [postcssAtRulesVariables, postcssMixins, postcssEach, postcssConditionals, tailwind(tailwindConfigPath)],
    },
};

module.exports = {
    name,

    options: {
        autoImport: {
            publicAssetsURL: '/assets',
            alias: {
                libphonenumber: 'intl-tel-input/build/js/utils.js',
            },
        },
        postcssOptions,
    },

    included: function (app) {
        this._super.included.apply(this, arguments);

        // PostCSS
        app.options = app.options || {};
        app.options.postcssOptions = postcssOptions;

        // Import the `intlTelInput.min.css` file and append it to the parent application's `vendor.css`
        this.import('node_modules/intl-tel-input/build/css/intlTelInput.min.css');
    },

    treeForPublic: function () {
        const publicTree = this._super.treeForPublic.apply(this, arguments);

        // Use a Funnel to copy the `utils.js` file to `assets/libphonenumber`
        const intlTelInputPath = path.dirname(require.resolve('intl-tel-input'));
        const addonTree = [
            new Funnel(`${intlTelInputPath}/build/js`, {
                include: ['utils.js'],
                destDir: 'assets/libphonenumber',
            }),
            new Funnel(`${intlTelInputPath}/build/img`, {
                destDir: 'img',
                overwrite: false,
            }),
            new Funnel(path.join(__dirname, 'assets'), {
                destDir: '/',
            }),
        ];

        // Merge the addon tree with the existing tree
        return publicTree ? new MergeTrees([publicTree, ...addonTree], { overwrite: true }) : new MergeTrees([...addonTree], { overwrite: true });
    },

    isDevelopingAddon: function () {
        return true;
    },
};
