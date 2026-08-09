import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | autocomplete-input', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.fetch = this.owner.lookup('service:fetch');
    });

    test('it searches the default geocoder endpoint and lists results', async function (assert) {
        this.fetch.responses['geocoder/query'] = [{ address: '123 Main St' }, { address: '456 Elm Ave' }];

        await render(hbs`
            <AutocompleteInput as |result|>
                <span data-test-result>{{result.address}}</span>
            </AutocompleteInput>
        `);

        assert.dom('.fleetbase-autocomplete-input--results').hasClass('hidden', 'results are hidden before searching');

        await fillIn('input[name="geocoder-autocomplete-search"]', '123');

        assert.dom('.fleetbase-autocomplete-input--results').doesNotHaveClass('hidden');
        assert.dom('[data-test-result]').exists({ count: 2 });
        assert.dom('.fleetbase-autocomplete-input--results').includesText('123 Main St');
        assert.dom('.fleetbase-autocomplete-input--results').includesText('456 Elm Ave');

        const getCall = this.fetch.calls.find((call) => call.method === 'get');
        assert.ok(getCall, 'a fetch request was made');
        assert.strictEqual(getCall.args[0], 'geocoder/query');
        assert.strictEqual(getCall.args[1].query, '123');
    });

    test('it selects a result, hides the list, and calls @onSelect', async function (assert) {
        const selections = [];
        this.fetch.responses['geocoder/query'] = [{ address: '123 Main St' }];
        this.set('onSelect', (result) => selections.push(result));

        await render(hbs`
            <AutocompleteInput @onSelect={{this.onSelect}} as |result|>
                <span data-test-result>{{result.address}}</span>
            </AutocompleteInput>
        `);

        await fillIn('input[name="geocoder-autocomplete-search"]', 'main');
        await click('.fleetbase-autocomplete-input--results a');

        assert.strictEqual(selections.length, 1, 'the selected result was passed to @onSelect');
        assert.strictEqual(selections[0].address, '123 Main St');
        assert.dom('.fleetbase-autocomplete-input--results').hasClass('hidden', 'results are hidden after selecting');
    });

    test('it keeps results hidden when the search returns nothing', async function (assert) {
        await render(hbs`<AutocompleteInput />`);
        await fillIn('input[name="geocoder-autocomplete-search"]', 'nowhere');

        assert.dom('.fleetbase-autocomplete-input--results').hasClass('hidden');
        assert.strictEqual(this.fetch.calls.filter((call) => call.method === 'get').length, 1, 'a fetch request was still made');
    });

    test('it supports a custom fetch url, search param and extra query params', async function (assert) {
        this.fetch.responses['places/search'] = [{ address: 'Custom Place' }];
        this.set('queryParams', { limit: 5 });

        await render(hbs`
            <AutocompleteInput @fetchUrl="places/search" @searchParam="term" @queryParams={{this.queryParams}} as |result|>
                <span data-test-result>{{result.address}}</span>
            </AutocompleteInput>
        `);

        await fillIn('input[name="geocoder-autocomplete-search"]', 'custom');

        const getCall = this.fetch.calls.find((call) => call.method === 'get');
        assert.strictEqual(getCall.args[0], 'places/search');
        assert.strictEqual(getCall.args[1].term, 'custom');
        assert.strictEqual(getCall.args[1].limit, 5);
        assert.dom('.fleetbase-autocomplete-input--results').includesText('Custom Place');
    });

    test('it notifies text changes through @onTextChange', async function (assert) {
        const typed = [];
        this.set('onTextChange', (value) => typed.push(value));

        await render(hbs`<AutocompleteInput @onTextChange={{this.onTextChange}} />`);
        await fillIn('input[name="geocoder-autocomplete-search"]', 'hello');

        assert.deepEqual(typed, ['hello']);
    });
});
