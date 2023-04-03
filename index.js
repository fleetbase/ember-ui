'use strict';
const name = require('./package').name;

module.exports = {
    name,

    isDevelopingAddon: function () {
        return true;
    },
};
