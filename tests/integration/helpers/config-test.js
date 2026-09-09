import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | config', function (hooks) {
    setupRenderingTest(hooks);

    test('it reads a top level key from the application environment config', async function (assert) {
        await render(hbs`{{config "modulePrefix"}}`);

        assert.dom(this.element).hasText('dummy');
    });

    test('it reports the environment the suite is running under', async function (assert) {
        await render(hbs`{{config "environment"}}`);

        assert.dom(this.element).hasText('test');
    });

    test('it resolves nested keys through a dotted path', async function (assert) {
        await render(hbs`{{config "APP.rootElement"}}`);

        assert.dom(this.element).hasText('#ember-testing');
    });

    test('an unknown key renders nothing rather than throwing', async function (assert) {
        await render(hbs`{{config "thisKeyDoesNotExist"}}`);

        assert.dom(this.element).hasNoText();
    });

    test('an unknown nested path renders nothing rather than throwing', async function (assert) {
        await render(hbs`{{config "APP.nope.deeper"}}`);

        assert.dom(this.element).hasNoText();
    });

    test('the key can be supplied dynamically', async function (assert) {
        this.set('key', 'modulePrefix');

        await render(hbs`{{config this.key}}`);
        assert.dom(this.element).hasText('dummy');

        this.set('key', 'environment');
        await settled();

        assert.dom(this.element).hasText('test', 'the helper recomputes when the key changes');
    });
});
