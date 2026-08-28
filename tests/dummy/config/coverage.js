'use strict';

module.exports = {
    parallel: false,
    coverageFolder: 'coverage',
    reporters: ['lcov', 'html', 'json', 'json-summary', 'text-summary'],
    excludes: ['*/mirage/**/*'],
};
