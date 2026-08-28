import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, waitUntil, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

// CountryName resolves 2-letter codes through the fetch service, so it is
// stubbed here — no test may depend on a real network round trip.
module('Integration | Component | table/cell/country', function (hooks) {
    setupRenderingTest(hooks);

    let requested;

    hooks.beforeEach(function () {
        requested = [];
        this.owner.unregister('service:fetch');
        this.owner.register(
            'service:fetch',
            class extends Service {
                get(path) {
                    requested.push(path);

                    const code = path.split('/').pop();
                    const names = { US: 'United States', NL: 'Netherlands' };

                    return Promise.resolve(names[code] ? { name: names[code] } : {});
                }
            }
        );
    });

    async function renderedText(context) {
        await waitUntil(() => context.element.textContent.trim() !== '');

        return context.element.textContent.trim();
    }

    test('it looks up the country named at the column value path', async function (assert) {
        this.set('row', { country: 'US' });
        this.set('column', { valuePath: 'country' });

        await render(hbs`<Table::Cell::Country @row={{this.row}} @column={{this.column}} />`);

        assert.strictEqual(await renderedText(this), 'United States', 'the ISO code is expanded to the country name');
        assert.deepEqual(requested, ['lookup/country/US'], 'exactly one lookup is issued');
    });

    test('it resolves a nested value path', async function (assert) {
        this.set('row', { address: { country: 'NL' } });
        this.set('column', { valuePath: 'address.country' });

        await render(hbs`<Table::Cell::Country @row={{this.row}} @column={{this.column}} />`);

        assert.strictEqual(await renderedText(this), 'Netherlands');
    });

    test('an unrecognised code falls back to the raw value', async function (assert) {
        this.set('row', { country: 'ZZ' });
        this.set('column', { valuePath: 'country' });

        await render(hbs`<Table::Cell::Country @row={{this.row}} @column={{this.column}} />`);

        assert.strictEqual(await renderedText(this), 'ZZ', 'the code is shown when the lookup returns no name');
    });

    test('a full country name is used as-is without a lookup', async function (assert) {
        this.set('row', { country: 'Netherlands' });
        this.set('column', { valuePath: 'country' });

        await render(hbs`<Table::Cell::Country @row={{this.row}} @column={{this.column}} />`);

        assert.strictEqual(await renderedText(this), 'Netherlands');
        assert.deepEqual(requested, [], 'only 2-letter codes trigger a lookup');
    });

    test('it renders a dash when the value path resolves to nothing', async function (assert) {
        this.set('row', {});
        this.set('column', { valuePath: 'country' });

        await render(hbs`<Table::Cell::Country @row={{this.row}} @column={{this.column}} />`);

        assert.dom(this.element).hasText('-', 'a missing country renders the placeholder');
        assert.deepEqual(requested, [], 'no lookup is attempted for a missing value');
    });

    test('it renders a dash with no arguments at all', async function (assert) {
        await render(hbs`<Table::Cell::Country />`);

        assert.dom(this.element).hasText('-');
    });

    test('it does not re-resolve when the country argument changes', async function (assert) {
        // KNOWN LIMITATION: CountryName resolves the name once, from its
        // constructor, and never observes later changes to @country. In a table
        // this is masked because rows are re-created rather than mutated. Pinned
        // so the behaviour cannot change unnoticed.
        this.set('column', { valuePath: 'country' });
        this.set('row', { country: 'US' });

        await render(hbs`<Table::Cell::Country @row={{this.row}} @column={{this.column}} />`);
        assert.strictEqual(await renderedText(this), 'United States');

        this.set('row', { country: 'NL' });
        await settled();

        assert.strictEqual(this.element.textContent.trim(), 'United States', 'the originally resolved name is retained');
        assert.deepEqual(requested, ['lookup/country/US'], 'no second lookup is issued');
    });
});
