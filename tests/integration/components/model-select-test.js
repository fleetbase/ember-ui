import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { A } from '@ember/array';
import { selectChoose, selectSearch, getDropdownItems } from 'ember-power-select/test-support';
import { clickTrigger } from 'ember-power-select/test-support/helpers';

const DRIVERS = [
    { id: 'drv_1', name: 'Alex Driver' },
    { id: 'drv_2', name: 'Blair Hauler' },
];

const TRIGGER = '.ember-power-select-trigger';

module('Integration | Component | model-select', function (hooks) {
    setupRenderingTest(hooks);

    let queries;
    let fetches;
    let respondWith;
    let findRecordCalls;
    let deniedAbilities;

    hooks.beforeEach(function () {
        queries = [];
        fetches = [];
        findRecordCalls = [];
        respondWith = () => A(DRIVERS.slice());
        deniedAbilities = new Set();

        this.owner.unregister('service:store');
        this.owner.register(
            'service:store',
            class extends Service {
                query(modelName, query) {
                    queries.push({ modelName, query });
                    return Promise.resolve(respondWith(modelName, query));
                }
                findRecord(modelName, id) {
                    findRecordCalls.push({ modelName, id });
                    return Promise.resolve({ id, name: `Resolved ${id}` });
                }
                normalize(modelName, payload) {
                    return payload;
                }
                push(record) {
                    return record;
                }
            }
        );

        this.owner.unregister('service:fetch');
        this.owner.register(
            'service:fetch',
            class extends Service {
                get(endpoint, query, options) {
                    fetches.push({ endpoint, query, options });
                    return Promise.resolve([{ uuid: 'drv_9', id: 'drv_9', name: 'Custom Endpoint Driver' }]);
                }
            }
        );

        this.owner.unregister('service:abilities');
        this.owner.register(
            'service:abilities',
            class extends Service {
                cannot(permission) {
                    return deniedAbilities.has(permission);
                }
                can(permission) {
                    return !deniedAbilities.has(permission);
                }
            }
        );

        this.set('modelName', 'driver');
        this.set('optionLabel', 'name');
    });

    const TEMPLATE = hbs`
        <ModelSelect
            @modelName={{this.modelName}}
            @optionLabel={{this.optionLabel}}
            @labelProperty={{this.labelProperty}}
            @selectedModel={{this.selectedModel}}
            @query={{this.query}}
            @pageSize={{this.pageSize}}
            @loadDefaultOptions={{this.loadDefaultOptions}}
            @withCreate={{this.withCreate}}
            @buildSuggestion={{this.buildSuggestion}}
            @customSearchEndpoint={{this.customSearchEndpoint}}
            @permission={{this.permission}}
            @disabled={{this.disabled}}
            @onChange={{this.onChange}}
            @onChangeId={{this.onChangeId}}
            @onCreate={{this.onCreate}}
            @onOpen={{this.onOpen}}
            @onInput={{this.onInput}}
            @onClose={{this.onClose}}
            @placeholder="Pick a driver"
        />
    `;

    module('rendering', function () {
        test('it renders a power select and queries nothing up front', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.fleetbase-model-select').exists();
            assert.dom(TRIGGER).containsText('Pick a driver');
            assert.deepEqual(queries, [], 'rendering alone does not hit the store');
        });

        test('opening the select loads the first page of records', async function (assert) {
            await render(TEMPLATE);
            await click(TRIGGER);

            assert.strictEqual(queries.length, 1);
            assert.strictEqual(queries[0].modelName, 'driver');
            assert.strictEqual(queries[0].query.page, 1, 'the first page is requested');
            assert.strictEqual(queries[0].query.limit, 25, 'the configured page size is requested');

            const options = await getDropdownItems('.fleetbase-model-select');
            assert.deepEqual(options, ['Alex Driver', 'Blair Hauler']);
        });

        test('the page size can be overridden', async function (assert) {
            this.set('pageSize', 5);

            await render(TEMPLATE);
            await click(TRIGGER);

            assert.strictEqual(queries[0].query.limit, 5);
        });

        test('a caller query is forwarded without being mutated', async function (assert) {
            const query = { status: 'active' };
            this.set('query', query);

            await render(TEMPLATE);
            await click(TRIGGER);

            assert.strictEqual(queries[0].query.status, 'active');
            assert.deepEqual(query, { status: 'active' }, 'the caller object is copied, not mutated');
        });

        test('loadDefaultOptions=false suppresses the initial load', async function (assert) {
            this.set('loadDefaultOptions', false);

            await render(TEMPLATE);
            await click(TRIGGER);

            assert.deepEqual(queries, []);
        });

        test('a block is yielded each model instead of the default label', async function (assert) {
            await render(hbs`
                <ModelSelect @modelName="driver" @optionLabel="name" as |driver|>
                    <span class="custom-option">{{driver.id}}</span>
                </ModelSelect>
            `);
            await click(TRIGGER);

            assert.deepEqual(
                findAll('.custom-option').map((node) => node.textContent.trim()),
                ['drv_1', 'drv_2']
            );
        });

        test('a spinner shows while a query is in flight', async function (assert) {
            let release;
            respondWith = () => new Promise((resolve) => (release = () => resolve(A(DRIVERS.slice()))));

            await render(TEMPLATE);
            const opening = click(TRIGGER);
            await settled();

            assert.dom('.ember-model-select__loading').exists();

            release();
            await opening;
            await settled();

            assert.dom('.ember-model-select__loading').doesNotExist();
        });
    });

    module('searching', function () {
        test('a search term is sent with the query after debouncing', async function (assert) {
            await render(TEMPLATE);
            await selectSearch('.fleetbase-model-select', 'blair');

            assert.strictEqual(queries[queries.length - 1].query.query, 'blair');
        });

        test('clearing the search reloads the defaults without a term', async function (assert) {
            await render(TEMPLATE);
            await click(TRIGGER);
            const afterOpen = queries.length;

            await selectSearch('.fleetbase-model-select', '');

            assert.true(queries.length > afterOpen);
            assert.strictEqual(queries[queries.length - 1].query.query, undefined);
        });
    });

    module('selection', function () {
        test('choosing a model reports it to both change handlers', async function (assert) {
            const changed = [];
            const changedIds = [];
            this.set('onChange', (model) => changed.push(model));
            this.set('onChangeId', (id) => changedIds.push(id));

            await render(TEMPLATE);
            await click(TRIGGER);
            await selectChoose('.fleetbase-model-select', 'Alex Driver');

            assert.deepEqual(changed, [DRIVERS[0]]);
            assert.deepEqual(changedIds, ['drv_1']);
            assert.dom(TRIGGER).containsText('Alex Driver');
        });

        test('a preselected model object is shown without a lookup', async function (assert) {
            this.set('selectedModel', DRIVERS[1]);

            await render(TEMPLATE);

            assert.dom(TRIGGER).containsText('Blair Hauler');
            assert.deepEqual(findRecordCalls, [], 'an object needs no resolution');
        });

        test('a preselected id is resolved through the store', async function (assert) {
            this.set('selectedModel', 'drv_7');

            await render(TEMPLATE);

            assert.deepEqual(findRecordCalls, [{ modelName: 'driver', id: 'drv_7' }]);
            assert.dom(TRIGGER).containsText('Resolved drv_7');
        });

        test('replacing the selected model from outside updates the trigger', async function (assert) {
            this.set('selectedModel', DRIVERS[0]);
            await render(TEMPLATE);
            assert.dom(TRIGGER).containsText('Alex Driver');

            this.set('selectedModel', DRIVERS[1]);
            await settled();

            assert.dom(TRIGGER).containsText('Blair Hauler');
        });

        test('it selects without any change handlers', async function (assert) {
            await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" />`);
            await click(TRIGGER);
            await selectChoose('.fleetbase-model-select', 'Alex Driver');

            assert.dom(TRIGGER).containsText('Alex Driver');
        });
    });

    module('creating from a search term', function () {
        test('a suggestion is offered alongside the results', async function (assert) {
            this.set('withCreate', true);
            this.set('labelProperty', 'name');

            await render(TEMPLATE);
            await selectSearch('.fleetbase-model-select', 'Casey');

            const options = await getDropdownItems('.fleetbase-model-select');
            assert.true(options.includes('Add "Casey"...'), 'the default suggestion label is used');
            assert.true(options.includes('Alex Driver'), 'real results are still listed');
        });

        test('the suggestion label can be built by the caller', async function (assert) {
            this.set('withCreate', true);
            this.set('labelProperty', 'name');
            this.set('buildSuggestion', (term) => `Create driver ${term}`);

            await render(TEMPLATE);
            await selectSearch('.fleetbase-model-select', 'Casey');

            const options = await getDropdownItems('.fleetbase-model-select');
            assert.true(options.includes('Create driver Casey'));
        });

        test('choosing the suggestion calls onCreate with the raw term', async function (assert) {
            const created = [];
            const changed = [];
            this.set('withCreate', true);
            this.set('labelProperty', 'name');
            this.set('onCreate', (value) => created.push(value));
            this.set('onChange', (model) => changed.push(model));

            await render(TEMPLATE);
            await selectSearch('.fleetbase-model-select', 'Casey');
            await selectChoose('.fleetbase-model-select', 'Add "Casey"...');

            assert.deepEqual(created, ['Casey']);
            assert.deepEqual(changed, [], 'a suggestion is not reported as a normal change');
        });
    });

    module('a custom search endpoint', function () {
        test('results come from the fetch service instead of the store', async function (assert) {
            this.set('customSearchEndpoint', 'drivers/search');

            await render(TEMPLATE);
            await click(TRIGGER);

            assert.deepEqual(queries, [], 'the store is not queried');
            assert.strictEqual(fetches[0].endpoint, 'drivers/search');

            const options = await getDropdownItems('.fleetbase-model-select');
            assert.deepEqual(options, ['Custom Endpoint Driver']);
        });

        test('the search term is forwarded to the endpoint', async function (assert) {
            this.set('customSearchEndpoint', 'drivers/search');

            await render(TEMPLATE);
            await selectSearch('.fleetbase-model-select', 'casey');

            assert.strictEqual(fetches[fetches.length - 1].query.query, 'casey');
        });

        // A record the store refuses to normalise is dropped rather than taking the whole page
        // down with it.
        test('a result the store cannot normalise is dropped', async function (assert) {
            this.set('customSearchEndpoint', 'drivers/search');
            this.owner.unregister('service:store');
            this.owner.register(
                'service:store',
                class extends Service {
                    query() {
                        return Promise.resolve([]);
                    }
                    normalize() {
                        throw new Error('no serializer for driver');
                    }
                    push(record) {
                        return record;
                    }
                }
            );

            await render(TEMPLATE);
            await click(TRIGGER);

            const options = await getDropdownItems('.fleetbase-model-select');
            assert.deepEqual(options, ['Type to search'], 'the unusable record is dropped rather than left as a hole in the list');
        });

        test('a failing endpoint yields no options rather than an error', async function (assert) {
            this.set('customSearchEndpoint', 'drivers/search');
            this.owner.unregister('service:fetch');
            this.owner.register(
                'service:fetch',
                class extends Service {
                    get() {
                        return Promise.reject(new Error('offline'));
                    }
                }
            );

            await render(TEMPLATE);
            await click(TRIGGER);

            const options = await getDropdownItems('.fleetbase-model-select');
            assert.deepEqual(options, ['Type to search'], 'the failure is absorbed and the select simply offers nothing');
        });

        test('a result with no uuid is still usable', async function (assert) {
            this.set('customSearchEndpoint', 'drivers/search');
            this.owner.unregister('service:fetch');
            this.owner.register(
                'service:fetch',
                class extends Service {
                    get() {
                        return Promise.resolve([{ name: 'Unidentified Driver' }]);
                    }
                }
            );

            await render(TEMPLATE);
            await click(TRIGGER);

            const options = await getDropdownItems('.fleetbase-model-select');
            assert.deepEqual(options, ['Unidentified Driver'], 'an id is invented so the option can be tracked');
        });
    });

    module('permissions and disabling', function () {
        test('an unpermitted select is disabled and never queries', async function (assert) {
            deniedAbilities.add('see drivers');
            this.set('permission', 'see drivers');

            await render(TEMPLATE);

            assert.dom(TRIGGER).hasAttribute('aria-disabled', 'true');

            await click(TRIGGER);
            assert.deepEqual(queries, [], 'a disabled select does not load records');
        });

        test('a permitted select is enabled', async function (assert) {
            this.set('permission', 'see drivers');

            await render(TEMPLATE);

            assert.dom(TRIGGER).hasAttribute('aria-disabled', 'false');
        });

        test('an explicitly disabled select never queries', async function (assert) {
            this.set('disabled', true);

            await render(TEMPLATE);
            await click(TRIGGER);

            assert.dom(TRIGGER).hasAttribute('aria-disabled', 'true');
            assert.deepEqual(queries, []);
        });
    });

    module('pass-through hooks', function () {
        test('open, input and close are all forwarded', async function (assert) {
            const called = [];
            this.set('onOpen', () => called.push('open'));
            this.set('onInput', (term) => called.push(`input:${term}`));
            this.set('onClose', () => called.push('close'));

            await render(TEMPLATE);

            await click(TRIGGER);
            assert.deepEqual(called, ['open']);

            await selectSearch('.fleetbase-model-select', 'al');
            assert.true(called.includes('input:al'));

            await selectChoose('.fleetbase-model-select', 'Alex Driver');
            assert.true(called.includes('close'));
        });

        test('it opens and closes without any hooks', async function (assert) {
            await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" />`);

            await click(TRIGGER);
            await click(TRIGGER);

            assert.ok(find('.fleetbase-model-select'), 'no handler is required');
        });
    });
    // Infinite scroll never worked: `@infiniteModel` was handed a `model` field that was declared
    // and never assigned, and the `<InfinityLoader>` it fed came from ember-infinity, which was
    // not a dependency. Paging is native now.
    module('infinite scroll', function () {
        function page(n, size) {
            return A(Array.from({ length: size }, (_, i) => ({ id: `drv_${n}_${i}`, name: `Driver ${n}-${i}` })));
        }

        // Dispatch only. Assigning scrollTop fires its own native scroll event, so doing both
        // would trigger the loader twice per call.
        async function scrollToBottom() {
            find('.ember-basic-dropdown-content').dispatchEvent(new Event('scroll'));
            await settled();
        }

        test('a full first page is followed by a second when the list is scrolled to the end', async function (assert) {
            respondWith = (modelName, query) => page(query.page, 25);

            await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" @pageSize={{25}} />`);
            await clickTrigger();

            assert.strictEqual(queries.length, 1, 'the first page is requested on open');
            assert.strictEqual(queries[0].query.page, 1);
            assert.strictEqual(queries[0].query.limit, 25, 'with the configured page size');

            await scrollToBottom();

            assert.strictEqual(queries.length, 2, 'reaching the bottom asks for the next page');
            assert.strictEqual(queries[1].query.page, 2, 'and it is the page after');
            assert.strictEqual(findAll('.ember-power-select-option').length, 50, 'the results are appended, not replaced');
        });

        test('a short page means there is nothing more to ask for', async function (assert) {
            respondWith = () => page(1, 3);

            await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" @pageSize={{25}} />`);
            await clickTrigger();
            await scrollToBottom();

            assert.strictEqual(queries.length, 1, 'a page that did not fill is the last one');
        });

        test('the reported total decides when to stop', async function (assert) {
            respondWith = (modelName, query) => {
                const records = page(query.page, 25);
                records.meta = { total: 30 };
                return records;
            };

            await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" @pageSize={{25}} />`);
            await clickTrigger();
            await scrollToBottom();

            assert.strictEqual(queries.length, 2, '25 of 30 loaded, so one more page is fetched');

            await scrollToBottom();

            assert.strictEqual(queries.length, 2, 'and once past the total, no further requests');
        });

        test('@infiniteScroll={{false}} never asks for another page', async function (assert) {
            respondWith = (modelName, query) => page(query.page, 25);

            await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" @infiniteScroll={{false}} @pageSize={{25}} />`);
            await clickTrigger();
            await scrollToBottom();

            assert.strictEqual(queries.length, 1, 'paging is off');
        });

        test('a new search starts again from page one', async function (assert) {
            respondWith = (modelName, query) => page(query.page, 25);

            await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" @pageSize={{25}} />`);
            await clickTrigger();
            await scrollToBottom();
            assert.strictEqual(queries[1].query.page, 2);

            await selectSearch(TRIGGER, 'hauler');

            const latest = queries[queries.length - 1];
            assert.strictEqual(latest.query.page, 1, 'the new term is requested from the first page');
            assert.strictEqual(latest.query.query, 'hauler', 'carrying the search term');

            await scrollToBottom();

            const afterScroll = queries[queries.length - 1];
            assert.strictEqual(afterScroll.query.page, 2, 'and the next page keeps that term');
            assert.strictEqual(afterScroll.query.query, 'hauler');
        });

        test('scrolling while a page is already in flight does not stack requests', async function (assert) {
            let release;
            respondWith = (modelName, query) => {
                if (query.page === 1) return page(1, 25);
                return new Promise((resolve) => (release = () => resolve(page(2, 25))));
            };

            await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" @pageSize={{25}} />`);
            await clickTrigger();

            const content = find('.ember-basic-dropdown-content');
            content.dispatchEvent(new Event('scroll'));
            content.dispatchEvent(new Event('scroll'));
            content.dispatchEvent(new Event('scroll'));

            assert.strictEqual(queries.length, 2, 'the task drops the overlapping scrolls');

            release();
            await settled();
        });
    });
    // Both handler slots are optional, and every case above supplies them.
    module('with handlers omitted', function () {
        test('choosing a suggestion with no @onCreate is a no-op rather than a crash', async function (assert) {
            this.setProperties({ withCreate: true, labelProperty: 'name', onCreate: undefined, onChange: undefined });

            await render(TEMPLATE);
            await selectSearch('.fleetbase-model-select', 'Casey');
            await selectChoose('.fleetbase-model-select', 'Add "Casey"...');

            assert.dom(TRIGGER).exists('the select survives having nothing to report to');
        });

        test('clearing the selection reports it to @onClear', async function (assert) {
            const cleared = [];
            this.set('onClear', (select) => cleared.push(select));
            this.set('selectedModel', { id: 'drv_1', name: 'Alex Driver' });

            await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" @selectedModel={{this.selectedModel}} @allowClear={{true}} @onClear={{this.onClear}} />`);
            await click('.ember-power-select-clear-btn');

            assert.strictEqual(cleared.length, 1, 'the clear is reported');
            assert.strictEqual(typeof cleared[0]?.actions?.close, 'function', 'and the select api comes with it');
        });

        test('clearing the selection reports a null id', async function (assert) {
            // `model?.id ?? null` only reaches its fallback when the model itself is gone.
            // Clearing is opt-in via @allowClear, which the shared TEMPLATE does not pass.
            const changedIds = [];
            this.setProperties({ selectedModel: DRIVERS[1], onChangeId: (id) => changedIds.push(id) });

            await render(hbs`
                <ModelSelect
                    @modelName="driver"
                    @optionLabel="name"
                    @selectedModel={{this.selectedModel}}
                    @onChangeId={{this.onChangeId}}
                    @allowClear={{true}}
                />
            `);
            assert.dom(TRIGGER).containsText('Blair Hauler');

            await click('.ember-power-select-clear-btn');

            assert.deepEqual(changedIds, [null], 'the cleared selection reports null rather than undefined');
        });
    });
});
