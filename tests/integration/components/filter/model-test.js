import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { A } from '@ember/array';
import { selectChoose, getDropdownItems } from 'ember-power-select/test-support';

const DRIVERS = [
    { id: 'drv_1', name: 'Alex Driver' },
    { id: 'drv_2', name: 'Blair Hauler' },
];

const TRIGGER = '.ember-power-select-trigger';

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
});
