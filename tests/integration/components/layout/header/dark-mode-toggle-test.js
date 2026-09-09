import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const SWITCH = '[role="checkbox"]';

module('Integration | Component | layout/header/dark-mode-toggle', function (hooks) {
    setupRenderingTest(hooks);

    let theme;

    hooks.beforeEach(function () {
        theme = this.owner.lookup('service:theme');
        theme.currentTheme = 'light';
    });

    test('it renders a labelled toggle that is off in light mode', async function (assert) {
        await render(hbs`<Layout::Header::DarkModeToggle />`);

        assert.dom('a').containsText('Dark Mode');
        assert.dom(SWITCH).hasAttribute('aria-checked', 'false');
    });

    test('the toggle is on when the dark theme is active', async function (assert) {
        theme.currentTheme = 'dark';

        await render(hbs`<Layout::Header::DarkModeToggle />`);

        assert.dom(SWITCH).hasAttribute('aria-checked', 'true');
    });

    test('switching it on selects the dark theme', async function (assert) {
        await render(hbs`<Layout::Header::DarkModeToggle />`);
        await click(SWITCH);

        assert.deepEqual(theme.calls, [{ method: 'setTheme', args: ['dark'] }]);
        assert.strictEqual(theme.currentTheme, 'dark');
    });

    test('switching it off selects the light theme', async function (assert) {
        theme.currentTheme = 'dark';

        await render(hbs`<Layout::Header::DarkModeToggle />`);
        await click(SWITCH);

        assert.deepEqual(theme.calls, [{ method: 'setTheme', args: ['light'] }]);
        assert.strictEqual(theme.currentTheme, 'light');
    });

    test('a wrapper class is applied', async function (assert) {
        await render(hbs`<Layout::Header::DarkModeToggle @wrapperClass="my-item" />`);

        assert.dom('a').hasClass('my-item');
        assert.dom('a').hasClass('next-dd-item');
    });
});
