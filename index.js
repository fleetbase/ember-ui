'use strict';
const { name } = require('./package');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const path = require('path');

module.exports = {
    name,

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
