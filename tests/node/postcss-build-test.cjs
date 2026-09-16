/* eslint-env node */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const postcss = createRequire(require.resolve('broccoli-postcss-single'))('postcss');
const tailwind = require('tailwindcss');
const buildPostcssOptions = require('../../lib/postcss-options');
const browsers = ['last 1 Chrome versions', 'last 1 Firefox versions', 'last 1 Safari versions'];

async function compile(css, from) {
    const options = buildPostcssOptions(browsers);
    const config = { ...require('../../tailwind.config'), content: [{ raw: '<div class="dark:bg-gray-900"></div>', extension: 'html' }] };
    const plugins = options.compile.plugins.map((plugin) => (plugin.postcssPlugin === 'tailwindcss' ? tailwind(config) : plugin));
    const compiled = await postcss(plugins).process(css, { from, map: false });
    const filtered = await postcss(options.filter.plugins).process(compiled.css, { from, map: false });
    return { compiled, filtered };
}

test('dark @apply selectors compile for the host browsers without lossy :is() warnings', async () => {
    const { compiled, filtered } = await compile('.condition-content select:focus { @apply dark:bg-gray-900; }');
    assert.equal(compiled.warnings().length, 0);
    assert.match(filtered.css, /data-theme/);
    assert.match(filtered.css, /select:focus/);
    assert.match(filtered.css, /background-color/);
    assert.doesNotMatch(filtered.css, /@apply/);
});

test('tooltip loops and mixins finish before directional conditionals are evaluated', async () => {
    const from = path.resolve(__dirname, '../../addon/styles/components/attacher.css');
    const { filtered } = await compile(fs.readFileSync(from, 'utf8'), from);
    const rotations = new Map();
    filtered.root.walkDecls('transform', (decl) => {
        if (!decl.value.startsWith('rotate(')) return;
        let node = decl.parent;
        while (node) {
            const side = node.selector && node.selector.match(/x-placement\^=['"]?(top|bottom|left|right)/);
            if (side) rotations.set(side[1], decl.value);
            node = node.parent;
        }
    });
    assert.deepEqual(Object.fromEntries(rotations), {
        bottom: 'rotate(135deg)',
        top: 'rotate(-45deg)',
        right: 'rotate(45deg)',
        left: 'rotate(225deg)',
    });
    filtered.root.walkAtRules((rule) => {
        assert.ok(!['each', 'mixin', 'define-mixin', 'if', 'else', 'apply'].includes(rule.name), `Unprocessed @${rule.name}`);
    });
});

test('JavaScript utility changes invalidate the Broccoli CSS cache', async () => {
    const { Builder } = createRequire(require.resolve('ember-cli'))('broccoli');
    const PostcssCompiler = require('broccoli-postcss-single');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ember-ui-css-rebuild-'));
    let builder;
    try {
        fs.writeFileSync(path.join(directory, 'app.css'), '@tailwind utilities;');
        const source = path.join(directory, 'component.js');
        fs.writeFileSync(source, 'const className = "w-[13px]";');
        const options = buildPostcssOptions(browsers).compile;
        options.plugins = [tailwind({ content: [path.join(directory, '*.js')], corePlugins: { preflight: false } })];
        builder = new Builder(new PostcssCompiler([directory], 'app.css', 'app.css', options));
        await builder.build();
        assert.match(fs.readFileSync(path.join(builder.outputPath, 'app.css'), 'utf8'), /width: 13px/);

        fs.writeFileSync(source, 'const className = "w-[29px]";');
        const later = new Date(Date.now() + 1000);
        fs.utimesSync(source, later, later);
        await builder.build();
        assert.match(fs.readFileSync(path.join(builder.outputPath, 'app.css'), 'utf8'), /width: 29px/);

        fs.writeFileSync(path.join(directory, 'new-component.js'), 'const className = "h-[37px]";');
        await builder.build();
        assert.match(fs.readFileSync(path.join(builder.outputPath, 'app.css'), 'utf8'), /height: 37px/);
    } finally {
        if (builder) await builder.cleanup();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
