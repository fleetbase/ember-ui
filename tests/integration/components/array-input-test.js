import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn } from '@ember/test-helpers';
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
});
