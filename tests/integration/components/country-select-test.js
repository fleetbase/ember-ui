import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { clickTrigger } from 'ember-power-select/test-support/helpers';
import { selectChoose } from 'ember-power-select/test-support';

const COUNTRIES = [
    { name: 'Singapore', cca2: 'SG', flag: '', emoji: '🇸🇬' },
    { name: 'United States', cca2: 'US', flag: '', emoji: '🇺🇸' },
];

module('Integration | Component | country-select', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.fetch = this.owner.lookup('service:fetch');
        this.fetch.responses['lookup/countries'] = COUNTRIES;
    });

    test('it fetches countries and renders a placeholder when nothing is selected', async function (assert) {
        await render(hbs`<CountrySelect />`);

        const lookupCall = this.fetch.calls.find((call) => call.args[0] === 'lookup/countries');
        assert.ok(lookupCall, 'countries were fetched');
        assert.dom('.fleetbase-power-select .ember-power-select-trigger').exists();
        assert.dom('.ember-power-select-placeholder').containsText('common.select-field');
    });

    test('it preselects the country matching @value regardless of case', async function (assert) {
        await render(hbs`<CountrySelect @value="sg" />`);

        assert.dom('.ember-power-select-trigger').containsText('Singapore');
    });

    test('it lists the fetched countries when opened', async function (assert) {
        await render(hbs`<CountrySelect />`);
        await clickTrigger('.fleetbase-power-select');

        assert.dom('.ember-power-select-option').exists({ count: 2 });
        assert.dom('.ember-power-select-options').containsText('Singapore');
        assert.dom('.ember-power-select-options').containsText('United States');
    });

    test('selecting a country fires @onChange with the iso2 code and country', async function (assert) {
        const changes = [];
        this.set('onChange', (cca2, country) => changes.push({ cca2, country }));

        await render(hbs`<CountrySelect @onChange={{this.onChange}} />`);
        await selectChoose('.fleetbase-power-select', 'United States');

        assert.strictEqual(changes.length, 1, 'onChange fired once');
        assert.strictEqual(changes[0].cca2, 'US');
        assert.strictEqual(changes[0].country.name, 'United States');
        assert.dom('.ember-power-select-trigger').containsText('United States');
    });

    test('it updates the selection when @value changes', async function (assert) {
        this.set('value', 'SG');

        await render(hbs`<CountrySelect @value={{this.value}} />`);
        assert.dom('.ember-power-select-trigger').containsText('Singapore');

        this.set('value', 'US');
        await settled();
        assert.dom('.ember-power-select-trigger').containsText('United States');
    });

    test('@disabled disables the select', async function (assert) {
        await render(hbs`<CountrySelect @disabled={{true}} />`);

        assert.dom('.ember-power-select-trigger[aria-disabled="true"]').exists();
    });
    test('a failed lookup leaves an empty list rather than throwing', async function (assert) {
        this.fetch.get = () => Promise.reject(new Error('lookup unavailable'));

        await render(hbs`<CountrySelect />`);
        await clickTrigger();

        // power-select renders its empty message AS an option, so assert on the message.
        assert.dom('.ember-power-select-option').hasText('No results found', 'no countries are offered');
        assert.dom('.ember-power-select-trigger').exists('and the select still renders');
    });

    test('selecting a country with no @onChange handler still updates the selection', async function (assert) {
        // Every other case supplies the handler, so its guard had never been skipped.
        await render(hbs`<CountrySelect />`);
        await selectChoose('.fleetbase-power-select', 'Singapore');

        assert.dom('.ember-power-select-trigger').includesText('Singapore', 'the selection is applied without a listener');
    });
});
