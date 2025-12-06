'use strict';
const { name } = require('./package');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const resolve = require('resolve');
const path = require('path');
const postcssImport = require('postcss-import');
const postcssPresetEnv = require('postcss-preset-env');
const postcssEach = require('postcss-each');
const postcssMixins = require('postcss-mixins');
const postcssConditionals = require('postcss-conditionals-renewed');
const postcssAtRulesVariables = require('postcss-at-rules-variables');
const autoprefixer = require('autoprefixer');
const tailwind = require('tailwindcss');

const tailwindConfigPath = path.resolve(__dirname, 'tailwind.config.js');
const postcssOptions = {
    compile: {
        enabled: true,
        cacheInclude: [/.*\.(css|scss|hbs)$/, /.*\/tailwind\/config\.js$/, /.*tailwind\.js$/],
        plugins: [
            postcssAtRulesVariables,
            postcssImport({
                path: ['node_modules', path.join(__dirname, 'addon/styles')],
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
        'ember-leaflet': {
            excludeCSS: true,
            excludeJS: true,
            excludeImages: true,
        },
        postcssOptions,
    },

    treeForStyles: function () {
        // Only provide styles to the root application, not to engines
        // This prevents engines from trying to compile ember-ui styles
        let parent = this.parent;
        while (parent) {
            const isEngine = parent.lazyLoading === true || (parent.lazyLoading && parent.lazyLoading.enabled === true);
            if (isEngine) {
                // Parent is an engine - don't provide styles
                return null;
            }
            parent = parent.parent;
        }

        // Parent is the root app - provide styles normally
        return this._super.treeForStyles ? this._super.treeForStyles.apply(this, arguments) : null;
    },

    included: function (app) {
        this._super.included.apply(this, arguments);

        // Get Application Host (skips engines, finds root app)
        app = this.findApplicationHost(app);

        // PostCSS Options - only applied to the root application
        // Engines are excluded by findApplicationHost, so they won't get these options
        app.options = app.options || {};
        app.options.postcssOptions = postcssOptions;

        // Import leaflet-src
        this.import('node_modules/leaflet/dist/leaflet-src.js');
        this.import('node_modules/leaflet/dist/leaflet.css');

        // Import the `intlTelInput.min.css` file and append it to the parent application's `vendor.css`
        this.import('node_modules/intl-tel-input/build/css/intlTelInput.min.css');
    },

    treeForLeaflet: function () {
        const leafletImagesPath = path.join(this.pathBase('leaflet'), 'dist', 'images');
        const trees = [
            new Funnel(leafletImagesPath, {
                destDir: 'assets/images',
                allowEmpty: true,
            }),
        ];

        return trees;
    },

    treeForIntlTelInput: function () {
        const intlTelInputPath = path.dirname(require.resolve('intl-tel-input')).replace(/build\/js$/, '');
        const trees = [
            new Funnel(`${intlTelInputPath}/build/js`, {
                include: ['utils.js'],
                destDir: 'assets/libphonenumber',
                allowEmpty: true,
            }),
            new Funnel(`${intlTelInputPath}/build/img`, {
                destDir: 'img',
                overwrite: false,
                allowEmpty: true,
            }),
            new Funnel(path.join(__dirname, 'assets'), {
                destDir: '/',
                allowEmpty: true,
            }),
        ];

        return trees;
    },

    mergeWithPublicTree: function (publicTree) {
        const intlTelInputTree = this.treeForIntlTelInput();
        const leafletTree = this.treeForLeaflet();
        const addonTree = [...intlTelInputTree, ...leafletTree];

        return publicTree ? new MergeTrees([publicTree, ...addonTree], { overwrite: true }) : new MergeTrees([...addonTree], { overwrite: true });
    },

    treeForPublic: function () {
        const publicTree = this._super.treeForPublic.apply(this, arguments);

        return this.mergeWithPublicTree(publicTree);
    },

    pathBase(packageName) {
        return path.dirname(resolve.sync(packageName + '/package.json', { basedir: __dirname }));
    },

    findApplicationHost(app) {
        let current = this;
        do {
            // Skip engines - we want the root application, not an engine
            const isEngine = current.lazyLoading === true || (current.lazyLoading && current.lazyLoading.enabled === true);
            if (!isEngine) {
                app = current.app || app;
            }
        } while (current.parent.parent && (current = current.parent));

        return app;
    },

    isDevelopingAddon: function () {
        return true;
    },
};
