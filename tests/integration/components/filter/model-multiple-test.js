import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { A } from '@ember/array';
import { clickTrigger } from 'ember-power-select/test-support/helpers';
import { registerResourceDescriptor } from '@fleetbase/ember-ui/utils/resource-registry';

const RECORDS = [
    { id: 'a', name: 'Ada' },
    { id: 'b', name: 'Bob' },
    { id: 'c', name: 'Cy' },
];

class StoreStub extends Service {
    peeked = [];
    found = [];

    query() {
        return Promise.resolve(A(RECORDS.slice()));
    }

    peekRecord(modelName, id) {
        this.peeked.push(id);
        return id === 'a' ? RECORDS[0] : null;
    }

    findRecord(modelName, id) {
        this.found.push(id);

        if (id === 'gone') {
            return Promise.reject(new Error('not found'));
        }

        return Promise.resolve(RECORDS.find((record) => record.id === id) ?? null);
    }
}

module('Integration | Component | filter/model-multiple', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.owner.register('service:store', StoreStub);
        this.owner.register('template:components/select-option/person', hbs`<span data-test-person-option data-compact={{if @compact "true"}}>{{@option.name}}</span>`);
    });

    test('it restores chips from a comma-separated id value, peeking before fetching', async function (assert) {
        this.set('filter', { model: 'person' });

        await render(hbs`<Filter::ModelMultiple @filter={{this.filter}} @value="a, b,gone," />`);

        const store = this.owner.lookup('service:store');
        assert.deepEqual(store.peeked, ['a', 'b', 'gone']);
        assert.deepEqual(store.found, ['b', 'gone'], 'only ids that were not in the store are fetched');
        assert.dom('.ember-power-select-multiple-option').exists({ count: 2 }, 'an id that no longer resolves drops out');
        assert.dom('.ember-power-select-multiple-option').includesText('Ada');
    });

    test('an array value and an empty value are accepted', async function (assert) {
        this.set('filter', { model: 'person' });
        this.set('value', ['a', null]);

        await render(hbs`<Filter::ModelMultiple @filter={{this.filter}} @value={{this.value}} />`);
        assert.dom('.ember-power-select-multiple-option').exists({ count: 1 });

        this.set('value', '');
        await render(hbs`<Filter::ModelMultiple @filter={{this.filter}} @value={{this.value}} />`);
        assert.dom('.ember-power-select-multiple-option').doesNotExist();

        this.set('filter', {});
        await render(hbs`<Filter::ModelMultiple @filter={{this.filter}} @value="a" />`);
        assert.dom('.ember-power-select-multiple-option').doesNotExist('no model name means nothing to restore');
    });

    test('it emits joined ids, reports clearing, and renders options with the registered select-option', async function (assert) {
        registerResourceDescriptor(this.owner, { key: 'person', modelNames: ['person'] });
        const changes = [];
        const clears = [];
        this.set('filter', { model: 'person' });
        this.set('onChange', (filter, value) => changes.push(value));
        this.set('onClear', (filter) => clears.push(filter));

        await render(hbs`<Filter::ModelMultiple @filter={{this.filter}} @onChange={{this.onChange}} @onClear={{this.onClear}} />`);
        await clickTrigger('.ember-model-select');
        assert.dom('.ember-power-select-option [data-test-person-option]').exists({ count: 3 });

        await click('.ember-power-select-option');
        await clickTrigger('.ember-model-select');
        await click('.ember-power-select-option:nth-child(2)');
        assert.deepEqual(changes, ['a', 'a,b']);
        assert.dom('.ember-power-select-multiple-option [data-test-person-option][data-compact="true"]').exists({ count: 2 });

        await click('.clear-button');
        assert.deepEqual(clears, [this.filter]);
        assert.dom('.ember-power-select-multiple-option').doesNotExist();
        assert.dom('.clear-button').isDisabled();
    });

    test('removing the last chip reports a clear instead of an empty change', async function (assert) {
        const changes = [];
        const clears = [];
        this.set('filter', { model: 'person' });
        this.set('onChange', (filter, value) => changes.push(value));
        this.set('onClear', (filter) => clears.push(filter));

        await render(hbs`<Filter::ModelMultiple @filter={{this.filter}} @value="a" @onChange={{this.onChange}} @onClear={{this.onClear}} />`);
        await click('.ember-power-select-multiple-remove-btn');

        assert.deepEqual(changes, []);
        assert.deepEqual(clears, [this.filter]);
    });

    module('without the optional handlers', function () {
        test('a column may name its own option component', async function (assert) {
            registerResourceDescriptor(this.owner, { key: 'person', modelNames: ['person'] });
            this.owner.register('template:components/custom-option', hbs`<span data-test-custom-option>{{@option.name}}</span>`);
            this.set('filter', { model: 'person', filterOptionComponent: 'custom-option' });

            await render(hbs`<Filter::ModelMultiple @filter={{this.filter}} />`);
            await clickTrigger('.ember-model-select');

            assert.dom('.ember-power-select-option [data-test-custom-option]').exists({ count: 3 }, 'the column component wins over the registered one');
            assert.dom('.ember-power-select-option [data-test-person-option]').doesNotExist();
        });

        test('choosing with no @onChange behind it still keeps the chip', async function (assert) {
            this.set('filter', { model: 'person' });

            await render(hbs`<Filter::ModelMultiple @filter={{this.filter}} />`);
            await clickTrigger('.ember-model-select');
            await click('.ember-power-select-option');

            assert.dom('.ember-power-select-multiple-option').exists({ count: 1 }, 'the selection is kept with nothing to report to');
        });

        test('removing the last chip with no @onClear behind it still empties the selection', async function (assert) {
            this.set('filter', { model: 'person' });

            await render(hbs`<Filter::ModelMultiple @filter={{this.filter}} @value="a" />`);
            assert.dom('.ember-power-select-multiple-option').exists({ count: 1 });

            await click('.ember-power-select-multiple-remove-btn');

            assert.dom('.ember-power-select-multiple-option').doesNotExist('the chip is gone with nothing to report to');
        });

        test('the clear button with no @onClear behind it still empties the selection', async function (assert) {
            this.set('filter', { model: 'person' });

            await render(hbs`<Filter::ModelMultiple @filter={{this.filter}} @value="a" />`);

            await click('.clear-button');

            assert.dom('.ember-power-select-multiple-option').doesNotExist();
            assert.dom('.clear-button').isDisabled();
        });
    });
});
