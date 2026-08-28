import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const BOX = '.filter-checkbox input[type="checkbox"]';

module('Integration | Component | filter/checkbox', function (hooks) {
    setupRenderingTest(hooks);

    let changes;

    hooks.beforeEach(function () {
        changes = [];
        this.set('filter', { key: 'is_active', label: 'Active only' });
        this.set('onChange', (filter, value) => changes.push([filter.key, value]));
    });

    const TEMPLATE = hbs`<Filter::Checkbox @filter={{this.filter}} @value={{this.value}} @onChange={{this.onChange}} />`;

    module('rendering', function () {
        test('it renders an unchecked box labelled by the filter', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.filter-checkbox').exists();
            assert.dom(BOX).isNotChecked();
            assert.dom('.filter-checkbox').containsText('Active only');
        });

        test('a filter label override wins', async function (assert) {
            this.set('filter', { key: 'is_active', label: 'Active only', filterLabel: 'Only active records' });

            await render(TEMPLATE);

            assert.dom('.filter-checkbox').containsText('Only active records');
            assert.dom('.filter-checkbox').doesNotContainText('Active only');
        });
    });

    module('reading the incoming value', function () {
        test('a true value checks the box', async function (assert) {
            this.set('value', true);

            await render(TEMPLATE);

            assert.dom(BOX).isChecked();
        });

        test('the string "true" checks the box', async function (assert) {
            this.set('value', 'true');

            await render(TEMPLATE);

            assert.dom(BOX).isChecked();
        });

        test('the string "1" checks the box', async function (assert) {
            this.set('value', '1');

            await render(TEMPLATE);

            assert.dom(BOX).isChecked();
        });

        test('the string "false" leaves the box clear', async function (assert) {
            this.set('value', 'false');

            await render(TEMPLATE);

            assert.dom(BOX).isNotChecked();
        });

        test('an unrelated string leaves the box clear', async function (assert) {
            this.set('value', 'maybe');

            await render(TEMPLATE);

            assert.dom(BOX).isNotChecked();
        });

        test('no value at all leaves the box clear', async function (assert) {
            await render(TEMPLATE);

            assert.dom(BOX).isNotChecked();
        });
    });

    module('toggling', function () {
        test('ticking the box reports it', async function (assert) {
            await render(TEMPLATE);
            await click(BOX);

            assert.dom(BOX).isChecked();
            assert.deepEqual(changes, [['is_active', true]]);
        });

        test('unticking the box reports it', async function (assert) {
            this.set('value', true);

            await render(TEMPLATE);
            await click(BOX);

            assert.dom(BOX).isNotChecked();
            assert.deepEqual(changes, [['is_active', false]]);
        });

        test('it toggles happily without an onChange handler', async function (assert) {
            await render(hbs`<Filter::Checkbox @filter={{this.filter}} />`);
            await click(BOX);

            assert.dom(BOX).isChecked();
        });
    });
});
