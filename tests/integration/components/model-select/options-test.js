import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { A } from '@ember/array';

const DRIVERS = [
    { id: 'drv_1', name: 'Alex Driver' },
    { id: 'drv_2', name: 'Blair Hauler' },
];

const TRIGGER = '.ember-power-select-trigger';

// <ModelSelect::Options> is only ever reached as PowerSelect's @optionsComponent, so it is
// exercised through a real <ModelSelect> rather than by hand-stubbing PowerSelect's @select.
module('Integration | Component | model-select/options', function (hooks) {
    setupRenderingTest(hooks);

    let respondWith;

    hooks.beforeEach(function () {
        respondWith = () => A(DRIVERS.slice());

        this.owner.unregister('service:store');
        this.owner.register(
            'service:store',
            class extends Service {
                query(modelName, query) {
                    return Promise.resolve(respondWith(modelName, query));
                }
                findRecord() {
                    return Promise.resolve(null);
                }
            }
        );
    });

    test('it renders the option list as a listbox', async function (assert) {
        await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" />`);
        await click(TRIGGER);

        const listbox = find('ul[role="listbox"]');
        assert.ok(listbox, 'the options are wrapped in a listbox');
        // PowerSelect's splattributes land on this component's own <ul>, so it IS the
        // power-select options list rather than containing one.
        assert.dom(listbox).hasClass('ember-power-select-options');
        assert.true(listbox.id.startsWith('ember-power-select-options-'), `${listbox.id} is power-select's generated id`);
        assert.strictEqual(findAll('.ember-power-select-option').length, 2, 'the options render inside it');
    });

    test('it yields each option through to the caller block', async function (assert) {
        await render(hbs`
            <ModelSelect @modelName="driver" @optionLabel="name" as |driver|>
                <span class="driver-name">{{driver.name}}</span>
            </ModelSelect>
        `);
        await click(TRIGGER);

        assert.deepEqual(
            findAll('ul[role="listbox"] .driver-name').map((node) => node.textContent.trim()),
            ['Alex Driver', 'Blair Hauler']
        );
    });

    // DEFECT (see DEFECTS.md #105): showLoader is `infiniteScroll && infiniteModel && !select.loading`,
    // and <ModelSelect> passes `infiniteModel=this.model` — a @tracked property that is declared but
    // NEVER assigned anywhere in model-select.js. infiniteModel is therefore always undefined, so the
    // InfinityLoader branch of this component is unreachable and ModelSelect's infinite scroll is inert.
    test('the infinity loader never renders, even with infinite scroll on', async function (assert) {
        await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" />`);
        await click(TRIGGER);

        const items = findAll('ul[role="listbox"] > li');
        assert.strictEqual(items.length, 1, 'only the options list item is rendered');
        assert.notOk(find('ul[role="listbox"] .fleetbase-loader'), 'no loader is rendered despite infiniteScroll defaulting to true');
    });

    test('no infinity loader is rendered when infinite scroll is off', async function (assert) {
        await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" @infiniteScroll={{false}} />`);
        await click(TRIGGER);

        const items = findAll('ul[role="listbox"] > li');
        assert.strictEqual(items.length, 1, 'only the options list item is rendered');
        assert.notOk(find('ul[role="listbox"] .fleetbase-loader'), 'no loader is rendered');
    });

    test('an empty result still renders the listbox', async function (assert) {
        respondWith = () => A([]);

        await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" />`);
        await click(TRIGGER);

        assert.ok(find('ul[role="listbox"]'), 'the listbox is rendered');
        assert.dom('ul[role="listbox"]').doesNotContainText('Alex Driver', 'no records are listed');
        assert.dom('ul[role="listbox"]').doesNotContainText('Blair Hauler');
    });

    test('choosing an option closes the list and reports the record', async function (assert) {
        const changes = [];
        this.set('onChange', (model) => changes.push(model));

        await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" @onChange={{this.onChange}} />`);
        await click(TRIGGER);
        await click(findAll('.ember-power-select-option')[1]);

        assert.strictEqual(changes.length, 1);
        assert.strictEqual(changes[0].id, 'drv_2');
        assert.notOk(find('ul[role="listbox"]'), 'the list closed itself');
    });
});
