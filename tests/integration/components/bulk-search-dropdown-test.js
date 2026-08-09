import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | bulk-search-dropdown', function (hooks) {
    setupRenderingTest(hooks);

    test('it opens the dropdown with the default title and placeholder', async function (assert) {
        await render(hbs`<BulkSearchDropdown />`);

        assert.dom('.bulk-search-dropdown-container').doesNotExist('dropdown content is closed initially');

        await click('.ember-basic-dropdown-trigger');

        assert.dom('.bulk-search-dropdown-container').exists();
        assert.dom('.filters-dropdown-header h4').hasText('Bulk Search');
        assert.dom('.filters-dropdown-body textarea').hasAttribute('placeholder', "Input comma delimited ID's to perform a bulk search");
        assert.dom('.filters-dropdown-body textarea').hasAttribute('rows', '8');
    });

    test('it renders a custom title, placeholder and prefilled value', async function (assert) {
        await render(hbs`<BulkSearchDropdown @title="Bulk Order Search" @placeholder="Order IDs" @value="order_1,order_2" @rows="4" />`);
        await click('.ember-basic-dropdown-trigger');

        assert.dom('.filters-dropdown-header h4').hasText('Bulk Order Search');
        assert.dom('.filters-dropdown-body textarea').hasAttribute('placeholder', 'Order IDs');
        assert.dom('.filters-dropdown-body textarea').hasAttribute('rows', '4');
        assert.dom('.filters-dropdown-body textarea').hasValue('order_1,order_2');
    });

    test('it submits the entered value and closes the dropdown', async function (assert) {
        const submissions = [];
        this.set('onSubmit', (value) => submissions.push(value));

        await render(hbs`<BulkSearchDropdown @onSubmit={{this.onSubmit}} />`);
        await click('.ember-basic-dropdown-trigger');
        await fillIn('.filters-dropdown-body textarea', 'id_1,id_2,id_3');
        await click(this.element.querySelectorAll('.filters-dropdown-footer button')[1]);

        assert.deepEqual(submissions, ['id_1,id_2,id_3']);
        assert.dom('.bulk-search-dropdown-container').doesNotExist('dropdown closes after submitting');
    });

    test('it clears the value and notifies @onClear', async function (assert) {
        const cleared = [];
        this.set('onClear', (value) => cleared.push(value));

        await render(hbs`<BulkSearchDropdown @value="seed_1,seed_2" @onClear={{this.onClear}} />`);
        await click('.ember-basic-dropdown-trigger');

        assert.dom('.filters-dropdown-body textarea').hasValue('seed_1,seed_2');

        await click(this.element.querySelectorAll('.filters-dropdown-footer button')[0]);

        assert.deepEqual(cleared, ['']);
        assert.dom('.bulk-search-dropdown-container').doesNotExist('dropdown closes after clearing');

        await click('.ember-basic-dropdown-trigger');

        assert.dom('.filters-dropdown-body textarea').hasValue('', 'the value stays cleared when reopened');
    });
});
