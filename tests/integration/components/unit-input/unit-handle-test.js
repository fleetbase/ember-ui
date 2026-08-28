import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | unit-input/unit-handle', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the unit value', async function (assert) {
        this.set('unit', { value: 'kg', label: 'Kilograms' });

        await render(hbs`<UnitInput::UnitHandle @unit={{this.unit}} />`);

        assert.dom(this.element).containsText('kg');
    });

    test('a different unit renders its own value', async function (assert) {
        this.set('unit', { value: 'lb' });

        await render(hbs`<UnitInput::UnitHandle @unit={{this.unit}} />`);

        assert.dom(this.element).containsText('lb');
        assert.dom(this.element).doesNotContainText('kg');
    });

    test('it renders a dropdown status icon', async function (assert) {
        this.set('unit', { value: 'kg' });

        await render(hbs`<UnitInput::UnitHandle @unit={{this.unit}} />`);

        assert.dom('.ember-power-select-status-icon').exists();
    });

    test('it renders without a unit', async function (assert) {
        await render(hbs`<UnitInput::UnitHandle />`);

        assert.dom('.ember-power-select-status-icon').exists('the handle still renders');
        assert.dom(this.element).doesNotContainText('undefined');
    });
});
