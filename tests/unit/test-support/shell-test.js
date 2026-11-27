import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { hbs } from 'ember-cli-htmlbars';
import { SHELL_THEMES, setShellTheme, snapshotShellTheme, setupShellTheme, eachShellTheme, renderShell, shellToken } from '@fleetbase/ember-ui/test-support';

module('Unit | test-support | shell', function (hooks) {
    setupRenderingTest(hooks);
    setupShellTheme(hooks);

    test('SHELL_THEMES lists light then dark and cannot be changed', function (assert) {
        assert.deepEqual([...SHELL_THEMES], ['light', 'dark']);
        assert.true(Object.isFrozen(SHELL_THEMES));
    });

    test('setShellTheme sets the theme on <body>', function (assert) {
        setShellTheme('dark');
        assert.strictEqual(document.body.getAttribute('data-theme'), 'dark');

        setShellTheme('light');
        assert.strictEqual(document.body.getAttribute('data-theme'), 'light');
    });

    test('setShellTheme rejects an unknown theme', function (assert) {
        assert.throws(() => setShellTheme('dim'), /Unknown shell theme "dim"; expected one of: light, dark/);
    });

    test('snapshotShellTheme restores a theme that was set', function (assert) {
        document.body.setAttribute('data-theme', 'dark');
        const restore = snapshotShellTheme();

        setShellTheme('light');
        restore();

        assert.strictEqual(document.body.getAttribute('data-theme'), 'dark');
    });

    test('snapshotShellTheme removes the theme when there was none', function (assert) {
        document.body.removeAttribute('data-theme');
        const restore = snapshotShellTheme();

        setShellTheme('dark');
        restore();

        assert.false(document.body.hasAttribute('data-theme'));
    });

    test('setupShellTheme registers a snapshot before and a restore after each test', function (assert) {
        const registered = {};
        setupShellTheme({ beforeEach: (fn) => (registered.beforeEach = fn), afterEach: (fn) => (registered.afterEach = fn) });

        document.body.setAttribute('data-theme', 'light');
        registered.beforeEach();
        setShellTheme('dark');
        registered.afterEach();

        assert.strictEqual(document.body.getAttribute('data-theme'), 'light');
    });

    test('eachShellTheme calls back once per theme, in order', function (assert) {
        const seen = [];
        eachShellTheme((theme) => seen.push(theme));

        assert.deepEqual(seen, ['light', 'dark']);
    });

    test('renderShell defaults to light and returns the canvas root', async function (assert) {
        const canvas = await renderShell(hbs`<Layout::Canvas />`);

        assert.strictEqual(document.body.getAttribute('data-theme'), 'light');
        assert.true(canvas.classList.contains('fb-canvas'));
    });

    test('renderShell sets the requested theme', async function (assert) {
        await renderShell(hbs`<Layout::Canvas />`, { theme: 'dark' });

        assert.strictEqual(document.body.getAttribute('data-theme'), 'dark');
    });

    test('renderShell returns null when the template renders no canvas', async function (assert) {
        const canvas = await renderShell(hbs`<p>no shell</p>`);

        assert.strictEqual(canvas, null);
        assert.dom('p').hasText('no shell');
    });

    test('shellToken reads from <body> by default', function (assert) {
        setShellTheme('dark');

        assert.strictEqual(shellToken('canvas-bg'), '#0b1220');
    });

    test('shellToken reads from the given element', async function (assert) {
        setShellTheme('dark');
        const canvas = await renderShell(hbs`<Layout::Canvas @theme="light" />`, { theme: 'dark' });

        assert.strictEqual(shellToken('canvas-bg', canvas), '#eef1f5');
    });

    test('shellToken returns an empty string for an unknown token', function (assert) {
        assert.strictEqual(shellToken('no-such-token'), '');
    });
});
