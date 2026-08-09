import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { selectChoose, getDropdownItems } from 'ember-power-select/test-support';

const FILTER = { param: 'status', label: 'Status' };
const OPTIONS = [
    { name: 'Active', id: 'active' },
    { name: 'Pending', id: 'pending' },
    { name: 'Cancelled', id: 'cancelled' },
];

const SCOPE = '.filter-multi-option';

module('Integration | Component | filter/multi-option', function (hooks) {
    setupRenderingTest(hooks);

    let changes;
    let requests;
    let respondWith;

    hooks.beforeEach(function () {
        changes = [];
        requests = [];
        respondWith = () => OPTIONS;

        this.owner.unregister('service:fetch');
        this.owner.register(
            'service:fetch',
            class extends Service {
                get(uri, params) {
                    requests.push({ uri, params });
                    return Promise.resolve(respondWith());
                }
            }
        );

        this.set('filter', FILTER);
        this.set('optionLabel', 'name');
        this.set('onChange', (filter, value) => changes.push([filter, value]));
    });

    const TEMPLATE = hbs`
        <Filter::MultiOption
            @filter={{this.filter}}
            @value={{this.value}}
            @options={{this.options}}
            @optionLabel={{this.optionLabel}}
            @optionValue={{this.optionValue}}
            @placeholder={{this.placeholder}}
            @fetchUri={{this.fetchUri}}
            @fetchParams={{this.fetchParams}}
            @onChange={{this.onChange}}
        />
    `;

    function selectedLabels() {
        return findAll(`${SCOPE} .ember-power-select-multiple-option`).map((node) => node.textContent.replace(/[×✕]\s*/g, '').trim());
    }

    module('rendering', function () {
        test('it renders a multi select with the supplied options', async function (assert) {
            this.set('options', OPTIONS);

            await render(TEMPLATE);

            assert.dom(SCOPE).exists();
            const items = await getDropdownItems(SCOPE);
            assert.deepEqual(items, ['Active', 'Pending', 'Cancelled']);
            assert.deepEqual(requests, [], 'no request is made for local options');
        });

        test('a non-array options argument is ignored', async function (assert) {
            this.set('options', 'not an array');

            await render(TEMPLATE);

            const items = await getDropdownItems(SCOPE);
            assert.deepEqual(items, ['Type to search'], 'nothing bogus is offered');
        });

        test('a placeholder is applied', async function (assert) {
            this.set('options', OPTIONS);
            this.set('placeholder', 'Any status');

            await render(TEMPLATE);

            assert.dom(`${SCOPE} .ember-power-select-placeholder`).hasText('Any status');
        });

        test('an option with no label key falls back to the option itself', async function (assert) {
            this.set('options', ['active', 'pending']);
            this.set('optionLabel', undefined);

            await render(TEMPLATE);

            const items = await getDropdownItems(SCOPE);
            assert.deepEqual(items, ['active', 'pending'], 'plain strings render as themselves');
        });
    });

    module('parsing the incoming value', function () {
        test('an array value is used as-is', async function (assert) {
            this.set('options', OPTIONS);
            this.set('value', ['active', 'pending']);

            await render(TEMPLATE);

            assert.deepEqual(selectedLabels(), ['active', 'pending']);
        });

        test('a comma-delimited string is split', async function (assert) {
            this.set('options', OPTIONS);
            this.set('value', 'active,pending');

            await render(TEMPLATE);

            assert.deepEqual(selectedLabels(), ['active', 'pending']);
        });

        test('a single string becomes a one-element selection', async function (assert) {
            this.set('options', OPTIONS);
            this.set('value', 'active');

            await render(TEMPLATE);

            assert.deepEqual(selectedLabels(), ['active']);
        });

        test('an empty value selects nothing', async function (assert) {
            this.set('options', OPTIONS);

            await render(TEMPLATE);

            assert.deepEqual(selectedLabels(), []);
        });
    });

    module('changing the selection', function () {
        test('choosing an option reports the whole object by default', async function (assert) {
            this.set('options', OPTIONS);

            await render(TEMPLATE);
            await selectChoose(SCOPE, 'Active');

            assert.strictEqual(changes.length, 1);
            const [filter, value] = changes[0];
            assert.strictEqual(filter, FILTER);
            assert.deepEqual(value, [OPTIONS[0]], 'the option object is reported');
        });

        test('an optionValue reduces the reported selection to that key', async function (assert) {
            this.set('options', OPTIONS);
            this.set('optionValue', 'id');

            await render(TEMPLATE);
            await selectChoose(SCOPE, 'Active');

            assert.deepEqual(changes[0][1], ['active']);
        });

        test('string options are reported unchanged even with an optionValue', async function (assert) {
            this.set('options', ['active', 'pending']);
            this.set('optionLabel', undefined);
            this.set('optionValue', 'id');

            await render(TEMPLATE);
            await selectChoose(SCOPE, 'active');

            assert.deepEqual(changes[0][1], ['active']);
        });

        test('choosing several options accumulates them', async function (assert) {
            this.set('options', OPTIONS);
            this.set('optionValue', 'id');

            await render(TEMPLATE);
            await selectChoose(SCOPE, 'Active');
            await selectChoose(SCOPE, 'Pending');

            assert.deepEqual(changes[changes.length - 1][1], ['active', 'pending']);
        });

        test('it selects without an onChange handler', async function (assert) {
            this.set('options', OPTIONS);

            await render(hbs`<Filter::MultiOption @filter={{this.filter}} @options={{this.options}} @optionLabel="name" />`);
            await selectChoose(SCOPE, 'Active');

            assert.deepEqual(selectedLabels(), ['Active'], 'the selection is still applied');
        });
    });

    module('fetching options', function () {
        test('a fetch uri loads the options remotely', async function (assert) {
            this.set('fetchUri', 'statuses');

            await render(TEMPLATE);

            assert.strictEqual(requests.length, 1);
            assert.strictEqual(requests[0].uri, 'statuses');

            const items = await getDropdownItems(SCOPE);
            assert.deepEqual(items, ['Active', 'Pending', 'Cancelled']);
        });

        test('fetch params are merged into the request', async function (assert) {
            this.set('fetchUri', 'statuses');
            this.set('fetchParams', { scope: 'orders' });

            await render(TEMPLATE);

            assert.strictEqual(requests[0].params.scope, 'orders');
        });

        test('a failed fetch leaves the options empty rather than throwing', async function (assert) {
            this.set('fetchUri', 'statuses');
            respondWith = () => {
                throw new Error('offline');
            };

            await render(TEMPLATE);

            assert.ok(find(SCOPE), 'the control still renders');
            const items = await getDropdownItems(SCOPE);
            assert.deepEqual(items, ['Type to search'], 'the failure is absorbed and nothing is offered');
        });

        test('a spinner is shown while the request is in flight', async function (assert) {
            let release;
            this.set('fetchUri', 'statuses');
            respondWith = () => new Promise((resolve) => (release = () => resolve(OPTIONS)));

            const rendering = render(TEMPLATE);
            await settled();

            assert.dom(`${SCOPE} .ember-model-select__loading`).exists();

            release();
            await rendering;
            await settled();

            assert.dom(`${SCOPE} .ember-model-select__loading`).doesNotExist();
        });

        test('no fetch uri means no request', async function (assert) {
            this.set('options', OPTIONS);

            await render(TEMPLATE);

            assert.deepEqual(requests, []);
        });
    });
});
