import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | get-default-value', function (hooks) {
    setupRenderingTest(hooks);

    test('the first argument wins when it is defined', async function (assert) {
        this.set('first', 'primary');

        await render(hbs`{{get-default-value this.first "fallback"}}`);

        assert.dom(this.element).hasText('primary');
    });

    test('null and undefined are skipped in favour of later arguments', async function (assert) {
        this.set('nullish', null);
        this.set('nothing', undefined);

        await render(hbs`{{get-default-value this.nullish this.nothing "fallback"}}`);

        assert.dom(this.element).hasText('fallback');
    });

    test('it stops at the first non-nullish argument', async function (assert) {
        this.set('nullish', null);

        await render(hbs`{{get-default-value this.nullish "second" "third"}}`);

        assert.dom(this.element).hasText('second');
    });

    test('zero is a real value and is not replaced', async function (assert) {
        await render(hbs`{{get-default-value 0 99}}`);

        assert.dom(this.element).hasText('0', 'unlike ||, falsy-but-present values are kept');
    });

    test('false is a real value and is not replaced', async function (assert) {
        this.set('flag', false);

        await render(hbs`{{get-default-value this.flag true}}`);

        assert.dom(this.element).hasText('false');
    });

    test('an empty string is a real value and is not replaced', async function (assert) {
        await render(hbs`{{get-default-value "" "fallback"}}`);

        assert.dom(this.element).hasNoText('the empty string short-circuits the fallback');
    });

    test('all-nullish arguments render nothing', async function (assert) {
        this.set('nullish', null);
        this.set('nothing', undefined);

        await render(hbs`{{get-default-value this.nullish this.nothing}}`);

        assert.dom(this.element).hasNoText();
    });

    test('no arguments renders nothing', async function (assert) {
        await render(hbs`{{get-default-value}}`);

        assert.dom(this.element).hasNoText();
    });

    test('it recomputes when the leading argument becomes available', async function (assert) {
        this.set('value', null);

        await render(hbs`{{get-default-value this.value "fallback"}}`);
        assert.dom(this.element).hasText('fallback');

        this.set('value', 'resolved');
        await settled();

        assert.dom(this.element).hasText('resolved');
    });
});
