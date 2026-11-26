/* eslint-env node */
'use strict';

// Run with: node --test tests/node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const postcss = createRequire(require.resolve('broccoli-postcss-single'))('postcss');
const tailwind = require('tailwindcss');

const tokensCss = fs.readFileSync(path.resolve(__dirname, '../../addon/styles/tokens.css'), 'utf8');
const definedTokens = new Set([...tokensCss.matchAll(/(--fb-[a-z0-9-]+)\s*:/g)].map((match) => match[1]));

async function utilities(classes) {
    const config = { ...require('../../tailwind.config'), content: [{ raw: `<div class="${classes}"></div>`, extension: 'html' }], corePlugins: { preflight: false } };
    const result = await postcss([tailwind(config)]).process('@tailwind utilities;', { from: undefined });
    return result.css;
}

test('token utilities compile to the token variables', async () => {
    const css = await utilities(
        'bg-surface text-muted border-border bg-subtle text-text bg-accent text-accent-fg bg-chrome border-chrome-border text-info bg-info-subtle text-warn text-ok text-critical bg-map-land bg-canvas rounded-chrome rounded-dock shadow-chrome shadow-sheet pl-canvas-left top-canvas-top'
    );

    for (const [selector, variable] of [
        ['.bg-surface', '--fb-surface'],
        ['.text-muted', '--fb-muted'],
        ['.border-border', '--fb-border'],
        ['.bg-subtle', '--fb-subtle'],
        ['.text-text', '--fb-text'],
        ['.bg-accent', '--fb-accent'],
        ['.text-accent-fg', '--fb-accent-fg'],
        ['.bg-chrome', '--fb-chrome'],
        ['.border-chrome-border', '--fb-chrome-border'],
        ['.text-info', '--fb-info'],
        ['.bg-info-subtle', '--fb-info-subtle'],
        ['.text-warn', '--fb-warn'],
        ['.text-ok', '--fb-ok'],
        ['.text-critical', '--fb-critical'],
        ['.bg-map-land', '--fb-map-land'],
        ['.bg-canvas', '--fb-canvas-bg'],
        ['.rounded-chrome', '--fb-radius-chrome'],
        ['.rounded-dock', '--fb-radius-dock'],
        ['.pl-canvas-left', '--fb-inset-left'],
        ['.top-canvas-top', '--fb-inset-top'],
    ]) {
        const rule = css.match(new RegExp(`\\${selector} \\{([^}]*)\\}`));
        assert.ok(rule, `${selector} is generated`);
        assert.ok(rule[1].includes(`var(${variable})`), `${selector} uses ${variable}`);
    }
    assert.match(css, /\.shadow-chrome \{[^}]*var\(--fb-shadow-chrome\)/);
    assert.match(css, /\.shadow-sheet \{[^}]*var\(--fb-shadow-sheet\)/);
});

test('every variable the Tailwind config references is defined in tokens.css', () => {
    const configSource = fs.readFileSync(path.resolve(__dirname, '../../tailwind.config.js'), 'utf8');
    const referenced = [...configSource.matchAll(/var\((--fb-[a-z0-9-]+)\)/g)].map((match) => match[1]);

    assert.ok(referenced.length > 0);
    for (const variable of referenced) {
        assert.ok(definedTokens.has(variable), `${variable} is defined in tokens.css`);
    }
});

test('the dark theme overrides every themed light token', () => {
    const block = (selector) => tokensCss.slice(tokensCss.indexOf(selector)).split('}')[0];
    const names = (css) => new Set([...css.matchAll(/(--fb-[a-z0-9-]+)\s*:/g)].map((match) => match[1]));
    const light = names(block("[data-theme='light'] {"));
    const dark = names(block("[data-theme='dark'] {"));
    const geometry = new Set(['--fb-canvas-grid', '--fb-canvas-dot-size']);

    for (const name of light) {
        if (!geometry.has(name)) assert.ok(dark.has(name), `${name} has a dark value`);
    }
});
