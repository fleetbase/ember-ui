import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function buttonWithText(text) {
    return findAll('button').find((button) => button.textContent.trim().includes(text));
}

module('Integration | Component | query-builder/actions', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<QueryBuilder::Actions @onClear={{this.onClear}} @onExecute={{this.onExecute}} @onSave={{this.onSave}} />`;

    test('it renders the three query operations', async function (assert) {
        await render(TEMPLATE);

        assert.dom('.query-builder-panel-title').containsText('Actions');
        assert.dom('.query-builder-panel-header').containsText('Query operations');
        assert.strictEqual(findAll('.query-builder-actions button').length, 3);
        assert.ok(buttonWithText('Clear'));
        assert.ok(buttonWithText('Execute'));
        assert.ok(buttonWithText('Save'));
    });

    test('each button invokes its own handler and no other', async function (assert) {
        const called = [];
        this.set('onClear', () => called.push('clear'));
        this.set('onExecute', () => called.push('execute'));
        this.set('onSave', () => called.push('save'));

        await render(TEMPLATE);

        await click(buttonWithText('Execute'));
        assert.deepEqual(called, ['execute']);

        await click(buttonWithText('Save'));
        assert.deepEqual(called, ['execute', 'save']);

        await click(buttonWithText('Clear'));
        assert.deepEqual(called, ['execute', 'save', 'clear']);
    });

    test('a non-callable handler is ignored rather than invoked', async function (assert) {
        this.set('onExecute', 'not a function');

        await render(TEMPLATE);
        await click(buttonWithText('Execute'));

        assert.dom('.query-builder-panel').exists('clicking is a no-op');
    });

    test('the buttons are inert when no handlers are given', async function (assert) {
        await render(hbs`<QueryBuilder::Actions />`);

        await click(buttonWithText('Clear'));
        await click(buttonWithText('Execute'));
        await click(buttonWithText('Save'));

        assert.dom('.query-builder-panel').exists('no handler is required');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<QueryBuilder::Actions data-test-actions="yes" />`);

        assert.dom('.query-builder-panel').hasAttribute('data-test-actions', 'yes');
    });
    test('each handler receives the query object the component was given', async function (assert) {
        const received = [];
        const queryObject = { sql: 'select 1' };
        this.set('queryObject', queryObject);
        this.set('onExecute', (value) => received.push(['execute', value]));
        this.set('onSave', (value) => received.push(['save', value]));
        this.set('onClear', (value) => received.push(['clear', value]));

        await render(hbs`<QueryBuilder::Actions @queryObject={{this.queryObject}} @onExecute={{this.onExecute}} @onSave={{this.onSave}} @onClear={{this.onClear}} />`);

        for (const button of findAll('button')) {
            await click(button);
        }

        assert.deepEqual(received.map(([name]) => name).sort(), ['clear', 'execute', 'save'], 'all three handlers fire');
        assert.deepEqual(
            received.map(([, value]) => value),
            [queryObject, queryObject, queryObject],
            'and each is handed the query object rather than undefined'
        );
    });
});
