'use strict';

module.exports = function (/* environment, appConfig */) {
    return {
        'ember-leaflet': {
            excludeCSS: true,
            excludeJS: true,
            excludeImages: true,
        },
    };
};
