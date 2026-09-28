import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function quickLimitButton(label) {
    return findAll('button').find((button) => button.textContent.trim() === label);
}

function removeLimitButton() {
    return findAll('button').find((button) => button.textContent.includes('Remove Limit'));
}

module('Integration | Component | query-builder/limit', function (hooks) {
    setupRenderingTest(hooks);

    let reported;

    hooks.beforeEach(function () {
        reported = [];
        this.set('onChange', (limit) => reported.push(limit));
    });

    const TEMPLATE = hbs`<QueryBuilder::Limit @limit={{this.limit}} @onChange={{this.onChange}} />`;

    function lastReported() {
        return reported[reported.length - 1];
    }

    test('it defaults to 50 and announces that default on insert', async function (assert) {
        await render(TEMPLATE);

        assert.dom('.query-builder-panel-title').containsText('Limit Results');
        assert.dom('.query-builder-panel-header').containsText('Max 50 rows');
        assert.dom('input[type="number"]').hasValue('50');
        assert.deepEqual(reported, [50], 'the default is pushed to the parent so the query object is never limitless by surprise');
    });

    test('a provided limit is used instead of the default', async function (assert) {
        this.set('limit', 250);

        await render(TEMPLATE);

        assert.dom('.query-builder-panel-header').containsText('Max 250 rows');
        assert.deepEqual(reported, [250]);
    });

    test('typing a limit reports the numeric value', async function (assert) {
        await render(TEMPLATE);
        await fillIn('input[type="number"]', '125');

        assert.strictEqual(lastReported(), 125, 'the string from the input is coerced to a number');
        assert.dom('.query-builder-panel-header').containsText('Max 125 rows');
    });

    test('clearing the input removes the limit', async function (assert) {
        await render(TEMPLATE);
        await fillIn('input[type="number"]', '');

        assert.strictEqual(lastReported(), null);
        assert.dom('.query-builder-panel-header').containsText('No limit');
    });

    test('a non-positive limit is treated as no limit', async function (assert) {
        await render(TEMPLATE);

        await fillIn('input[type="number"]', '0');
        assert.strictEqual(lastReported(), null, 'zero rows is not a meaningful limit');

        await fillIn('input[type="number"]', '-5');
        assert.strictEqual(lastReported(), null, 'a negative limit is not meaningful either');
    });

    test('a fractional limit is truncated to whole rows', async function (assert) {
        await render(TEMPLATE);
        await fillIn('input[type="number"]', '12.9');

        assert.strictEqual(lastReported(), 12);
    });

    test('every quick option is offered and applies its value', async function (assert) {
        await render(TEMPLATE);

        for (const label of ['10', '25', '50', '100', '250', '500', '1K', '5K']) {
            assert.ok(quickLimitButton(label), `the ${label} quick option is offered`);
        }

        await click(quickLimitButton('100'));

        assert.strictEqual(lastReported(), 100);
        assert.dom('.query-builder-panel-header').containsText('Max 100 rows');
    });

    test('the active quick option is highlighted', async function (assert) {
        await render(TEMPLATE);

        assert.dom(quickLimitButton('50')).hasClass('border-indigo-300', 'the default matches a quick option');
        assert.dom(quickLimitButton('100')).doesNotHaveClass('border-indigo-300');

        await click(quickLimitButton('100'));

        assert.dom(quickLimitButton('100')).hasClass('border-indigo-300');
        assert.dom(quickLimitButton('50')).doesNotHaveClass('border-indigo-300');
    });

    test('the limit can be removed and the remove control then disappears', async function (assert) {
        await render(TEMPLATE);
        assert.ok(removeLimitButton(), 'a limit is set, so it can be removed');

        await click(removeLimitButton());

        assert.strictEqual(lastReported(), null);
        assert.dom('.query-builder-panel-header').containsText('No limit');
        assert.notOk(removeLimitButton(), 'there is nothing left to remove');
    });

    test('large limits carry a performance notice', async function (assert) {
        await render(TEMPLATE);
        assert.dom(this.element).doesNotContainText('Performance Notice', '50 rows is not a concern');

        await click(quickLimitButton('1K'));

        assert.dom(this.element).containsText('Performance Notice');
        assert.dom(this.element).containsText('Large result sets may take longer');
    });

    test('a limit just below the threshold carries no notice', async function (assert) {
        await render(TEMPLATE);
        await fillIn('input[type="number"]', '999');

        assert.dom(this.element).doesNotContainText('Performance Notice');
    });

    test('it works without an onChange handler', async function (assert) {
        await render(hbs`<QueryBuilder::Limit />`);
        await click(quickLimitButton('25'));

        assert.dom('.query-builder-panel-header').containsText('Max 25 rows');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<QueryBuilder::Limit data-test-limit="yes" />`);

        assert.dom('.query-builder-panel').hasAttribute('data-test-limit', 'yes');
    });
});
