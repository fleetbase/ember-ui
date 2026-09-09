import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, triggerEvent, triggerKeyEvent } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | array-input', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a row for each datum and yields the data', async function (assert) {
        this.set('data', ['alpha', 'beta']);

        await render(hbs`
            <ArrayInput @data={{this.data}} as |data|>
                <span data-test-yield>{{data.length}} entries</span>
            </ArrayInput>
        `);

        assert.dom('[data-test-yield]').hasText('2 entries');
        assert.dom('input[aria-label="Data Input"]').exists({ count: 2 });

        const inputs = this.element.querySelectorAll('input[aria-label="Data Input"]');
        assert.strictEqual(inputs[0].value, 'alpha');
        assert.strictEqual(inputs[1].value, 'beta');
    });

    test('it adds a new row when the add button is clicked', async function (assert) {
        const changes = [];
        this.set('data', ['alpha']);
        this.set('onDataChanged', (data) => changes.push([...data]));

        await render(hbs`<ArrayInput @data={{this.data}} @onDataChanged={{this.onDataChanged}} />`);

        assert.dom('.array-input .btn-wrapper button').includesText('Add');

        await click('.array-input .btn-wrapper button');

        assert.dom('input[aria-label="Data Input"]').exists({ count: 2 });
        assert.deepEqual(changes, [['alpha', '']]);
    });

    test('it can render a custom add button label', async function (assert) {
        this.set('data', []);

        await render(hbs`<ArrayInput @data={{this.data}} @addButtonText="Add Email" />`);

        assert.dom('.array-input .btn-wrapper button').includesText('Add Email');
        assert.dom('input[aria-label="Data Input"]').doesNotExist();
    });

    test('it removes a row when its remove button is clicked', async function (assert) {
        const changes = [];
        this.set('data', ['alpha', 'beta']);
        this.set('onDataChanged', (data) => changes.push([...data]));

        await render(hbs`<ArrayInput @data={{this.data}} @onDataChanged={{this.onDataChanged}} />`);
        await click(this.element.querySelectorAll('.array-input .text-red-500')[0]);

        assert.dom('input[aria-label="Data Input"]').exists({ count: 1 });
        assert.strictEqual(this.element.querySelector('input[aria-label="Data Input"]').value, 'beta');
        assert.deepEqual(changes, [['beta']]);
    });

    test('it updates a datum and notifies on change', async function (assert) {
        const changes = [];
        this.set('data', ['alpha', 'beta']);
        this.set('onDataChanged', (data) => changes.push([...data]));

        await render(hbs`<ArrayInput @data={{this.data}} @onDataChanged={{this.onDataChanged}} />`);
        await fillIn('input[aria-label="Data Input"]', 'gamma');

        assert.deepEqual(changes[changes.length - 1], ['gamma', 'beta']);
    });

    test('it disables the inputs when @disabled is true', async function (assert) {
        this.set('data', ['alpha']);

        await render(hbs`<ArrayInput @data={{this.data}} @disabled={{true}} />`);

        assert.dom('.array-input').hasClass('disabled');
        assert.dom('.array-input .btn-wrapper button').isDisabled();
        assert.dom('input[aria-label="Data Input"]').isDisabled();
        assert.dom('.array-input .text-red-500').isDisabled();
    });
    // Every case above supplies @onDataChanged; the component has to work without one, and its
    // change handlers ignore an empty value.
    module('with no onDataChanged handler', function () {
        test('adding, editing and removing all work', async function (assert) {
            this.set('data', ['alpha']);

            await render(hbs`<ArrayInput @data={{this.data}} />`);

            await click('button.btn-default, button');
            assert.dom('input[aria-label="Data Input"]').exists({ count: 2 }, 'a row is added without a handler to report to');

            const inputs = this.element.querySelectorAll('input[aria-label="Data Input"]');
            await fillIn(inputs[1], 'beta');
            assert.strictEqual(inputs[1].value, 'beta', 'the value is editable');

            await click(this.element.querySelector('button[type="button"]'));
            assert.dom('.array-input').exists('and removal does not throw');
        });
    });

    test('an empty value is ignored rather than written into the array', async function (assert) {
        const changes = [];
        this.set('data', ['alpha']);
        this.set('onDataChanged', (data) => changes.push([...data]));

        await render(hbs`<ArrayInput @data={{this.data}} @onDataChanged={{this.onDataChanged}} />`);

        const input = this.element.querySelector('input[aria-label="Data Input"]');
        // Clearing the field is what produces an empty value on the change event.
        await fillIn(input, '');

        assert.deepEqual(changes, [], 'a change carrying no value reports nothing');
    });
    // Typing reports on every keyup, before the field fires its change event.
    test('typing into a row reports the typed value', async function (assert) {
        const changes = [];
        this.set('data', ['alpha']);
        this.set('onDataChanged', (data) => changes.push([...data]));

        await render(hbs`<ArrayInput @data={{this.data}} @onDataChanged={{this.onDataChanged}} />`);

        const input = this.element.querySelector('input[aria-label="Data Input"]');
        input.value = 'alpham';
        await triggerKeyEvent(input, 'keyup', 'KeyM');

        assert.deepEqual(changes[changes.length - 1], ['alpham'], 'the value is written, not the event');
    });

    test('pasting into a row writes the pasted value', async function (assert) {
        const changes = [];
        this.set('data', ['alpha']);
        this.set('onDataChanged', (data) => changes.push([...data]));

        await render(hbs`<ArrayInput @data={{this.data}} @onDataChanged={{this.onDataChanged}} />`);

        const input = this.element.querySelector('input[aria-label="Data Input"]');
        input.value = 'pasted';
        await triggerEvent(input, 'paste');

        assert.deepEqual(changes[changes.length - 1], ['pasted']);
    });

    test('pasting nothing into an empty row writes nothing', async function (assert) {
        const changes = [];
        this.set('data', ['']);
        this.set('onDataChanged', (data) => changes.push([...data]));

        await render(hbs`<ArrayInput @data={{this.data}} @onDataChanged={{this.onDataChanged}} />`);
        await triggerEvent(this.element.querySelector('input[aria-label="Data Input"]'), 'paste');

        assert.deepEqual(changes, [], 'nothing is reported');
    });

    test('editing, adding and removing with no @onDataChanged handler are all harmless', async function (assert) {
        this.set('data', ['alpha']);

        await render(hbs`<ArrayInput @data={{this.data}} />`);
        await fillIn('input[aria-label="Data Input"]', 'gamma');

        assert.dom('input[aria-label="Data Input"]').hasValue('gamma', 'the edit still lands');

        await click('button.text-red-500');

        assert.dom('input[aria-label="Data Input"]').doesNotExist('and the row is still removed');
    });

    test('it renders with no @data at all', async function (assert) {
        // The constructor defaults both arguments; every other case supplies them.
        await render(hbs`<ArrayInput />`);

        assert.dom('.array-input').exists('the component renders empty');
        assert.dom('input[aria-label="Data Input"]').doesNotExist('with no rows');
        assert.dom('.array-input').doesNotHaveClass('disabled', 'and enabled by default');
    });
});
