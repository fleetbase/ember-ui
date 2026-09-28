import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/cell/status', function (hooks) {
    setupRenderingTest(hooks);

    test('it falls back to Pending when there is no value', async function (assert) {
        await render(hbs`<Table::Cell::Status />`);

        assert.dom(this.element).containsText('Pending');
    });

    test('it renders the supplied status', async function (assert) {
        await render(hbs`<Table::Cell::Status @value="completed" />`);

        assert.dom(this.element).containsText('Completed', 'the badge humanizes the status');
    });

    test('an empty string renders an empty badge rather than the Pending default', async function (assert) {
        // `get-default-value` only substitutes for nullish values, so an empty
        // string is passed through as-is.
        await render(hbs`<Table::Cell::Status @value="" />`);

        assert.dom(this.element).hasText('');
    });

    test('it falls back to Pending for null', async function (assert) {
        this.set('value', null);

        await render(hbs`<Table::Cell::Status @value={{this.value}} />`);

        assert.dom(this.element).containsText('Pending');
    });

    test('it renders a badge element', async function (assert) {
        await render(hbs`<Table::Cell::Status @value="active" />`);

        assert.dom('.status-badge, [class*="badge"]').exists('the status is presented as a badge');
    });

    test('it updates when the status changes', async function (assert) {
        this.set('value', 'pending');
        await render(hbs`<Table::Cell::Status @value={{this.value}} />`);
        assert.dom(this.element).containsText('Pending');

        this.set('value', 'canceled');
        assert.dom(this.element).containsText('Canceled');
    });
});
