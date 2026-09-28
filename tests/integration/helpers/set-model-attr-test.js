import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import EmberObject from '@ember/object';

module('Integration | Helper | set-model-attr', function (hooks) {
    setupRenderingTest(hooks);

    test('it sets the model attribute from the value property of the selection', async function (assert) {
        const model = EmberObject.create({ type: null });
        this.set('model', model);
        this.set('selection', { value: 'delivery', label: 'Delivery' });

        await render(hbs`
            <button type="button" class="select" {{on "click" (fn (set-model-attr this.model "type") this.selection)}}>select</button>
        `);

        assert.strictEqual(model.type, null, 'the model is untouched before the callback runs');

        await click('.select');

        assert.strictEqual(model.type, 'delivery', 'the selected value is written to the attribute');
    });

    test('it reads a custom property from the selection', async function (assert) {
        const model = EmberObject.create({ type: null });
        this.set('model', model);
        this.set('selection', { value: 'delivery', code: 'DLV' });

        await render(hbs`
            <button type="button" class="select" {{on "click" (fn (set-model-attr this.model "type" prop="code") this.selection)}}>select</button>
        `);

        await click('.select');

        assert.strictEqual(model.type, 'DLV', 'the named prop determines which value is read');
    });

    test('it clears the attribute when the selection is null', async function (assert) {
        const model = EmberObject.create({ type: 'delivery' });
        this.set('model', model);
        this.set('selection', null);

        await render(hbs`
            <button type="button" class="clear" {{on "click" (fn (set-model-attr this.model "type") this.selection)}}>clear</button>
        `);

        await click('.clear');

        assert.strictEqual(model.type, null, 'a null selection nulls the attribute');
    });

    test('it clears the attribute when the selection is undefined', async function (assert) {
        const model = EmberObject.create({ type: 'delivery' });
        this.set('model', model);

        await render(hbs`
            <button type="button" class="clear" {{on "click" (fn (set-model-attr this.model "type") this.missing)}}>clear</button>
        `);

        await click('.clear');

        assert.strictEqual(model.type, null, 'an undefined selection nulls the attribute');
    });

    test('it writes undefined when the selection lacks the requested property', async function (assert) {
        const model = EmberObject.create({ type: 'delivery' });
        this.set('model', model);
        this.set('selection', { label: 'Delivery' });

        await render(hbs`
            <button type="button" class="select" {{on "click" (fn (set-model-attr this.model "type") this.selection)}}>select</button>
        `);

        await click('.select');

        assert.strictEqual(model.type, undefined, 'a missing prop yields undefined rather than throwing');
    });

    test('it writes falsy selection values through', async function (assert) {
        const model = EmberObject.create({ type: 'delivery' });
        this.set('model', model);
        this.set('selection', { value: 0 });

        await render(hbs`
            <button type="button" class="select" {{on "click" (fn (set-model-attr this.model "type") this.selection)}}>select</button>
        `);

        await click('.select');

        assert.strictEqual(model.type, 0, 'zero is written rather than treated as no selection');
    });

    test('it returns a harmless no-op when the model is missing', async function (assert) {
        this.set('selection', { value: 'delivery' });

        await render(hbs`
            <button type="button" class="select" {{on "click" (fn (set-model-attr this.missingModel "type") this.selection)}}>select</button>
        `);

        await click('.select');

        assert.dom('.select').exists('clicking the no-op callback does not throw');
    });

    test('it returns a harmless no-op when the attribute name is missing', async function (assert) {
        const model = EmberObject.create({ type: 'delivery' });
        this.set('model', model);
        this.set('selection', { value: 'pickup' });

        await render(hbs`
            <button type="button" class="select" {{on "click" (fn (set-model-attr this.model this.missingAttr) this.selection)}}>select</button>
        `);

        await click('.select');

        assert.strictEqual(model.type, 'delivery', 'the model is left untouched without an attribute name');
    });

    test('the mutation is observable in the template', async function (assert) {
        const model = EmberObject.create({ type: 'pickup' });
        this.set('model', model);
        this.set('selection', { value: 'delivery' });

        await render(hbs`
            <span class="value">{{this.model.type}}</span>
            <button type="button" class="select" {{on "click" (fn (set-model-attr this.model "type") this.selection)}}>select</button>
        `);

        assert.dom('.value').hasText('pickup');

        await click('.select');

        assert.dom('.value').hasText('delivery', 'the template re-renders with the new attribute value');
    });
});
