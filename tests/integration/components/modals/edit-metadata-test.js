import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/edit-metadata', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<Modals::EditMetadata @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    test('it renders an editable row per metadata entry', async function (assert) {
        this.set('options', { metadata: { driver: 'Alex', attempts: '2' } });

        await render(TEMPLATE);

        const values = findAll('input').map((input) => input.value);
        assert.true(values.includes('driver'), 'the key is editable');
        assert.true(values.includes('Alex'), 'the value is editable');
    });

    test('wrapper classes from the options are applied', async function (assert) {
        this.set('options', { metadata: {}, actionsWrapperClass: 'my-actions', tableWrapperClass: 'my-table' });

        await render(TEMPLATE);

        assert.dom('.my-actions').exists();
        assert.dom('.my-table').exists();
    });

    test('empty metadata renders an editor with no rows', async function (assert) {
        this.set('options', { metadata: {} });

        await render(TEMPLATE);

        // The editor always offers one blank row so a first entry can be added.
        assert.strictEqual(findAll('input').length, 1, 'only the blank new-entry row is offered');
    });

    test('it renders with no options at all', async function (assert) {
        await render(hbs`<Modals::EditMetadata />`);

        assert.dom(this.element).doesNotContainText('undefined');
    });
});
