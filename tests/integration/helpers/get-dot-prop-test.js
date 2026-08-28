import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | get-dot-prop', function (hooks) {
    setupRenderingTest(hooks);

    test('it reads a own property off the object', async function (assert) {
        this.set('object', { name: 'Fleetbase' });

        await render(hbs`{{get-dot-prop this.object "name"}}`);

        assert.dom(this.element).hasText('Fleetbase');
    });

    test('a missing key renders nothing', async function (assert) {
        this.set('object', { name: 'Fleetbase' });

        await render(hbs`{{get-dot-prop this.object "missing"}}`);

        assert.dom(this.element).hasNoText('undefined is normalised to null');
    });

    test('a key containing dots is used as a literal key, not a path', async function (assert) {
        this.set('flat', { 'meta.page': 7 });
        this.set('nested', { meta: { page: 7 } });

        await render(hbs`<span id="flat">{{get-dot-prop this.flat "meta.page"}}</span><span id="nested">{{get-dot-prop this.nested "meta.page"}}</span>`);

        assert.dom('#flat').hasText('7', 'a literal dotted key is found');
        assert.dom('#nested').hasNoText('the helper does not walk nested paths');
    });

    test('falsy-but-present values are returned rather than nulled out', async function (assert) {
        this.set('object', { zero: 0, flag: false, blank: '' });

        await render(
            hbs`<span id="zero">{{get-dot-prop this.object "zero"}}</span><span id="flag">{{get-dot-prop this.object "flag"}}</span><span id="blank">{{get-dot-prop this.object "blank"}}</span>`
        );

        assert.dom('#zero').hasText('0');
        assert.dom('#flag').hasText('false');
        assert.dom('#blank').hasNoText();
    });

    test('an explicit null value renders nothing', async function (assert) {
        this.set('object', { value: null });

        await render(hbs`{{get-dot-prop this.object "value"}}`);

        assert.dom(this.element).hasNoText();
    });

    test('an empty object always renders nothing', async function (assert) {
        this.set('object', {});

        await render(hbs`{{get-dot-prop this.object "anything"}}`);

        assert.dom(this.element).hasNoText();
    });

    test('array indexes work because access is a plain bracket lookup', async function (assert) {
        this.set('list', ['alpha', 'beta']);

        await render(hbs`<span id="second">{{get-dot-prop this.list "1"}}</span><span id="length">{{get-dot-prop this.list "length"}}</span>`);

        assert.dom('#second').hasText('beta');
        assert.dom('#length').hasText('2');
    });

    test('it recomputes when the key changes', async function (assert) {
        this.set('object', { a: 'first', b: 'second' });
        this.set('key', 'a');

        await render(hbs`{{get-dot-prop this.object this.key}}`);
        assert.dom(this.element).hasText('first');

        this.set('key', 'b');
        await settled();

        assert.dom(this.element).hasText('second');
    });
});
