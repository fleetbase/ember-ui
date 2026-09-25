import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | country-name', function (hooks) {
    setupRenderingTest(hooks);

    test('it looks up and renders the country name for a 2-letter code', async function (assert) {
        const fetch = this.owner.lookup('service:fetch');
        fetch.responses['lookup/country/US'] = { name: 'United States' };

        await render(hbs`<CountryName @country="US" />`);

        assert.dom(this.element).hasText('United States');

        const lookupCall = fetch.calls.find((call) => call.args[0] === 'lookup/country/US');
        assert.ok(lookupCall, 'country lookup was requested');
    });

    test('it renders the argument directly when it is not a 2-letter code', async function (assert) {
        await render(hbs`<CountryName @country="Singapore" />`);

        assert.dom(this.element).hasText('Singapore');

        const fetch = this.owner.lookup('service:fetch');
        assert.strictEqual(fetch.calls.length, 0, 'no lookup performed');
    });

    test('it falls back to the code when the lookup returns no name', async function (assert) {
        await render(hbs`<CountryName @country="XX" />`);

        assert.dom(this.element).hasText('XX');
    });

    test('it renders a dash when no country is provided', async function (assert) {
        await render(hbs`<CountryName />`);

        assert.dom(this.element).hasText('-');
    });
});
