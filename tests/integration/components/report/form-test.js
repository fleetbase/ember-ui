import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | report/form', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('resource', {
            title: 'Weekly orders',
            description: 'Orders grouped by day',
            query_config: {},
            fillResult: () => {},
        });
    });

    test('it wraps a report builder bound to the resource', async function (assert) {
        await render(hbs`<Report::Form @resource={{this.resource}} />`);

        assert.dom('.form-wrapper').exists();

        const values = findAll('.form-wrapper input').map((input) => input.value);
        assert.true(values.includes('Weekly orders'), 'the report title is bound through to the builder');
        assert.true(values.includes('Orders grouped by day'));
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Report::Form @resource={{this.resource}} class="p-4" data-test-form="yes" />`);

        assert.dom('.form-wrapper').hasClass('p-4');
        assert.dom('.form-wrapper').hasAttribute('data-test-form', 'yes');
    });

    test('it renders with no resource at all', async function (assert) {
        await render(hbs`<Report::Form />`);

        assert.dom('.form-wrapper').exists();
        assert.dom(this.element).containsText('Report Details');
    });
});
