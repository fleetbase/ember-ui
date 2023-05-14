'use strict';
const { name } = require('./package');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const packagePrefix = `node_modules/${name}/node_modules`;

module.exports = {
    name,
    assetsFunneled: false,

    options: {
        autoImport: {
            publicAssetsURL: '/assets',
            alias: {
                libphonenumber: 'intl-tel-input/build/js/utils.js',
            },
        },
    },

    included: function (app) {
        this._super.included.apply(this, arguments);

        // Import the `intlTelInput.min.css` file and append it to the parent application's `vendor.css`
        this.import(`node_modules/intl-tel-input/build/css/intlTelInput.min.css`);
    },

    treeForPublic: function () {
        const publicTree = this._super.treeForPublic.apply(this, arguments);

        // Use a Funnel to copy the `utils.js` file to `assets/libphonenumber`
        const addonTree = [
            new Funnel(`${packagePrefix}/intl-tel-input/build/js`, {
                include: ['utils.js'],
                destDir: 'assets/libphonenumber',
            }),
            new Funnel(`${packagePrefix}/intl-tel-input/build/img`, {
                destDir: 'img',
                overwrite: false,
            }),
            new Funnel(`node_modules/${name}/assets`, {
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
