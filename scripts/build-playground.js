#!/usr/bin/env node
'use strict';

/**
 * Build the component playground as a static site for GitHub Pages.
 *
 * This wraps `ember build` rather than replacing it: the package's own `pnpm run build` is
 * untouched, and this script only adds what a Pages deploy needs.
 *
 *   - `PLAYGROUND=true` switches the dummy app to hash routing (Pages cannot rewrite deep links)
 *     and resolves assets under a sub-path.
 *   - `--base-path` keeps the sub-path configurable, so moving to a custom domain later is a CI
 *     argument rather than a code change.
 *   - `.nojekyll` stops Pages from dropping files and folders that begin with an underscore.
 *
 * Usage:
 *   node scripts/build-playground.js [--base-path /ember-ui/] [--output playground-dist]
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
    const args = { basePath: '/ember-ui/', output: 'playground-dist' };

    for (let i = 0; i < argv.length; i += 1) {
        if (argv[i] === '--base-path') {
            args.basePath = argv[i + 1];
            i += 1;
        } else if (argv[i] === '--output') {
            args.output = argv[i + 1];
            i += 1;
        }
    }

    // A rootURL without both slashes produces assets that 404 under a sub-path.
    if (!args.basePath.startsWith('/')) {
        args.basePath = `/${args.basePath}`;
    }

    if (!args.basePath.endsWith('/')) {
        args.basePath = `${args.basePath}/`;
    }

    return args;
}

function main(argv) {
    const { basePath, output } = parseArgs(argv.slice(2));
    const projectRoot = process.cwd();
    const outputPath = path.resolve(projectRoot, output);

    // A stale artifact is worse than none: it looks like a successful build of the current code.
    fs.rmSync(outputPath, { recursive: true, force: true });

    console.log(`Building the playground for ${basePath} into ${output}/`);

    execFileSync('ember', ['build', '--environment=production', `--output-path=${outputPath}`], {
        stdio: 'inherit',
        env: { ...process.env, PLAYGROUND: 'true', PLAYGROUND_ROOT_URL: basePath },
    });

    // GitHub Pages runs Jekyll unless told not to, which silently drops `_`-prefixed paths.
    fs.writeFileSync(path.join(outputPath, '.nojekyll'), '');

    // Pages serves 404.html for unknown paths. With hash routing every real route lives behind
    // `#/`, so serving the app itself keeps a mistyped deep link inside the playground.
    fs.copyFileSync(path.join(outputPath, 'index.html'), path.join(outputPath, '404.html'));

    // Test output and coverage must never reach a published artifact.
    for (const unwanted of ['tests', 'tests.html', 'testem.js']) {
        fs.rmSync(path.join(outputPath, unwanted), { recursive: true, force: true });
    }

    console.log(`Playground built into ${output}/`);
}

if (require.main === module) {
    main(process.argv);
}

module.exports = { parseArgs };
