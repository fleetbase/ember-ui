import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | n-a', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the value when it is present', async function (assert) {
        this.set('value', 'Fleetbase');

        await render(hbs`{{n-a this.value}}`);

        assert.dom(this.element).hasText('Fleetbase');
    });

    test('it renders a dash for null and undefined', async function (assert) {
        this.set('value', null);

        await render(hbs`{{n-a this.value}}|{{n-a this.missing}}`);

        assert.dom(this.element).hasText('-|-');
    });

    test('it renders a dash for an empty string', async function (assert) {
        this.set('value', '');

        await render(hbs`{{n-a this.value}}`);

        assert.dom(this.element).hasText('-');
    });

    test('it renders a dash for a whitespace only string', async function (assert) {
        this.set('value', '    ');

        await render(hbs`{{n-a this.value}}`);

        assert.dom(this.element).hasText('-');
    });

    test('it renders a dash for an empty array', async function (assert) {
        this.set('value', []);

        await render(hbs`{{n-a this.value}}`);

        assert.dom(this.element).hasText('-');
    });

    test('it uses a custom fallback when provided', async function (assert) {
        this.set('value', null);

        await render(hbs`{{n-a this.value "N/A"}}`);

        assert.dom(this.element).hasText('N/A');
    });

    test('it ignores the fallback when the value is present', async function (assert) {
        this.set('value', 'Delivered');

        await render(hbs`{{n-a this.value "N/A"}}`);

        assert.dom(this.element).hasText('Delivered');
    });

    test('it renders zero rather than the fallback', async function (assert) {
        this.set('value', 0);

        await render(hbs`{{n-a this.value}}`);

        assert.dom(this.element).hasText('0');
    });

    test('it renders negative numbers rather than the fallback', async function (assert) {
        this.set('value', -1);

        await render(hbs`{{n-a this.value}}`);

        assert.dom(this.element).hasText('-1');
    });

    test('it renders false rather than the fallback', async function (assert) {
        this.set('value', false);

        await render(hbs`{{n-a this.value}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it preserves surrounding whitespace of a non blank string', async function (assert) {
        this.set('value', ' Fleetbase ');

        await render(hbs`{{n-a this.value}}`);

        assert.strictEqual(this.element.textContent, ' Fleetbase ');
    });

    test('it supports an empty custom fallback', async function (assert) {
        this.set('value', undefined);

        await render(hbs`{{n-a this.value ""}}`);

        assert.dom(this.element).hasNoText();
    });
});
