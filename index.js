'use strict';
const name = require('./package').name;
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');

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
        app.import('node_modules/@fleetbase/ember-ui/node_modules/intl-tel-input/build/css/intlTelInput.min.css');
    },

    treeForPublic: function () {
        const publicTree = this._super.treeForPublic.apply(this, arguments);

        // Use a Funnel to copy the `utils.js` file to `assets/libphonenumber`
        const libphonenumberTree = [
            new Funnel('node_modules/@fleetbase/ember-ui/node_modules/intl-tel-input/build/js', {
                include: ['utils.js'],
                destDir: 'assets/libphonenumber',
            }),
            new Funnel('node_modules/@fleetbase/ember-ui/node_modules/intl-tel-input/build/img', {
                destDir: 'img',
                overwrite: false,
            }),
        ];

        // Merge the addon tree with the existing tree
        return publicTree ? new MergeTrees([publicTree, ...libphonenumberTree], { overwrite: true }) : new MergeTrees([...libphonenumberTree], { overwrite: true });
    },

    isDevelopingAddon: function () {
        return true;
    },
};
