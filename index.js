'use strict';
const { name } = require('./package');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const resolve = require('resolve');
const path = require('path');
const buildPostcssOptions = require('./lib/postcss-options');

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
    },

    treeForStyles: function () {
        // Only expose the app styles tree to the root application. Addon styles
        // are compiled separately by Ember's treeForAddon/compileStyles hooks.
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
        // Configure the addon's compiler before its ember-cli-postcss child is
        // included, including when this instance belongs to an engine.
        const postcssOptions = buildPostcssOptions(this.project.targets && this.project.targets.browsers);
        this.options.postcssOptions = postcssOptions;
        this._super.included.apply(this, arguments);

        // Nested engine instances configure their own compiler above, but must
        // not overwrite host options or import the shared vendor assets again.
        let parent = this.parent;
        while (parent) {
            const isEngine = parent.lazyLoading === true || (parent.lazyLoading && parent.lazyLoading.enabled === true);
            if (isEngine) {
                return;
            }
            parent = parent.parent;
        }

        // Get Application Host (skips engines, finds root app)
        app = this.findApplicationHost(app);

        // PostCSS Options - only applied to the root application
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
