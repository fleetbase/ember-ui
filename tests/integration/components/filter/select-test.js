import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

const FILTER = { param: 'status', label: 'Status' };
const OPTIONS = [
    { label: 'Active', value: 'active' },
    { label: 'Pending', value: 'pending' },
];

module('Integration | Component | filter/select', function (hooks) {
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
        this.set('onChange', (filter, selection) => changes.push([filter, selection]));
    });

    const TEMPLATE = hbs`
        <Filter::Select
            @filter={{this.filter}}
            @value={{this.value}}
            @options={{this.options}}
            @optionLabel={{this.optionLabel}}
            @optionValue={{this.optionValue}}
            @placeholder={{this.placeholder}}
            @fetchUri={{this.fetchUri}}
            @fetchParams={{this.fetchParams}}
            @filterOptionLabel={{this.filterOptionLabel}}
            @filterOptionValue={{this.filterOptionValue}}
            @filterPlaceholder={{this.filterPlaceholder}}
            @onChange={{this.onChange}}
        />
    `;

    function optionLabels() {
        return findAll('option').map((option) => option.textContent.trim());
    }

    test('it renders the supplied options', async function (assert) {
        this.set('options', OPTIONS);

        await render(TEMPLATE);

        assert.true(optionLabels().includes('Active'));
        assert.true(optionLabels().includes('Pending'));
        assert.deepEqual(requests, [], 'no request is made when options are supplied');
    });

    test('a non-array options argument is ignored', async function (assert) {
        this.set('options', 'not an array');

        await render(TEMPLATE);

        assert.strictEqual(optionLabels().filter((label) => label === 'Active').length, 0, 'nothing bogus is rendered');
    });

    test('it defaults the label and value keys', async function (assert) {
        this.set('options', OPTIONS);

        await render(TEMPLATE);

        assert.true(optionLabels().includes('Active'), 'the default label key is used');
    });

    test('label and value keys can be overridden', async function (assert) {
        this.set('options', [{ name: 'Active', id: 'active' }]);
        this.set('optionLabel', 'name');
        this.set('optionValue', 'id');

        await render(TEMPLATE);

        assert.true(optionLabels().includes('Active'));
    });

    test('the filter-prefixed key arguments are honoured as a fallback', async function (assert) {
        this.set('options', [{ name: 'Active', id: 'active' }]);
        this.set('filterOptionLabel', 'name');
        this.set('filterOptionValue', 'id');

        await render(TEMPLATE);

        assert.true(optionLabels().includes('Active'));
    });

    test('a placeholder is offered as the empty option', async function (assert) {
        this.set('options', OPTIONS);
        this.set('placeholder', 'Any status');

        await render(TEMPLATE);

        assert.true(optionLabels().includes('Any status'));
    });

    test('the filter-prefixed placeholder is used when no plain placeholder is given', async function (assert) {
        this.set('options', OPTIONS);
        this.set('filterPlaceholder', 'Pick a status');

        await render(TEMPLATE);

        assert.true(optionLabels().includes('Pick a status'));
    });

    module('fetching options', function () {
        test('a fetch uri loads the options remotely', async function (assert) {
            this.set('fetchUri', 'statuses');

            await render(TEMPLATE);

            assert.strictEqual(requests.length, 1);
            assert.strictEqual(requests[0].uri, 'statuses');
            assert.true(optionLabels().includes('Active'));
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

            assert.ok(find('select'), 'the select still renders');
            assert.strictEqual(optionLabels().filter((label) => label === 'Active').length, 0, 'no options are listed');
        });

        test('no fetch uri means no request', async function (assert) {
            this.set('options', OPTIONS);

            await render(TEMPLATE);

            assert.deepEqual(requests, []);
        });
    });

    test('it renders without an onChange handler', async function (assert) {
        this.set('options', OPTIONS);

        await render(hbs`<Filter::Select @filter={{this.filter}} @options={{this.options}} />`);

        assert.ok(find('select'), 'no handler is required to render');
    });
});
