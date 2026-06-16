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
        assert.expect(5);

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
});
