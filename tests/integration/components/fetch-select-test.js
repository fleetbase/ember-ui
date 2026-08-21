import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled, findAll, setupOnerror, resetOnerror } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { selectChoose, selectSearch, getDropdownItems } from 'ember-power-select/test-support';

const DRIVERS = [
    { id: 'drv_1', name: 'Alex Driver' },
    { id: 'drv_2', name: 'Blair Hauler' },
];

function trigger() {
    return '.ember-power-select-trigger';
}

module('Integration | Component | fetch-select', function (hooks) {
    setupRenderingTest(hooks);

    let requests;
    let respondWith;

    hooks.beforeEach(function () {
        requests = [];
        respondWith = () => DRIVERS;

        const owner = this.owner;
        owner.unregister('service:fetch');
        owner.register(
            'service:fetch',
            class extends Service {
                get(endpoint, query, options) {
                    requests.push({ endpoint, query, options });
                    return Promise.resolve(respondWith(endpoint, query, options));
                }
            }
        );

        this.set('endpoint', 'drivers');
        this.set('optionLabel', 'name');
    });

    const TEMPLATE = hbs`
        <FetchSelect
            @endpoint={{this.endpoint}}
            @query={{this.query}}
            @optionLabel={{this.optionLabel}}
            @optionValue={{this.optionValue}}
            @selected={{this.selected}}
            @loadDefaultOptions={{this.loadDefaultOptions}}
            @onChange={{this.onChange}}
            @onOpen={{this.onOpen}}
            @onInput={{this.onInput}}
            @onClose={{this.onClose}}
            @registerAPI={{this.registerAPI}}
            @placeholder="Pick a driver"
        />
    `;

    module('construction', function () {
        test('it renders a power select', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.fleetbase-power-select').exists();
            assert.dom(trigger()).containsText('Pick a driver');
        });

        test('it refuses to render without an endpoint', async function (assert) {
            // The assertion is thrown from the constructor during render, which Ember
            // routes through onerror rather than the render promise.
            let thrown;
            setupOnerror((error) => (thrown = error));
            this.set('endpoint', null);

            try {
                await render(TEMPLATE);
            } finally {
                resetOnerror();
            }

            assert.ok(thrown, 'the misconfiguration is reported loudly');
            assert.true(/requires a valid `endpoint`/.test(thrown.message));
        });

        test('it does not fetch anything until the select is used', async function (assert) {
            await render(TEMPLATE);

            assert.deepEqual(requests, [], 'no request is made just to render');
        });

        test('a wrapper class is applied', async function (assert) {
            await render(hbs`<FetchSelect @endpoint="drivers" @wrapperClass="my-wrapper" />`);

            assert.dom('.fleetbase-model-select').hasClass('my-wrapper');
        });
    });

    module('loading options', function () {
        test('opening the select loads the default options', async function (assert) {
            await render(TEMPLATE);
            await click(trigger());

            assert.strictEqual(requests.length, 1);
            assert.strictEqual(requests[0].endpoint, 'drivers');
            assert.deepEqual(requests[0].query, {}, 'no search term on the initial load');

            const options = await getDropdownItems('.fleetbase-power-select');
            assert.deepEqual(options, ['Alex Driver', 'Blair Hauler'], 'each option is labelled by @optionLabel');
        });

        test('the query argument is forwarded on every request', async function (assert) {
            this.set('query', { status: 'active' });

            await render(TEMPLATE);
            await click(trigger());

            assert.deepEqual(requests[0].query, { status: 'active' });
        });

        test('the forwarded query is a copy, so the caller-supplied object is never mutated', async function (assert) {
            const query = { status: 'active' };
            this.set('query', query);

            await render(TEMPLATE);
            await selectSearch('.fleetbase-power-select', 'alex');

            assert.deepEqual(query, { status: 'active' }, 'the original object is untouched');
            assert.strictEqual(requests[requests.length - 1].query.query, 'alex', 'the term rides on the copy');
        });

        test('loadDefaultOptions=false suppresses the initial load', async function (assert) {
            this.set('loadDefaultOptions', false);

            await render(TEMPLATE);
            await click(trigger());

            assert.deepEqual(requests, [], 'opening does not fetch');
        });

        test('an object response is converted into key/value options', async function (assert) {
            respondWith = () => ({ pending: 'Pending', complete: 'Complete' });
            this.set('optionLabel', 'value');

            await render(TEMPLATE);
            await click(trigger());

            const options = await getDropdownItems('.fleetbase-power-select');
            assert.deepEqual(options, ['Pending', 'Complete']);
        });

        test('an empty object response is left alone rather than converted', async function (assert) {
            respondWith = () => ({});

            await render(TEMPLATE);
            await click(trigger());

            // An empty object is not worth converting, so options stays a non-array
            // and the select simply offers nothing to choose.
            assert.strictEqual(findAll('.ember-power-select-option[aria-selected]').length, 0, 'no options are offered');
        });

        test('searching debounces and then fetches with the term', async function (assert) {
            await render(TEMPLATE);
            await selectSearch('.fleetbase-power-select', 'blair');

            const lastRequest = requests[requests.length - 1];
            assert.strictEqual(lastRequest.query.query, 'blair');

            const options = await getDropdownItems('.fleetbase-power-select');
            assert.true(options.includes('Blair Hauler'));
        });

        test('clearing the search term reloads the default options', async function (assert) {
            await render(TEMPLATE);
            await click(trigger());
            const afterOpen = requests.length;

            await selectSearch('.fleetbase-power-select', '');

            assert.true(requests.length > afterOpen, 'an empty term reloads the defaults');
            assert.strictEqual(requests[requests.length - 1].query.query, undefined, 'no term is sent');
        });

        test('a spinner is shown while a request is in flight', async function (assert) {
            let release;
            respondWith = () => new Promise((resolve) => (release = () => resolve(DRIVERS)));

            await render(TEMPLATE);
            const opening = click(trigger());
            await settled();

            assert.dom('.ember-model-select__loading').exists('the pending request is visible');

            release();
            await opening;
            await settled();

            assert.dom('.ember-model-select__loading').doesNotExist();
        });
    });

    module('selection', function () {
        test('choosing an option reports the whole option', async function (assert) {
            const chosen = [];
            this.set('onChange', (option) => chosen.push(option));

            await render(TEMPLATE);
            await click(trigger());
            await selectChoose('.fleetbase-power-select', 'Alex Driver');

            assert.deepEqual(chosen, [DRIVERS[0]]);
            assert.dom(trigger()).containsText('Alex Driver');
        });

        test('with an optionValue the reported value is that field', async function (assert) {
            const chosen = [];
            this.set('optionValue', 'id');
            this.set('onChange', (option) => chosen.push(option));

            await render(TEMPLATE);
            await click(trigger());
            await selectChoose('.fleetbase-power-select', 'Blair Hauler');

            assert.deepEqual(chosen, ['drv_2'], 'only the identifier is handed back');
            assert.dom(trigger()).containsText('Blair Hauler', 'the full option is still displayed');
        });

        test('a preselected value is resolved to a full option through optionValue', async function (assert) {
            this.set('optionValue', 'id');
            this.set('selected', 'drv_2');

            await render(TEMPLATE);

            assert.strictEqual(requests.length, 1, 'resolving the selection fetches once');
            assert.dom(trigger()).containsText('Blair Hauler');
        });

        test('a preselected value with no match is kept as given', async function (assert) {
            this.set('optionValue', 'id');
            this.set('selected', 'drv_missing');

            await render(TEMPLATE);

            assert.dom(trigger()).doesNotContainText('Alex Driver');
            assert.dom(trigger()).doesNotContainText('Blair Hauler');
        });

        test('a preselected object is used directly when there is no optionValue', async function (assert) {
            this.set('selected', DRIVERS[0]);

            await render(TEMPLATE);

            assert.deepEqual(requests, [], 'no lookup is needed');
            assert.dom(trigger()).containsText('Alex Driver');
        });

        test('it works without an onChange handler', async function (assert) {
            await render(hbs`<FetchSelect @endpoint="drivers" @optionLabel="name" />`);
            await click(trigger());
            await selectChoose('.fleetbase-power-select', 'Alex Driver');

            assert.dom(trigger()).containsText('Alex Driver');
        });
    });

    module('pass-through hooks', function () {
        test('onOpen, onInput and onClose are all forwarded', async function (assert) {
            const called = [];
            this.set('onOpen', () => called.push('open'));
            this.set('onInput', (term) => called.push(`input:${term}`));
            this.set('onClose', () => called.push('close'));

            await render(TEMPLATE);
            await click(trigger());
            assert.deepEqual(called, ['open']);

            await selectSearch('.fleetbase-power-select', 'al');
            assert.true(called.includes('input:al'));

            await selectChoose('.fleetbase-power-select', 'Alex Driver');
            assert.true(called.includes('close'), 'selecting closes the dropdown');
        });

        test('the power select api is registered and forwarded', async function (assert) {
            let api;
            this.set('registerAPI', (registered) => (api = registered));

            await render(TEMPLATE);

            assert.ok(api, 'the parent receives the api');
            assert.strictEqual(typeof api.actions.select, 'function');
        });

        test('it renders without any of the optional hooks', async function (assert) {
            await render(hbs`<FetchSelect @endpoint="drivers" @optionLabel="name" />`);
            await click(trigger());
            await click(trigger());

            assert.dom('.fleetbase-power-select').exists('opening and closing needs no handlers');
        });
    });

    test('a block is yielded each option instead of the default label', async function (assert) {
        await render(hbs`
            <FetchSelect @endpoint="drivers" @optionLabel="name" as |driver|>
                <span class="custom-option">{{driver.id}}</span>
            </FetchSelect>
        `);
        await click(trigger());

        const rendered = findAll('.custom-option').map((node) => node.textContent.trim());
        assert.deepEqual(rendered, ['drv_1', 'drv_2']);
    });
});
