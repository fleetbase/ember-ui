import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, fillIn, render, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

class StoreStub {
    reports = [];
    queries = [];

    async query(modelName, params = {}) {
        this.queries.push({ modelName, params });
        return this.reports;
    }
}

module('Integration | Component | report/find-select', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.store = new StoreStub();
        this.store.reports = [
            { id: 'report-1', title: 'Revenue', createdAt: 'Today' },
            { id: 'report-2', title: 'Utilization', createdAt: 'Yesterday' },
        ];
        this.owner.register('service:store', this.store, { instantiate: false });
    });

    test('it queries and renders reports on render', async function (assert) {
        await render(hbs`<Report::FindSelect />`);
        await waitUntil(() => this.store.queries.length === 1);

        assert.deepEqual(this.store.queries[0], { modelName: 'report', params: {} });
        assert.dom('[data-test-report-option]').exists({ count: 2 });
        assert.dom().includesText('Revenue');
        assert.dom().includesText('Utilization');
    });

    test('it searches reports with a debounced query param', async function (assert) {
        await render(hbs`<Report::FindSelect />`);
        await waitUntil(() => this.store.queries.length === 1);

        await fillIn('input', 'revenue');
        await waitUntil(() => this.store.queries.length === 2, { timeout: 1000 });

        assert.deepEqual(this.store.queries[1], { modelName: 'report', params: { query: 'revenue' } });
    });

    test('it calls onChange with selected reports and respects limit', async function (assert) {
        assert.expect(6);

        const changes = [];
        this.set('onChange', (reports) => changes.push(reports));

        await render(hbs`<Report::FindSelect @limit={{1}} @onChange={{this.onChange}} />`);
        await waitUntil(() => this.store.queries.length === 1);

        await click('[data-report-id="report-1"] [data-test-report-select]');
        assert.strictEqual(changes.length, 1, 'first selection emits');
        assert.strictEqual(changes[0][0].id, 'report-1');
        assert.dom('[data-report-id="report-1"] [data-test-report-select]').isDisabled();

        await click('[data-report-id="report-2"] [data-test-report-select]');
        assert.strictEqual(changes.length, 1, 'second selection is ignored because limit is reached');

        await click('[data-report-id="report-1"] [data-test-report-remove]');
        assert.strictEqual(changes.length, 2, 'removal emits');
        assert.deepEqual(changes[1], []);
    });
    test('a single selected report is accepted without wrapping it in an array', async function (assert) {
        this.set('selected', { id: 'report-2', title: 'Utilization' });

        await render(hbs`<Report::FindSelect @selected={{this.selected}} />`);
        await waitUntil(() => this.store.queries.length === 1);

        assert.dom('[data-report-id="report-2"] [data-test-report-select]').isDisabled('it counts as already selected');
        assert.dom('[data-report-id="report-2"] [data-test-report-remove]').isNotDisabled('and can be removed');
        assert.dom('[data-report-id="report-1"] [data-test-report-select]').isNotDisabled('the other report is untouched');
    });

    test('clearing the search queries for everything again', async function (assert) {
        await render(hbs`<Report::FindSelect />`);
        await waitUntil(() => this.store.queries.length === 1);

        await fillIn('input', 'revenue');
        await waitUntil(() => this.store.queries.length === 2, { timeout: 1000 });

        await fillIn('input', '');
        await waitUntil(() => this.store.queries.length === 3, { timeout: 1000 });

        assert.deepEqual(this.store.queries[2].params, {}, 'an empty term drops the query param rather than searching for ""');
    });

    test('a report can be selected without an onChange handler', async function (assert) {
        await render(hbs`<Report::FindSelect />`);
        await waitUntil(() => this.store.queries.length === 1);

        await click('[data-report-id="report-1"] [data-test-report-select]');

        assert.dom('[data-report-id="report-1"] [data-test-report-select]').isDisabled('the selection is still recorded');
        assert.dom('[data-report-id="report-1"] [data-test-report-remove]').isNotDisabled();
    });

    module('a store that cannot answer', function (hooks) {
        hooks.beforeEach(function () {
            this.store.query = (modelName, params = {}) => {
                this.store.queries.push({ modelName, params });

                return Promise.reject(new Error('reports are unavailable'));
            };
        });

        test('the failure is reported and the list is emptied', async function (assert) {
            const errors = [];
            this.set('onError', (error) => errors.push(error));

            await render(hbs`<Report::FindSelect @onError={{this.onError}} />`);
            await waitUntil(() => this.store.queries.length === 1);

            assert.strictEqual(errors.length, 1, 'the error is handed to the caller');
            assert.strictEqual(errors[0].message, 'reports are unavailable');
            assert.dom('[data-test-report-option]').doesNotExist();
            assert.dom().includesText('No reports available', 'and the empty state is shown');
        });

        test('with no onError handler the component still renders its empty state', async function (assert) {
            await render(hbs`<Report::FindSelect />`);
            await waitUntil(() => this.store.queries.length === 1);

            assert.dom().includesText('No reports available');
        });
    });
});
