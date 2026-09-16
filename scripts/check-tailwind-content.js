/* eslint-env node */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const glob = createRequire(require.resolve('tailwindcss'))('fast-glob');

// Accept another independently packaged configuration to run the same contract
// against console without making console depend on a new ember-ui release.
const configPath = path.resolve(process.argv[2] || path.join(__dirname, '../tailwind.config.js'));
const configRequire = createRequire(configPath);
const temporary = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'tailwind-content-')));
const root = path.join(temporary, 'host [fixture]');
const originalCwd = process.cwd();

function write(file, text = '<div class="p-4"></div>') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
}

function link(name, packageRoot) {
    const target = path.join(root, 'node_modules', name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.symlinkSync(packageRoot, target, 'dir');
}

try {
    write(path.join(root, 'app', 'host.hbs'));
    const registry = path.join(root, 'node_modules/.pnpm/@fleetbase+example@1.0.0/node_modules/@fleetbase/example');
    const linked = path.join(temporary, 'linked-package');
    const scoped = path.join(temporary, 'scoped-engine');
    const unscoped = path.join(temporary, 'unscoped-engine');
    const ignored = path.join(temporary, 'unrelated-package');

    for (const packageRoot of [registry, linked, scoped, unscoped, ignored]) {
        write(path.join(packageRoot, 'addon', 'component.hbs'));
        write(path.join(packageRoot, 'node_modules/nested-engine/addon', 'must-not-scan.hbs'));
        write(path.join(packageRoot, '.claude/worktrees/example/addon', 'must-not-scan.hbs'));
        write(path.join(packageRoot, 'tests/dummy/app', 'must-not-scan.hbs'));
    }
    link('@fleetbase/example', registry);
    link('@fleetbase/linked', linked);
    link('@fleetbase/linked-alias', linked);
    link('@partner/example-engine', scoped);
    link('example-engine', unscoped);
    link('@partner/unrelated', ignored);
    // Model the cyclic dependency links that broad node_modules globs follow.
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(linked, 'node_modules', 'cycle'), 'dir');
    process.chdir(root);

    const context = {
        module: { exports: {} },
        __dirname: root,
        require(name) {
            return name === '@tailwindcss/forms' ? () => {} : configRequire(name);
        },
    };
    vm.runInNewContext(fs.readFileSync(configPath, 'utf8'), context, { filename: configPath });
    const content = context.module.exports.content;
    const patterns = Array.from(Array.isArray(content) ? content : content.files);
    const expected = [path.join(root, 'app/host.hbs'), ...[registry, linked, scoped, unscoped].map((packageRoot) => path.join(packageRoot, 'addon/component.hbs'))].sort();
    const visited = [];
    const scan = () =>
        glob
            .sync(patterns, {
                cwd: root,
                absolute: true,
                fs: {
                    ...fs,
                    readdirSync(directory, options) {
                        visited.push(directory);
                        assert(visited.length < 100, 'content scanning escaped the source trees');
                        assert(!directory.includes('/.claude/'), 'content scanning entered a development worktree');
                        assert(!directory.includes('/node_modules/nested-engine'), 'content scanning entered a nested dependency');
                        return fs.readdirSync(directory, options);
                    },
                },
            })
            .sort();

    assert.deepEqual(scan(), expected, 'include host, linked, registry, scoped and unscoped engines exactly once');
    write(path.join(linked, 'addon/new-template.hbs'));
    expected.push(path.join(linked, 'addon/new-template.hbs'));
    assert.deepEqual(scan(), expected.sort(), 'existing patterns must discover newly created templates');
    console.log(`PASS ${configPath}: linked/registry coverage, deduplication, bounded traversal and new template discovery`);
} finally {
    process.chdir(originalCwd);
    fs.rmSync(temporary, { recursive: true, force: true });
}
