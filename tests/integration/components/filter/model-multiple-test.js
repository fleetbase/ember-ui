import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled } from '@ember/test-helpers';
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
        this.owner.register('template:components/select-option/person', hbs`<span data-test-person-option data-compact={{@compact}}>{{@option.name}}</span>`);
    });

    test('it restores chips from a comma-separated id value, peeking before fetching', async function (assert) {
        this.set('filter', { model: 'person' });

        await render(hbs`<Filter::ModelMultiple @filter={{this.filter}} @value="a, b,gone," />`);
        await settled();

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
        await settled();
        assert.dom('.ember-power-select-multiple-option').exists({ count: 1 });

        this.set('value', '');
        await render(hbs`<Filter::ModelMultiple @filter={{this.filter}} @value={{this.value}} />`);
        await settled();
        assert.dom('.ember-power-select-multiple-option').doesNotExist();

        this.set('filter', {});
        await render(hbs`<Filter::ModelMultiple @filter={{this.filter}} @value="a" />`);
        await settled();
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
        await clickTrigger('.ember-power-select-trigger');
        assert.dom('.ember-power-select-option [data-test-person-option]').exists({ count: 3 });

        await click('.ember-power-select-option');
        await clickTrigger('.ember-power-select-trigger');
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
        await settled();
        await click('.ember-power-select-multiple-remove-btn');

        assert.deepEqual(changes, []);
        assert.deepEqual(clears, [this.filter]);
    });
});
