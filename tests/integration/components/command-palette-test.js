import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, focus, triggerEvent, triggerKeyEvent, findAll, find, settled, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupShellStubs, stubHeaderMenuItems, stubModulePages } from '../../helpers/shell-stubs';
import { navigationProvider } from '@fleetbase/ember-ui/components/command-palette';

const INPUT = '.fb-command-palette-input';

function optionTitles() {
    return findAll('[role="option"] .fb-command-palette-option-title').map((title) => title.textContent.trim());
}

function groupTitles() {
    return findAll('.fb-command-palette-group-title').map((title) => title.textContent.trim());
}

async function openPalette() {
    await triggerKeyEvent(document, 'keydown', 'K', { metaKey: true });
}

async function search(query) {
    await fillIn(INPUT, query);
    await waitUntil(() => !find('.fb-command-palette-empty') || find('.fb-command-palette-empty').textContent.includes('Nothing'), { timeout: 2000 });
    await settled();
}

module('Integration | Component | command-palette', function (hooks) {
    setupRenderingTest(hooks);
    setupShellStubs(hooks);

    hooks.beforeEach(function () {
        this.palette = this.owner.lookup('service:command-palette');
        this.palette.close();
        this.palette.scope = null;
        this.actions = [];

        this.drivers = {
            id: 'drivers',
            label: 'Drivers',
            icon: 'user',
            search: (query) =>
                Promise.resolve([
                    { id: 'kenji', title: `Kenji Tan (${query})`, subtitle: 'Driver · online', group: 'Top hit', route: 'console.fleet-ops.drivers.view', models: ['kenji'] },
                    { id: 'mira', title: 'Mira Rahman', subtitle: 'Driver', group: 'Top hit', route: 'console.fleet-ops.drivers.view', models: ['mira'] },
                ]),
        };
        this.actionsProvider = {
            id: 'actions',
            label: 'Actions',
            search: () => [{ id: 'assign', title: 'Assign an order…', action: (result) => this.actions.push(result.id) }],
        };
        this.broken = { id: 'broken', label: 'Broken', search: () => Promise.reject(new Error('offline')) };
        this.throws = {
            id: 'throws',
            label: 'Throws',
            search() {
                throw new Error('bad');
            },
        };
        this.notAList = { id: 'odd', label: 'Odd', search: () => Promise.resolve({ not: 'a list' }) };
        this.providers = [this.drivers, this.actionsProvider, this.broken, this.throws, this.notAList];
    });

    test('closed, it renders nothing and registers as the ⌘K host', async function (assert) {
        await render(hbs`<CommandPalette />`);

        assert.dom('[role="dialog"]').doesNotExist();
        assert.true(this.palette.hasHost);
    });

    test('⌘K and Ctrl+K open it focused on the search field; ⌘K again closes it and restores focus', async function (assert) {
        await render(hbs`<button type="button" class="before">before</button><CommandPalette @providers={{this.providers}} />`);
        await focus('.before');

        await openPalette();
        assert.dom('[role="dialog"]').hasAttribute('aria-modal', 'true').hasAttribute('aria-label', 'Search Fleetbase');
        assert.dom(INPUT).isFocused().hasAttribute('aria-expanded', 'false');

        await openPalette();
        assert.dom('[role="dialog"]').doesNotExist();
        assert.dom('.before').isFocused('focus goes back where it was');

        await triggerKeyEvent(document, 'keydown', 'K', { ctrlKey: true });
        assert.dom('[role="dialog"]').exists();

        await triggerKeyEvent(document, 'keydown', 'K');
        await triggerKeyEvent(document, 'keydown', 'J', { metaKey: true });
        assert.dom('[role="dialog"]').exists('other keys do not toggle it');
    });

    test('results from every provider, grouped, skipping providers that fail', async function (assert) {
        await render(hbs`<CommandPalette @providers={{this.providers}} @includeNavigation={{false}} />`);
        await openPalette();
        await search('kenji');

        assert.deepEqual(groupTitles(), ['Top hit', 'Actions'], 'results share a group; one without a group goes under its provider');
        assert.deepEqual(optionTitles(), ['Kenji Tan (kenji)', 'Mira Rahman', 'Assign an order…']);
        assert.dom(findAll('[role="option"]')[0].querySelector('.fb-command-palette-option-subtitle')).hasText('Driver · online');
        assert.dom('[role="listbox"]').hasAttribute('aria-label', 'Results');
        assert.dom(INPUT).hasAttribute('aria-expanded', 'true').hasAttribute('aria-activedescendant', find('[role="option"]').id);
        assert.dom('[role="option"][aria-selected="true"]').hasAttribute('aria-label', 'Kenji Tan (kenji), Driver · online');
        assert.dom('[role="option"][aria-label="Assign an order…"]').exists('a result without a subtitle is named by its title');
    });

    test('↑ and ↓ move through the results and wrap; Enter opens the highlighted one', async function (assert) {
        await render(hbs`<CommandPalette @providers={{this.providers}} @includeNavigation={{false}} />`);
        await openPalette();
        await search('k');

        await triggerKeyEvent(INPUT, 'keydown', 'ArrowDown');
        assert.dom('[role="option"].is-active').containsText('Mira Rahman');
        await triggerKeyEvent(INPUT, 'keydown', 'ArrowUp');
        await triggerKeyEvent(INPUT, 'keydown', 'ArrowUp');
        assert.dom('[role="option"].is-active').containsText('Assign an order…', 'wraps to the last');
        await triggerKeyEvent(INPUT, 'keydown', 'ArrowDown');
        await triggerKeyEvent(INPUT, 'keydown', 'ArrowDown');
        assert.dom('[role="option"].is-active').containsText('Mira Rahman');

        await triggerKeyEvent(INPUT, 'keydown', 'Enter');
        assert.deepEqual(this.router.transitions, [['console.fleet-ops.drivers.view', 'mira', { queryParams: {} }]]);
        assert.dom('[role="dialog"]').doesNotExist('opening a result closes the palette');
    });

    test('a result’s action runs instead of navigating; clicking and pointing work too', async function (assert) {
        await render(hbs`<CommandPalette @providers={{this.providers}} @includeNavigation={{false}} />`);
        await openPalette();
        await search('assign');

        const options = findAll('[role="option"]');
        await triggerEvent(options[2], 'mousemove');
        assert.dom(findAll('[role="option"]')[2]).hasClass('is-active');
        await click(findAll('[role="option"]')[2]);

        assert.deepEqual(this.actions, ['assign']);
        assert.deepEqual(this.router.transitions, []);
    });

    test('Tab and Shift+Tab move between scope chips; a scope searches only its provider', async function (assert) {
        await render(hbs`<CommandPalette @providers={{this.providers}} @includeNavigation={{false}} />`);
        await openPalette();

        assert.deepEqual(
            findAll('[role="radiogroup"][aria-label="Scope"] [role="radio"]').map((chip) => chip.textContent.trim()),
            ['All', 'Drivers', 'Actions', 'Broken', 'Throws', 'Odd']
        );
        assert.dom('[data-scope="all"]').hasAttribute('aria-checked', 'true');

        await search('k');
        await triggerKeyEvent(INPUT, 'keydown', 'Tab');
        await waitUntil(() => optionTitles().length === 2);
        assert.dom('[data-scope="drivers"]').hasAttribute('aria-checked', 'true');
        assert.deepEqual(optionTitles(), ['Kenji Tan (k)', 'Mira Rahman']);

        await triggerKeyEvent(INPUT, 'keydown', 'Tab', { shiftKey: true });
        await triggerKeyEvent(INPUT, 'keydown', 'Tab', { shiftKey: true });
        assert.dom('[data-scope="odd"]').hasAttribute('aria-checked', 'true', 'Shift+Tab wraps backwards');

        await click('[data-scope="actions"]');
        await waitUntil(() => optionTitles().length === 1);
        assert.deepEqual(optionTitles(), ['Assign an order…']);
    });

    test('open(scope) opens scoped to a provider', async function (assert) {
        await render(hbs`<CommandPalette @providers={{this.providers}} @includeNavigation={{false}} />`);
        this.palette.open('actions');
        await settled();

        assert.dom('[data-scope="actions"]').hasAttribute('aria-checked', 'true');
        assert.dom('[data-scope="all"]').hasAttribute('aria-checked', 'false');
    });

    test('an empty query clears the results, and a query with no match says so', async function (assert) {
        this.providers = [{ id: 'none', label: 'None', search: () => [] }];
        await render(hbs`<CommandPalette @providers={{this.providers}} @includeNavigation={{false}} />`);
        await openPalette();

        await search('zzz');
        assert.dom('.fb-command-palette-empty[role="status"]').hasText('Nothing matches “zzz”.');

        await fillIn(INPUT, '   ');
        assert.dom('.fb-command-palette-empty').doesNotExist();
        assert.dom('[role="option"]').doesNotExist();
        assert.dom(INPUT).doesNotHaveAttribute('aria-activedescendant');

        await triggerKeyEvent(INPUT, 'keydown', 'ArrowDown');
        await triggerKeyEvent(INPUT, 'keydown', 'Enter');
        assert.deepEqual(this.router.transitions, [], 'arrows and Enter with no results do nothing');
    });

    test('a slow, older search never replaces a newer one', async function (assert) {
        let releaseSlow;
        this.providers = [
            {
                id: 'slow',
                label: 'Slow',
                search: (query) =>
                    query === 'a'
                        ? new Promise((resolve) => {
                              releaseSlow = () => resolve([{ id: 'old', title: 'Old result' }]);
                          })
                        : [{ id: 'new', title: 'New result' }],
            },
        ];
        await render(hbs`<CommandPalette @providers={{this.providers}} @includeNavigation={{false}} />`);
        await openPalette();

        fillIn(INPUT, 'a');
        await waitUntil(() => find('.fb-command-palette-empty') && find('.fb-command-palette-empty').textContent.includes('Searching'));
        await fillIn(INPUT, 'ab');
        await waitUntil(() => optionTitles().length === 1);
        releaseSlow();
        await settled();
        await new Promise((resolve) => setTimeout(resolve, 10));

        assert.deepEqual(optionTitles(), ['New result']);
    });

    test('Escape and the backdrop close it; other keys are left alone', async function (assert) {
        await render(hbs`<CommandPalette @providers={{this.providers}} />`);
        await openPalette();
        await triggerKeyEvent(INPUT, 'keydown', 'A');
        assert.dom('[role="dialog"]').exists();

        await triggerKeyEvent(INPUT, 'keydown', 'Escape');
        assert.dom('[role="dialog"]').doesNotExist();

        this.palette.open();
        await settled();
        await click('.fb-command-palette-backdrop');
        assert.dom('[role="dialog"]').doesNotExist();
    });

    test('it opens empty each time', async function (assert) {
        await render(hbs`<CommandPalette @providers={{this.providers}} @includeNavigation={{false}} />`);
        await openPalette();
        await search('kenji');
        await triggerKeyEvent(INPUT, 'keydown', 'Escape');
        await openPalette();

        assert.dom(INPUT).hasValue('');
        assert.dom('[role="option"]').doesNotExist();
    });

    test('focus is not restored to an element that has gone', async function (assert) {
        this.set('showButton', true);
        await render(hbs`{{#if this.showButton}}<button type="button" class="before">before</button>{{/if}}<CommandPalette />`);
        await focus('.before');
        await openPalette();
        this.set('showButton', false);
        await triggerKeyEvent(INPUT, 'keydown', 'Escape');

        assert.dom('[role="dialog"]').doesNotExist();
    });

    module('providers', function () {
        test('the registered providers come from universe.getSearchProviders', async function (assert) {
            const universe = this.owner.lookup('service:universe');
            universe.getSearchProviders = () => [this.actionsProvider];
            try {
                await render(hbs`<CommandPalette @includeNavigation={{false}} />`);
                await openPalette();
                assert.dom('[data-scope="actions"]').exists();
            } finally {
                delete universe.getSearchProviders;
            }
        });

        test('a universe that returns nothing, or has no getSearchProviders, leaves the built-in provider', async function (assert) {
            const universe = this.owner.lookup('service:universe');
            universe.getSearchProviders = () => null;
            try {
                await render(hbs`<CommandPalette />`);
                await openPalette();
                assert.deepEqual(
                    findAll('[role="radio"]').map((chip) => chip.textContent.trim()),
                    ['All', 'Pages']
                );
            } finally {
                delete universe.getSearchProviders;
            }

            await render(hbs`<CommandPalette />`);
            assert.dom('[data-scope="navigation"]').exists();
        });

        test('the built-in provider finds modules and their pages', async function (assert) {
            stubHeaderMenuItems(this.owner, [
                { id: 'fleet-ops', title: 'Fleet-Ops', route: 'console.fleet-ops' },
                { id: 'fleet-ops-sc-orders', title: 'Fleet orders', _isShortcut: true },
                { id: 'ledger', title: 'Ledger', route: 'console.ledger' },
            ]);
            stubModulePages(this.owner, {
                panels: { 'fleet-ops': [{ title: 'Operations', items: [{ title: 'Fleets', route: 'console.fleet-ops.fleets' }, { title: 'Orders' }] }] },
            });
            await render(hbs`<CommandPalette />`);
            await openPalette();
            await search('flee');

            assert.deepEqual(groupTitles(), ['Modules', 'Pages']);
            assert.deepEqual(optionTitles(), ['Fleet-Ops', 'Fleets']);
            assert.dom(findAll('[role="option"]')[1].querySelector('.fb-command-palette-option-subtitle')).hasText('Fleet-Ops', 'a page is labelled with its module');

            await triggerKeyEvent(INPUT, 'keydown', 'ArrowDown');
            await triggerKeyEvent(INPUT, 'keydown', 'Enter');
            assert.deepEqual(this.router.transitions, [['console.fleet-ops.fleets', { queryParams: {} }]]);
        });

        test('navigationProvider on its own', function (assert) {
            const universe = { headerMenuItems: [{ id: 'iam', title: 'IAM', route: 'console.iam' }] };
            const provider = navigationProvider(universe);

            assert.deepEqual([provider.id, provider.label, provider.icon], ['navigation', 'Pages', 'compass']);
            assert.deepEqual(
                provider.search('ia').map((result) => [result.id, result.title, result.subtitle, result.group]),
                [['module:iam', 'IAM', 'Module', 'Modules']]
            );
            assert.deepEqual(provider.search('zzz'), []);
        });
    });

    test('it unregisters as the ⌘K host when destroyed', async function (assert) {
        this.set('show', true);
        await render(hbs`{{#if this.show}}<CommandPalette />{{/if}}`);
        this.set('show', false);
        await settled();

        assert.false(this.palette.hasHost);
        await openPalette();
        assert.false(this.palette.isOpen, 'its ⌘K listener is gone');
    });
});
