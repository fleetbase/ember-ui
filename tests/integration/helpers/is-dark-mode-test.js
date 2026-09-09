import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

class StubThemeService extends Service {
    @tracked activeTheme = 'light';
}

class ThemelessService extends Service {}

module('Integration | Helper | is-dark-mode', function (hooks) {
    setupRenderingTest(hooks);

    test('it is true when the theme service reports the dark theme', async function (assert) {
        this.owner.register('service:theme', StubThemeService);
        this.owner.lookup('service:theme').activeTheme = 'dark';

        await render(hbs`{{is-dark-mode}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it is false when the theme service reports the light theme', async function (assert) {
        this.owner.register('service:theme', StubThemeService);
        this.owner.lookup('service:theme').activeTheme = 'light';

        await render(hbs`{{is-dark-mode}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it compares the active theme exactly and is not case insensitive', async function (assert) {
        this.owner.register('service:theme', StubThemeService);
        this.owner.lookup('service:theme').activeTheme = 'DARK';

        await render(hbs`{{is-dark-mode}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is false when the theme service exposes no active theme', async function (assert) {
        this.owner.register('service:theme', ThemelessService);

        await render(hbs`{{is-dark-mode}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it recomputes when the active theme changes', async function (assert) {
        this.owner.register('service:theme', StubThemeService);
        const theme = this.owner.lookup('service:theme');
        theme.activeTheme = 'light';

        await render(hbs`{{is-dark-mode}}`);
        assert.dom(this.element).hasText('false');

        theme.activeTheme = 'dark';
        await settled();
        assert.dom(this.element).hasText('true');

        theme.activeTheme = 'light';
        await settled();
        assert.dom(this.element).hasText('false');
    });

    test('it ignores positional arguments and always reflects the service state', async function (assert) {
        this.owner.register('service:theme', StubThemeService);
        this.owner.lookup('service:theme').activeTheme = 'dark';
        this.set('inputValue', 'light');

        await render(hbs`{{is-dark-mode this.inputValue}}`);

        assert.dom(this.element).hasText('true');
    });
});
