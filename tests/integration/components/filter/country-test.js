import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { selectChoose, getDropdownItems } from 'ember-power-select/test-support';

const COUNTRIES = [
    { name: 'Singapore', cca2: 'SG', emoji: '🇸🇬' },
    { name: 'Sweden', cca2: 'SE', emoji: '🇸🇪' },
];

const TRIGGER = '.ember-power-select-trigger';

module('Integration | Component | filter/country', function (hooks) {
    setupRenderingTest(hooks);

    let changes;

    hooks.beforeEach(function () {
        changes = [];
        this.set('filter', { key: 'country' });
        this.set('onChange', (filter, value) => changes.push([filter.key, value]));

        this.owner.unregister('service:fetch');
        this.owner.register(
            'service:fetch',
            class extends Service {
                get() {
                    return Promise.resolve(COUNTRIES.slice());
                }
            }
        );
    });

    const TEMPLATE = hbs`<Filter::Country @filter={{this.filter}} @value={{this.value}} @onChange={{this.onChange}} />`;

    test('it renders a country picker', async function (assert) {
        await render(TEMPLATE);

        assert.ok(find(TRIGGER), 'the picker renders');
        assert.dom('.fleetbase-power-select').exists('wrapped in the shared select styling');
    });

    test('it offers every country returned by the lookup', async function (assert) {
        await render(TEMPLATE);

        const options = await getDropdownItems(TRIGGER);
        assert.deepEqual(
            options.map((option) => String(option).replace(/\s+/g, ' ').trim()),
            ['🇸🇬 Singapore', '🇸🇪 Sweden'],
            'each country is shown with its flag'
        );
    });

    test('an incoming value preselects the matching country', async function (assert) {
        this.set('value', 'SE');

        await render(TEMPLATE);

        assert.dom(TRIGGER).containsText('Sweden');
    });

    test('choosing a country reports it', async function (assert) {
        await render(TEMPLATE);
        await selectChoose(TRIGGER, 'Singapore');

        assert.strictEqual(changes.length, 1, 'the choice is reported once');
        assert.strictEqual(changes[0][0], 'country');
        assert.strictEqual(changes[0][1], 'SG', 'the iso code is handed back, not the record');
        assert.dom(TRIGGER).containsText('Singapore');
    });

    test('clearing the choice is reported to the filter', async function (assert) {
        this.set('value', 'SE');

        await render(TEMPLATE);
        await click('.ember-power-select-clear-btn');

        assert.dom(TRIGGER).doesNotContainText('Sweden', 'the trigger is emptied');
        assert.strictEqual(changes.length, 1, 'the filter is told exactly once');
        assert.strictEqual(changes[0][0], 'country');
        assert.strictEqual(changes[0][1], null, 'and told that nothing is selected');
    });

    test('it reports nothing when there is no onChange handler', async function (assert) {
        await render(hbs`<Filter::Country @filter={{this.filter}} />`);
        await selectChoose(TRIGGER, 'Sweden');

        assert.dom(TRIGGER).containsText('Sweden', 'the selection is still shown');
    });
});
