'use strict';

module.exports = {
    excludes: [
        '*/mirage/**/*',

        // A pnpm workspace link (e.g. `@fleetbase/ember-core` symlinked for local development)
        // is compiled by this package's build, so istanbul instruments it too. That has two bad
        // consequences: a sibling package's files are held to this package's coverage threshold,
        // and the HTML reporter writes one page per file at `coverage/../ember-core/...`, which
        // resolves OUTSIDE the gitignored coverage folder and into the package root.
        '../**/*',
        '*/ember-core/**/*',
    ],
};
