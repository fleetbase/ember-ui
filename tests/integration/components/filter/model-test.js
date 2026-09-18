import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { A } from '@ember/array';
import { selectChoose, getDropdownItems } from 'ember-power-select/test-support';
import { clickTrigger } from 'ember-power-select/test-support/helpers';
import { registerResourceDescriptor } from '@fleetbase/ember-ui/utils/resource-registry';

const DRIVERS = [
    { id: 'drv_1', name: 'Alex Driver' },
    { id: 'drv_2', name: 'Blair Hauler' },
];

const TRIGGER = '.ember-power-select-trigger';

const RECORDS = [
    { id: 'a', name: 'Ada', phone: '+1' },
    { id: 'b', name: 'Bob', phone: '+2' },
];

class StoreStub extends Service {
    query() {
        return Promise.resolve(A(RECORDS.slice()));
    }

    peekRecord(modelName, id) {
        return RECORDS.find((record) => record.id === id) ?? null;
    }

    findRecord(modelName, id) {
        return Promise.resolve(this.peekRecord(modelName, id));
    }
}

module('Integration | Component | filter/model', function (hooks) {
    setupRenderingTest(hooks);

    let changes;
    let cleared;
    let queries;

    hooks.beforeEach(function () {
        changes = [];
        cleared = [];
        queries = [];
        this.set('filter', { key: 'driver_uuid', model: 'driver' });
        this.set('onChange', (filter, value) => changes.push([filter.key, value]));
        this.set('onClear', (filter) => cleared.push(filter.key));

        this.owner.unregister('service:store');
        this.owner.register(
            'service:store',
            class extends Service {
                query(modelName, query) {
                    queries.push({ modelName, query });
                    return Promise.resolve(A(DRIVERS.slice()));
                }
                findRecord(modelName, id) {
                    return Promise.resolve({ id, name: `Resolved ${id}` });
                }
            }
        );
    });

    const TEMPLATE = hbs`<Filter::Model @filter={{this.filter}} @value={{this.value}} @placeholder={{this.placeholder}} @onChange={{this.onChange}} @onClear={{this.onClear}} />`;

    test('it renders a picker for the filtered model', async function (assert) {
        await render(TEMPLATE);
        await getDropdownItems(TRIGGER);

        assert.ok(find(TRIGGER), 'the picker renders');
        assert.strictEqual(queries[0].modelName, 'driver', 'the filter names the model to search');
    });

    test('a placeholder can be supplied', async function (assert) {
        this.set('placeholder', 'Any driver');

        await render(TEMPLATE);

        assert.dom(TRIGGER).containsText('Any driver');
    });

    test('records are listed by name', async function (assert) {
        await render(TEMPLATE);

        const options = await getDropdownItems(TRIGGER);
        assert.deepEqual(
            options.map((option) => String(option).trim()),
            ['Alex Driver', 'Blair Hauler']
        );
    });

    test('a different name path is honoured', async function (assert) {
        this.set('filter', { key: 'driver_uuid', model: 'driver', modelNamePath: 'id' });

        await render(TEMPLATE);

        const options = await getDropdownItems(TRIGGER);
        assert.deepEqual(
            options.map((option) => String(option).trim()),
            ['drv_1', 'drv_2']
        );
    });

    test('an extra query from the filter is forwarded to the store', async function (assert) {
        this.set('filter', { key: 'driver_uuid', model: 'driver', query: { status: 'active' } });

        await render(TEMPLATE);
        await getDropdownItems(TRIGGER);

        assert.strictEqual(queries[0].query.status, 'active');
    });

    test('an incoming record is preselected', async function (assert) {
        this.set('value', DRIVERS[1]);

        await render(TEMPLATE);

        assert.dom(TRIGGER).containsText('Blair Hauler');
    });

    test('choosing a record reports its id', async function (assert) {
        await render(TEMPLATE);
        await selectChoose(TRIGGER, 'Alex Driver');

        assert.deepEqual(changes, [['driver_uuid', 'drv_1']]);
        assert.dom(TRIGGER).containsText('Alex Driver');
    });

    test('clearing the choice reaches the onClear handler', async function (assert) {
        this.set('value', DRIVERS[0]);

        await render(TEMPLATE);
        await click('.ember-power-select-clear-btn');

        assert.dom(TRIGGER).doesNotContainText('Alex Driver', 'the selection is dropped');
        assert.strictEqual(cleared.length, 1, 'onClear runs exactly once');
    });

    test('it chooses and clears happily without handlers', async function (assert) {
        await render(hbs`<Filter::Model @filter={{this.filter}} />`);
        await selectChoose(TRIGGER, 'Blair Hauler');

        assert.dom(TRIGGER).containsText('Blair Hauler');

        await click('.ember-power-select-clear-btn');
        assert.dom(TRIGGER).doesNotContainText('Blair Hauler');
    });

    module('the registered select-option component', function (nested) {
        nested.beforeEach(function () {
            // The outer beforeEach already registered a store stub; replace it with the
            // one these tests need (peekRecord included).
            this.owner.unregister('service:store');
            this.owner.register('service:store', StoreStub);
            this.owner.register('template:components/select-option/person', hbs`<span data-test-person-option data-compact={{if @compact "true"}}>{{@option.name}}</span>`);
            this.owner.register('template:components/custom-option', hbs`<span data-test-custom-option>{{@option.name}}!</span>`);
        });

        test('it renders options and the trigger with the select-option registered for the model', async function (assert) {
            assert.expect(6);
            registerResourceDescriptor(this.owner, { key: 'person', modelNames: ['person'] });
            this.set('filter', { model: 'person', filterValue: null });
            this.set('onChange', (filter, value) => {
                assert.strictEqual(filter, this.filter);
                assert.strictEqual(value, 'a', 'the id is emitted');
            });

            await render(hbs`<Filter::Model @filter={{this.filter}} @onChange={{this.onChange}} />`);
            await clickTrigger('.ember-model-select');

            assert.dom('.ember-power-select-option [data-test-person-option]').exists({ count: 2 });
            assert.dom('.ember-power-select-option [data-test-person-option]').doesNotHaveAttribute('data-compact');

            await click('.ember-power-select-option');
            assert.dom('.ember-power-select-trigger [data-test-person-option]').hasText('Ada');
            assert.dom('.ember-power-select-trigger [data-test-person-option]').hasAttribute('data-compact', 'true', 'the trigger shows the compact variant');
        });

        test('a column may name its own option component', async function (assert) {
            registerResourceDescriptor(this.owner, { key: 'person', modelNames: ['person'] });
            this.set('filter', { model: 'person', filterOptionComponent: 'custom-option' });

            await render(hbs`<Filter::Model @filter={{this.filter}} />`);
            await clickTrigger('.ember-model-select');

            assert.dom('.ember-power-select-option [data-test-custom-option]').exists({ count: 2 });
            assert.dom('.ember-power-select-option [data-test-person-option]').doesNotExist();
        });

        test('it falls back to the model name path when no select-option exists', async function (assert) {
            this.set('filter', { model: 'unknown-thing', modelNamePath: 'phone' });

            await render(hbs`<Filter::Model @filter={{this.filter}} />`);
            await clickTrigger('.ember-model-select');

            assert.dom('.ember-power-select-option').exists({ count: 2 });
            assert.dom('.ember-power-select-option').hasText('+1');
        });

        test('clearing reports the filter', async function (assert) {
            assert.expect(2);
            this.set('filter', { model: 'unknown-thing' });
            this.set('onClear', (filter) => assert.strictEqual(filter, this.filter));

            await render(hbs`<Filter::Model @filter={{this.filter}} @value={{null}} @onClear={{this.onClear}} />`);
            await clickTrigger('.ember-model-select');
            await click('.ember-power-select-option');
            assert.dom('.ember-power-select-selected-item').hasText('Ada');

            await click('.ember-power-select-clear-btn');
        });
    });
});
