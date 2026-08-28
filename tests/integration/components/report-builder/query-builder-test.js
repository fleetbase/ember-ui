import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const TABLES = [
    { name: 'orders', label: 'Orders', description: 'Every dispatched order' },
    { name: 'drivers', label: 'Drivers', description: 'Fleet drivers' },
];

function headerButton(text) {
    return findAll('button.btn').find((button) => button.textContent.includes(text));
}

module('Integration | Component | report-builder/query-builder', function (hooks) {
    setupRenderingTest(hooks);

    let pressed;

    hooks.beforeEach(function () {
        pressed = [];
        this.set('tables', TABLES);
        this.set('onClear', () => pressed.push('clear'));
        this.set('onExecute', () => pressed.push('execute'));
        this.set('onSave', () => pressed.push('save'));
    });

    const TEMPLATE = hbs`
        <ReportBuilder::QueryBuilder @tables={{this.tables}} @onClear={{this.onClear}} @onExecute={{this.onExecute}} @onSave={{this.onSave}} />
    `;

    test('it renders a titled panel with its three controls', async function (assert) {
        await render(TEMPLATE);

        assert.dom(this.element).containsText('Query Builder');
        assert.ok(headerButton('Clear'), 'a clear button is offered');
        assert.ok(headerButton('Execute Query'), 'an execute button is offered');
        assert.ok(headerButton('Save Report'), 'a save button is offered');
    });

    test('it renders a primary table picker and a column slot', async function (assert) {
        await render(TEMPLATE);

        assert.dom(this.element).containsText('Primary Table');
        assert.dom(this.element).containsText('Select Columns');
        assert.dom('.ember-power-select-trigger').exists();
        assert.dom('.ember-power-select-trigger').containsText('Select a table...', 'nothing is chosen to begin with');
    });

    test('each control reports its press', async function (assert) {
        await render(TEMPLATE);

        await click(headerButton('Clear'));
        await click(headerButton('Execute Query'));
        await click(headerButton('Save Report'));

        assert.deepEqual(pressed, ['clear', 'execute', 'save']);
    });

    test('the controls are safe to press with no handlers', async function (assert) {
        await render(hbs`<ReportBuilder::QueryBuilder @tables={{this.tables}} />`);

        await click(headerButton('Clear'));
        await click(headerButton('Execute Query'));
        await click(headerButton('Save Report'));

        assert.dom(this.element).containsText('Query Builder', 'the panel survives without handlers');
    });

    test('the picker lists every table with its description', async function (assert) {
        await render(TEMPLATE);
        await click('.ember-power-select-trigger');

        const options = findAll('.ember-power-select-option').map((option) => option.textContent.replace(/\s+/g, ' ').trim());
        assert.deepEqual(options, ['Orders Every dispatched order', 'Drivers Fleet drivers']);
    });

    test('choosing a table selects it', async function (assert) {
        await render(TEMPLATE);
        await click('.ember-power-select-trigger');
        await click(findAll('.ember-power-select-option')[1]);

        assert.dom('.ember-power-select-trigger').containsText('Drivers');
        assert.dom('.ember-power-select-option').doesNotExist('the dropdown closed itself');
    });

    test('no tables at all renders an empty picker', async function (assert) {
        this.set('tables', []);

        await render(TEMPLATE);
        await click('.ember-power-select-trigger');

        assert.dom('.ember-power-select-option--no-matches-message').exists();
        assert.strictEqual(findAll('.ember-power-select-option:not(.ember-power-select-option--no-matches-message)').length, 0, 'no table options are listed beside the empty-state message');
    });
});
