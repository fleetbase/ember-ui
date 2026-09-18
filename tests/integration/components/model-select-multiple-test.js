import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { A } from '@ember/array';
import { selectChoose, selectSearch, getDropdownItems } from 'ember-power-select/test-support';

const DRIVERS = [
    { id: 'drv_1', name: 'Alex Driver' },
    { id: 'drv_2', name: 'Blair Hauler' },
];

const TRIGGER = '.ember-power-select-trigger';

function selectedLabels() {
    return findAll('.ember-power-select-multiple-option').map((option) => option.textContent.replace('×', '').trim());
}

module('Integration | Component | model-select-multiple', function (hooks) {
    setupRenderingTest(hooks);

    let changes;
    let created;
    let queries;

    hooks.beforeEach(function () {
        changes = [];
        created = [];
        queries = [];

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

        this.set('selectedModel', []);
        // PowerSelectMultiple is controlled: feed the selection back in or the next choice
        // replaces rather than accumulates.
        this.set('onChange', (selection) => {
            changes.push(selection.slice());
            this.set('selectedModel', selection);
        });
        this.set('onCreate', (term) => created.push(term));
    });

    const TEMPLATE = hbs`
        <ModelSelectMultiple
            @modelName="driver"
            @optionLabel="name"
            @selectedModel={{this.selectedModel}}
            @placeholder={{this.placeholder}}
            @withCreate={{this.withCreate}}
            @buildSuggestion={{this.buildSuggestion}}
            @infiniteScroll={{false}}
            @renderInPlace={{true}}
            @onChange={{this.onChange}}
            @onCreate={{this.onCreate}}
        />
    `;

    module('rendering', function () {
        test('it renders a multiple-selection picker', async function (assert) {
            await render(TEMPLATE);

            assert.ok(find(TRIGGER), 'the picker renders');
            assert.dom(TRIGGER).hasClass('ember-power-select-multiple-trigger');
            assert.deepEqual(selectedLabels(), [], 'nothing is selected yet');
        });

        test('it searches the nominated model', async function (assert) {
            await render(TEMPLATE);
            await getDropdownItems(TRIGGER);

            assert.strictEqual(queries[0].modelName, 'driver');
        });

        test('records are listed by their label path', async function (assert) {
            await render(TEMPLATE);

            const options = await getDropdownItems(TRIGGER);
            assert.deepEqual(
                options.map((option) => String(option).trim()),
                ['Alex Driver', 'Blair Hauler']
            );
        });

        test('a placeholder can be supplied', async function (assert) {
            this.set('placeholder', 'Choose drivers');

            await render(TEMPLATE);

            assert.dom(`${TRIGGER} input`).hasAttribute('placeholder', 'Choose drivers');
        });

        test('an incoming selection is shown', async function (assert) {
            this.set('selectedModel', [DRIVERS[1]]);

            await render(TEMPLATE);

            assert.deepEqual(selectedLabels(), ['Blair Hauler']);
        });

        test('a block renders each chosen record itself', async function (assert) {
            this.set('selectedModel', [DRIVERS[0]]);

            await render(hbs`
                <ModelSelectMultiple @modelName="driver" @optionLabel="name" @selectedModel={{this.selectedModel}} @infiniteScroll={{false}} @renderInPlace={{true}} @onChange={{this.onChange}} as |driver|>
                    <span class="custom-option">{{driver.id}}</span>
                </ModelSelectMultiple>
            `);

            assert.dom('.custom-option').hasText('drv_1');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<ModelSelectMultiple @modelName="driver" @optionLabel="name" @infiniteScroll={{false}} @renderInPlace={{true}} data-test-multi="yes" />`);

            assert.dom('[data-test-multi="yes"]').exists();
        });
    });

    module('choosing records', function () {
        test('choosing a record reports a list', async function (assert) {
            await render(TEMPLATE);
            await selectChoose(TRIGGER, 'Alex Driver');

            assert.strictEqual(changes.length, 1);
            assert.deepEqual(
                changes[0].map((driver) => driver.id),
                ['drv_1']
            );
            assert.deepEqual(selectedLabels(), ['Alex Driver']);
        });

        test('choices accumulate', async function (assert) {
            await render(TEMPLATE);
            await selectChoose(TRIGGER, 'Alex Driver');
            await selectChoose(TRIGGER, 'Blair Hauler');

            assert.deepEqual(
                changes[1].map((driver) => driver.id),
                ['drv_1', 'drv_2']
            );
            assert.deepEqual(selectedLabels(), ['Alex Driver', 'Blair Hauler']);
        });

        test('a chosen record can be removed again', async function (assert) {
            await render(TEMPLATE);
            await selectChoose(TRIGGER, 'Alex Driver');
            await click('.ember-power-select-multiple-remove-btn');

            assert.deepEqual(changes.at(-1), [], 'an empty list is reported');
            assert.deepEqual(selectedLabels(), []);
        });
    });

    module('creating records', function () {
        test('no suggestion is offered unless creation is enabled', async function (assert) {
            await render(TEMPLATE);
            await selectSearch(TRIGGER, 'Casey');

            const options = await getDropdownItems(TRIGGER);
            assert.false(
                options.some((option) => String(option).includes('Add "Casey"')),
                'only real records are offered'
            );
        });

        test('an unmatched search offers a labelled create suggestion', async function (assert) {
            this.set('withCreate', true);

            await render(TEMPLATE);
            await selectSearch(TRIGGER, 'Casey');

            const labels = findAll('.ember-power-select-option').map((option) => option.textContent.trim());
            assert.strictEqual(labels.length, 3, 'the suggestion is offered alongside the two records');
            assert.strictEqual(labels[0], 'Add "Casey"...', 'and reads as an invitation to create');
            assert.deepEqual(labels.slice(1), ['Alex Driver', 'Blair Hauler']);
        });

        test('a custom suggestion wording is used', async function (assert) {
            this.set('withCreate', true);
            this.set('buildSuggestion', (term) => `Create driver ${term}`);

            await render(TEMPLATE);
            await selectSearch(TRIGGER, 'Casey');

            const labels = findAll('.ember-power-select-option').map((option) => option.textContent.trim());
            assert.strictEqual(labels[0], 'Create driver Casey', 'the custom wording reaches the DOM');
        });

        test('choosing the suggestion reports a creation, not a selection', async function (assert) {
            this.set('withCreate', true);

            await render(TEMPLATE);
            await selectSearch(TRIGGER, 'Casey');
            await click(findAll('.ember-power-select-option')[0]);

            assert.deepEqual(created, ['Casey'], 'the search term is handed to onCreate');
            assert.deepEqual(changes, [], 'and no selection change is reported');
        });

        test('choosing a real record alongside creation still reports a selection', async function (assert) {
            this.set('withCreate', true);

            await render(TEMPLATE);
            await selectChoose(TRIGGER, 'Alex Driver');

            assert.deepEqual(created, [], 'nothing is created');
            assert.strictEqual(changes.length, 1);
        });
    });
});
