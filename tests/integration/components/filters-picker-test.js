import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, find, findAll, render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';

const COLUMNS = [
    { label: 'Status', valuePath: 'status', filterable: true, filterComponent: 'test-filter' },
    { label: 'Total', valuePath: 'total', filterable: false, filterComponent: 'test-filter' },
    { label: 'Driver', valuePath: 'driver_uuid', filterParam: 'driver', filterable: true, filterComponent: 'test-filter', filterLabel: 'Assigned driver' },
];

// Scoped to the footer: the stubbed filter controls also render "change"/"clear" buttons.
function footerButton(text) {
    return findAll('.filters-dropdown-footer button').find((button) => button.textContent.trim().toLowerCase().includes(text.toLowerCase()));
}

function filterLabels() {
    return findAll('.filter-component-label').map((node) => node.textContent.trim());
}

module('Integration | Component | filters-picker', function (hooks) {
    setupRenderingTest(hooks);

    let router;
    let originalSearch;

    // The component reads filter state straight off the URL, so tests drive it by
    // rewriting the query string and restoring it afterwards.
    function setQueryString(search) {
        window.history.replaceState(null, '', `${window.location.pathname}${search}${window.location.hash}`);
    }

    hooks.beforeEach(function () {
        originalSearch = window.location.search;

        const state = {
            currentRouteName: 'console.orders.index',
            currentRoute: { queryParams: { status: 'active', 'driver[]': 'drv_1', unrelated: 'keep' } },
            listeners: [],
            transitions: [],
            transitionResult: () => Promise.resolve(),
        };
        router = state;

        // activeRouter prefers hostRouter over router, so the stand-in must be registered
        // under both names to be the one the component actually uses.
        const RouterStub = class extends Service {
            get currentRouteName() {
                return state.currentRouteName;
            }
            get currentRoute() {
                return state.currentRoute;
            }
            on(name, handler) {
                state.listeners.push({ name, handler });
            }
            off(name, handler) {
                state.listeners = state.listeners.filter((entry) => !(entry.name === name && entry.handler === handler));
            }
            transitionTo(...args) {
                state.transitions.push(args);
                return state.transitionResult();
            }
        };

        this.owner.unregister('service:router');
        this.owner.register('service:router', RouterStub);
        this.owner.unregister('service:hostRouter');
        this.owner.register('service:hostRouter', RouterStub);

        // A stand-in filter control that exposes the arguments the picker hands down.
        this.owner.register(
            'component:test-filter',
            setComponentTemplate(
                hbs`
                    <div class="test-filter" data-param={{@param}} data-value={{@value}} data-placeholder={{@placeholder}}>
                        <button type="button" class="do-change" {{on "click" (fn @onChange @filter "chosen")}}>change</button>
                        <button type="button" class="do-clear" {{on "click" (fn @onClear @filter)}}>clear</button>
                    </div>
                `,
                templateOnly()
            )
        );

        this.set('columns', COLUMNS);
    });

    hooks.afterEach(function () {
        setQueryString(originalSearch);
    });

    const TEMPLATE = hbs`
        <FiltersPicker
            @columns={{this.columns}}
            @onApply={{this.onApply}}
            @onClear={{this.onClear}}
            @onChange={{this.onChange}}
            @onFilterClear={{this.onFilterClear}}
            @dropdownHeaderText={{this.dropdownHeaderText}}
        />
    `;

    async function openPicker() {
        await click('.ember-basic-dropdown-trigger');
    }

    module('rendering', function () {
        test('it renders a trigger and, once opened, one control per filterable column', async function (assert) {
            await render(TEMPLATE);
            assert.dom('.ember-basic-dropdown-trigger').exists();

            await openPicker();

            assert.strictEqual(findAll('.filter-component').length, 2, 'the non-filterable column is skipped');
            assert.deepEqual(filterLabels(), ['Status', 'Assigned driver'], 'a filterLabel wins over the plain label');
        });

        test('the filter param defaults to the value path but can be overridden', async function (assert) {
            await render(TEMPLATE);
            await openPicker();

            const params = findAll('.test-filter').map((node) => node.getAttribute('data-param'));
            assert.deepEqual(params, ['status', 'driver']);
        });

        test('a label can be suppressed per column', async function (assert) {
            this.set('columns', [{ label: 'Status', valuePath: 'status', filterable: true, filterComponent: 'test-filter', noFilterLabel: true }]);

            await render(TEMPLATE);
            await openPicker();

            assert.deepEqual(filterLabels(), [], 'no label is rendered');
            assert.strictEqual(findAll('.filter-component').length, 1, 'but the control still is');
        });

        test('the dropdown header can be overridden', async function (assert) {
            this.set('dropdownHeaderText', 'Narrow it down');

            await render(TEMPLATE);
            await openPicker();

            assert.dom('.filters-dropdown-header').hasText('Narrow it down');
        });

        test('with no columns it renders an empty body', async function (assert) {
            this.set('columns', undefined);

            await render(TEMPLATE);
            await openPicker();

            assert.strictEqual(findAll('.filter-component').length, 0);
            assert.dom('.filters-dropdown-footer').exists('the actions are still offered');
        });
    });

    module('reading the current filter state from the url', function () {
        test('a filter with no url value is inactive', async function (assert) {
            setQueryString('');

            await render(TEMPLATE);
            await openPicker();

            const values = findAll('.test-filter').map((node) => node.getAttribute('data-value'));
            assert.deepEqual(values, [null, null], 'no values are seeded');
        });

        test('a filter present in the url is seeded with its value', async function (assert) {
            setQueryString('?status=active');

            await render(TEMPLATE);
            await openPicker();

            assert.strictEqual(find('.test-filter').getAttribute('data-value'), 'active');
        });

        test('an empty url value is treated as no value at all', async function (assert) {
            setQueryString('?status=');

            await render(TEMPLATE);
            await openPicker();

            assert.strictEqual(find('.test-filter').getAttribute('data-value'), null);
        });

        test('a repeated url param is read as a list', async function (assert) {
            setQueryString('?status=active&status=pending');

            await render(TEMPLATE);
            await openPicker();

            assert.strictEqual(find('.test-filter').getAttribute('data-value'), 'active,pending');
        });

        test('bracketed array params are supported', async function (assert) {
            setQueryString('?driver[]=drv_1&driver[]=drv_2');

            await render(TEMPLATE);
            await openPicker();

            const values = findAll('.test-filter').map((node) => node.getAttribute('data-value'));
            assert.strictEqual(values[1], 'drv_1,drv_2');
        });

        test('it re-reads the url when the route changes', async function (assert) {
            setQueryString('');

            await render(TEMPLATE);
            await openPicker();
            assert.strictEqual(find('.test-filter').getAttribute('data-value'), null);

            setQueryString('?status=active');
            router.listeners.filter((entry) => entry.name === 'routeDidChange').forEach((entry) => entry.handler());
            await settled();

            assert.strictEqual(find('.test-filter').getAttribute('data-value'), 'active', 'the open dropdown updates in place');
        });
    });

    module('the trigger badge', function () {
        test('active filters are counted on the trigger', async function (assert) {
            setQueryString('?status=active');

            await render(TEMPLATE);

            assert.dom('.ember-basic-dropdown-trigger').containsText('1', 'one active filter is advertised');
        });

        test('no badge is shown when nothing is filtered', async function (assert) {
            setQueryString('');

            await render(TEMPLATE);

            assert.dom('.ember-basic-dropdown-trigger').doesNotContainText('1');
        });
    });

    module('interacting with a filter control', function () {
        test('a control change is reported with its param', async function (assert) {
            const changes = [];
            this.set('onChange', (param, value) => changes.push([param, value]));

            await render(TEMPLATE);
            await openPicker();
            await click(findAll('.do-change')[1]);

            assert.deepEqual(changes, [['driver', 'chosen']]);
        });

        test('a control clear is reported with its param', async function (assert) {
            const cleared = [];
            this.set('onFilterClear', (param) => cleared.push(param));

            await render(TEMPLATE);
            await openPicker();
            await click(find('.do-clear'));

            assert.deepEqual(cleared, ['status']);
        });

        test('controls are inert without handlers', async function (assert) {
            await render(hbs`<FiltersPicker @columns={{this.columns}} />`);
            await openPicker();

            await click(find('.do-change'));
            await click(find('.do-clear'));

            assert.dom('.filters-dropdown-container').exists('no handler is required');
        });
    });

    module('applying and clearing', function () {
        test('apply invokes the handler', async function (assert) {
            let applied = 0;
            this.set('onApply', () => applied++);

            await render(TEMPLATE);
            await openPicker();
            await click(footerButton('apply'));

            assert.strictEqual(applied, 1);
        });

        test('clear nulls every filterable param and keeps the rest', async function (assert) {
            let cleared = 0;
            this.set('onClear', () => cleared++);

            await render(TEMPLATE);
            await openPicker();
            await click(footerButton('clear'));

            assert.strictEqual(cleared, 1, 'the handler runs');
            assert.strictEqual(router.transitions.length, 1);

            const [routeName, options] = router.transitions[0];
            assert.strictEqual(routeName, 'console.orders.index');
            assert.strictEqual(options.queryParams.status, null, 'a plain param is nulled');
            assert.strictEqual(options.queryParams['driver[]'], null, 'a bracketed param is nulled too');
            assert.strictEqual(options.queryParams.unrelated, 'keep', 'unrelated params are left alone');
        });

        test('an aborted transition is swallowed', async function (assert) {
            const aborted = new Error('aborted');
            aborted.name = 'TransitionAborted';
            router.transitionResult = () => Promise.reject(aborted);

            await render(TEMPLATE);
            await openPicker();
            await click(footerButton('clear'));

            assert.strictEqual(router.transitions.length, 1, 'the abort is not treated as a failure');
        });

        test('apply and clear work without handlers', async function (assert) {
            await render(hbs`<FiltersPicker @columns={{this.columns}} />`);
            await openPicker();
            await click(footerButton('apply'));

            await openPicker();
            await click(footerButton('clear'));

            assert.strictEqual(router.transitions.length, 1, 'clearing still transitions');
        });
    });

    test('it unsubscribes from route changes on teardown', async function (assert) {
        this.set('show', true);

        await render(hbs`{{#if this.show}}<FiltersPicker @columns={{this.columns}} />{{/if}}`);
        assert.strictEqual(router.listeners.length, 1);

        this.set('show', false);

        assert.strictEqual(router.listeners.length, 0);
    });
});
