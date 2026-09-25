import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const FILTER = { param: 'name', label: 'Name' };

module('Integration | Component | filter/string', function (hooks) {
    setupRenderingTest(hooks);

    let changes;
    let cleared;

    hooks.beforeEach(function () {
        changes = [];
        cleared = [];
        this.set('filter', FILTER);
        this.set('onChange', (filter, value) => changes.push([filter, value]));
        this.set('onClear', (filter) => cleared.push(filter));
    });

    const TEMPLATE = hbs`
        <Filter::String
            @filter={{this.filter}}
            @value={{this.value}}
            @placeholder={{this.placeholder}}
            @onChange={{this.onChange}}
            @onClear={{this.onClear}}
        />
    `;

    function input() {
        return find('[aria-label="Filter Input"]');
    }

    test('it renders an empty input with a disabled clear button', async function (assert) {
        await render(TEMPLATE);

        assert.dom('.filter-string').exists();
        assert.dom(input()).hasValue('');
        assert.dom('.clear-button').isDisabled('there is nothing to clear yet');
    });

    test('an initial value is shown and can be cleared', async function (assert) {
        this.set('value', 'acme');

        await render(TEMPLATE);

        assert.dom(input()).hasValue('acme');
        assert.dom('.clear-button').isNotDisabled();
    });

    test('a placeholder is applied', async function (assert) {
        this.set('placeholder', 'Search by name');

        await render(TEMPLATE);

        assert.dom(input()).hasAttribute('placeholder', 'Search by name');
    });

    test('typing reports the filter and the new value', async function (assert) {
        await render(TEMPLATE);
        await fillIn(input(), 'acme');

        assert.deepEqual(changes, [[FILTER, 'acme']]);
        assert.dom('.clear-button').isNotDisabled('the clear button becomes available');
    });

    test('clearing empties the input and reports the filter', async function (assert) {
        this.set('value', 'acme');

        await render(TEMPLATE);
        await click('.clear-button');

        assert.deepEqual(cleared, [FILTER]);
        assert.dom(input()).hasValue('');
        assert.dom('.clear-button').isDisabled('and becomes unavailable again');
    });

    test('it works without any handlers', async function (assert) {
        await render(hbs`<Filter::String @filter={{this.filter}} @value="acme" />`);

        await fillIn(input(), 'other');
        await click('.clear-button');

        assert.dom(input()).hasValue('', 'the value is still cleared locally');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Filter::String data-test-filter="yes" />`);

        assert.dom('.filter-string').hasAttribute('data-test-filter', 'yes');
    });
});
