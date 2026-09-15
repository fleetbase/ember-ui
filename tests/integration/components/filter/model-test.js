import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { A } from '@ember/array';
import { clickTrigger } from 'ember-power-select/test-support/helpers';
import { registerResourceDescriptor } from '@fleetbase/ember-ui/utils/resource-registry';

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

    hooks.beforeEach(function () {
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
