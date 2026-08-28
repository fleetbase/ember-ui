import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled, triggerKeyEvent, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function tab(id, overrides = {}) {
    return { id, label: id.charAt(0).toUpperCase() + id.slice(1), ...overrides };
}

// The template also renders a hidden measurer copy of every tab for overflow
// calculation, so every query is scoped to the visible tab list.
const VISIBLE = '.tab-items';

function tabButtons() {
    return findAll(`${VISIBLE} [data-tab-id]`);
}

function tabById(id) {
    return find(`${VISIBLE} [data-tab-id="${id}"]`);
}

function labels() {
    return findAll(`${VISIBLE} .tab-label`).map((node) => node.textContent.trim());
}

module('Integration | Component | tab-navigation', function (hooks) {
    setupRenderingTest(hooks);

    let changes;
    let closes;

    hooks.beforeEach(function () {
        changes = [];
        closes = [];
        this.set('tabs', [tab('details'), tab('activity'), tab('files')]);
        this.set('onTabChange', (selected) => changes.push(selected));
        this.set('onClose', (selected) => closes.push(selected));
    });

    const TEMPLATE = hbs`
        <TabNavigation
            @tabs={{this.tabs}}
            @activeTabId={{this.activeTabId}}
            @style={{this.tabStyle}}
            @size={{this.size}}
            @onTabChange={{this.onTabChange}}
            @onClose={{this.onClose}}
        >
            <div class="tab-body">panel body</div>
        </TabNavigation>
    `;

    module('rendering', function () {
        test('it renders a tab per entry inside a tablist', async function (assert) {
            await render(TEMPLATE);

            assert.dom('[role="tablist"]').exists();
            assert.deepEqual(labels(), ['Details', 'Activity', 'Files']);
            assert.dom('.tab-body').hasText('panel body', 'the block is rendered as the panel');
        });

        test('with no tabs it renders an empty tablist', async function (assert) {
            this.set('tabs', []);

            await render(TEMPLATE);

            assert.strictEqual(tabButtons().length, 0);
            assert.dom('[role="tablist"]').exists();
        });

        test('with no tabs argument at all it still renders', async function (assert) {
            await render(hbs`<TabNavigation />`);

            assert.dom('[role="tablist"]').exists();
        });

        test('the first tab is active by default', async function (assert) {
            await render(TEMPLATE);

            assert.dom(tabById('details')).hasClass('tab-item--active');
            assert.dom(tabById('activity')).doesNotHaveClass('tab-item--active');
        });

        test('aria-selected carries the literal strings ARIA requires', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(tabById('details').getAttribute('aria-selected'), 'true', 'the active tab announces itself');
            assert.strictEqual(tabById('activity').getAttribute('aria-selected'), 'false', 'and an inactive tab says so explicitly');
        });

        test('an explicit active tab wins', async function (assert) {
            this.set('activeTabId', 'files');

            await render(TEMPLATE);

            assert.dom(tabById('files')).hasClass('tab-item--active');
        });

        test('an unknown active tab selects nothing', async function (assert) {
            this.set('activeTabId', 'nope');

            await render(TEMPLATE);

            assert.strictEqual(findAll(`${VISIBLE} .tab-item--active`).length, 0);
        });

        test('a disabled tab is marked as such', async function (assert) {
            this.set('tabs', [tab('details'), tab('activity', { disabled: true })]);

            await render(TEMPLATE);

            assert.dom(tabById('activity')).isDisabled();
        });

        test('an icon is rendered when a tab declares one', async function (assert) {
            this.set('tabs', [tab('details', { icon: 'circle-info' })]);

            await render(TEMPLATE);

            assert.dom(`${VISIBLE} [data-tab-id="details"] svg`).exists();
        });
    });

    module('badges', function () {
        test('a positive badge is rendered', async function (assert) {
            this.set('tabs', [tab('details', { badge: 3 })]);

            await render(TEMPLATE);

            assert.dom(`${VISIBLE} .tab-badge`).hasText('3');
        });

        test('a badge over ninety-nine is abbreviated', async function (assert) {
            this.set('tabs', [tab('details', { badge: 250 })]);

            await render(TEMPLATE);

            assert.dom(`${VISIBLE} .tab-badge`).hasText('99+');
        });

        test('a zero badge is not rendered', async function (assert) {
            this.set('tabs', [tab('details', { badge: 0 })]);

            await render(TEMPLATE);

            assert.dom(`${VISIBLE} .tab-badge`).doesNotExist();
        });

        test('no badge is rendered when none is declared', async function (assert) {
            await render(TEMPLATE);

            assert.dom(`${VISIBLE} .tab-badge`).doesNotExist();
        });
    });

    module('style and size', function () {
        test('the github style and medium size are the defaults', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.tab-navigation, [role="tablist"]').exists();
            assert.true(find('.tab-list').closest('[class]').className.length > 0, 'the container carries styling classes');
        });

        test('an explicit style and size are applied', async function (assert) {
            this.set('tabStyle', 'pills');
            this.set('size', 'lg');

            await render(TEMPLATE);

            assert.dom('[role="tablist"]').exists('the requested style renders a tablist');
            assert.dom('.tab-list').exists('alongside the tab list itself');
        });
    });

    module('selecting', function () {
        test('clicking a tab activates it and reports the change', async function (assert) {
            await render(TEMPLATE);

            await click(tabById('activity'));

            assert.dom(tabById('activity')).hasClass('tab-item--active');
            assert.dom(tabById('details')).doesNotHaveClass('tab-item--active');
            assert.strictEqual(changes.length, 1);
            assert.strictEqual(changes[0].id, 'activity');
        });

        test('a disabled tab cannot be selected', async function (assert) {
            this.set('tabs', [tab('details'), tab('activity', { disabled: true })]);

            await render(TEMPLATE);

            // The rendered button is disabled, so the browser refuses both pointer and
            // keyboard activation; arrowing onto it from a neighbour is also refused.
            assert.dom(tabById('activity')).isDisabled();

            await triggerKeyEvent(tabById('details'), 'keydown', 'ArrowRight');

            assert.notStrictEqual(document.activeElement, tabById('activity'), 'focus never lands on it');
            assert.deepEqual(changes, []);
            assert.dom(tabById('details')).hasClass('tab-item--active');
        });

        test('it selects without an onTabChange handler', async function (assert) {
            await render(hbs`<TabNavigation @tabs={{this.tabs}} />`);

            await click(tabById('activity'));

            assert.dom(tabById('activity')).hasClass('tab-item--active');
        });

        test('changing the active tab from outside is honoured', async function (assert) {
            this.set('activeTabId', 'details');
            await render(TEMPLATE);

            this.set('activeTabId', 'files');
            await settled();

            assert.dom(tabById('files')).hasClass('tab-item--active');
        });
    });

    module('closing', function () {
        test('a closable tab offers a close control that reports the tab', async function (assert) {
            this.set('tabs', [tab('details', { closable: true }), tab('activity')]);

            await render(TEMPLATE);
            assert.strictEqual(findAll(`${VISIBLE} .tab-close`).length, 1, 'only the closable tab has a control');

            await click(`${VISIBLE} .tab-close`);

            assert.strictEqual(closes.length, 1);
            assert.strictEqual(closes[0].id, 'details');
        });

        test('a tab is only closable when a close handler is supplied', async function (assert) {
            this.set('tabs', [tab('details', { closable: true })]);

            await render(hbs`<TabNavigation @tabs={{this.tabs}} />`);

            assert.dom(`${VISIBLE} .tab-close`).doesNotExist();
        });

        test('closing a tab does not also select it', async function (assert) {
            this.set('tabs', [tab('details'), tab('activity', { closable: true })]);

            await render(TEMPLATE);
            await click(`${VISIBLE} .tab-close`);

            assert.strictEqual(closes.length, 1, 'the tab is closed');
            assert.strictEqual(closes[0].id, 'activity', 'and it is the tab whose close button was pressed');
            assert.strictEqual(changes.length, 0, 'the click never reaches the tab button');
        });

        test('clicking the tab body itself still selects it', async function (assert) {
            this.set('tabs', [tab('details'), tab('activity', { closable: true })]);

            await render(TEMPLATE);
            await click(tabById('activity'));

            assert.strictEqual(changes.length, 1, 'selection still works');
            assert.strictEqual(changes[0].id, 'activity');
            assert.strictEqual(closes.length, 0, 'and nothing is closed');
        });
    });

    module('keyboard navigation', function () {
        test('arrow keys move focus along the tabs and wrap around', async function (assert) {
            await render(TEMPLATE);

            await triggerKeyEvent(tabById('details'), 'keydown', 'ArrowRight');
            assert.strictEqual(document.activeElement, tabById('activity'), 'right moves to the next tab');

            await triggerKeyEvent(tabById('activity'), 'keydown', 'ArrowLeft');
            assert.strictEqual(document.activeElement, tabById('details'), 'left moves back');

            await triggerKeyEvent(tabById('details'), 'keydown', 'ArrowLeft');
            assert.strictEqual(document.activeElement, tabById('files'), 'left from the first wraps to the last');

            await triggerKeyEvent(tabById('files'), 'keydown', 'ArrowRight');
            assert.strictEqual(document.activeElement, tabById('details'), 'right from the last wraps to the first');
        });

        // Arrow keys walk @tabs, not the visible row, so they can land on a tab that the overflow
        // pass has pushed behind the "more" menu and that is not in the document at all.
        test('arrowing onto an overflowed tab has nothing to focus', async function (assert) {
            this.set(
                'tabs',
                Array.from({ length: 12 }, (_, index) => tab(`tab-${index}`, { label: `A fairly long tab label ${index}` }))
            );

            await render(TEMPLATE);
            assert.dom('[data-tab-navigation-more]').exists('the row overflows');

            const lastTab = this.tabs.at(-1);
            assert.strictEqual(tabById(lastTab.id), null, 'the last tab is behind the menu');

            const firstVisible = tabButtons()[0];
            firstVisible.focus();
            await triggerKeyEvent(firstVisible, 'keydown', 'ArrowLeft');

            assert.strictEqual(document.activeElement, firstVisible, 'focus stays put rather than moving nowhere');
        });

        test('home and end jump to the ends', async function (assert) {
            await render(TEMPLATE);

            await triggerKeyEvent(tabById('activity'), 'keydown', 'End');
            assert.strictEqual(document.activeElement, tabById('files'));

            await triggerKeyEvent(tabById('files'), 'keydown', 'Home');
            assert.strictEqual(document.activeElement, tabById('details'));
        });

        test('enter and space select the focused tab', async function (assert) {
            await render(TEMPLATE);

            await triggerKeyEvent(tabById('activity'), 'keydown', 'Enter');
            assert.strictEqual(changes[0].id, 'activity');

            await triggerKeyEvent(tabById('files'), 'keydown', ' ');
            assert.strictEqual(changes[1].id, 'files');
        });

        test('an unhandled key does nothing', async function (assert) {
            await render(TEMPLATE);

            await triggerKeyEvent(tabById('details'), 'keydown', 'KeyQ');

            assert.deepEqual(changes, []);
            assert.strictEqual(document.activeElement, document.body, 'focus is left alone');
        });

        test('navigation skips onto a disabled tab without focusing it', async function (assert) {
            this.set('tabs', [tab('details'), tab('activity', { disabled: true }), tab('files')]);

            await render(TEMPLATE);
            await triggerKeyEvent(tabById('details'), 'keydown', 'ArrowRight');

            assert.notStrictEqual(document.activeElement, tabById('activity'), 'a disabled tab never takes focus');
        });
    });

    module('overflow', function () {
        test('every tab is visible when they all fit', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(tabButtons().length, 3, 'nothing is pushed into an overflow menu');
        });

        test('an empty tab list renders no tabs and no overflow menu', async function (assert) {
            this.set('tabs', []);

            await render(TEMPLATE);

            assert.strictEqual(tabButtons().length, 0, 'there is nothing to show');
            assert.dom('[data-tab-navigation-more]').doesNotExist('and nothing to hide behind a menu');
        });

        test('an actions block is rendered beside the tabs and measured with them', async function (assert) {
            await render(hbs`
                <TabNavigation @tabs={{this.tabs}} @onTabChange={{this.onTabChange}}>
                    <:actions><button type="button" class="tab-extra-action">New</button></:actions>
                    <:default><div class="tab-body">panel body</div></:default>
                </TabNavigation>
            `);

            assert.dom('#tab-navigation-actions .tab-extra-action').exists('the actions block renders');
            assert.strictEqual(tabButtons().length, 3, 'and the tabs are still laid out alongside it');
        });

        test('a controlled active tab is honoured when it changes', async function (assert) {
            this.set('activeTabId', 'details');

            await render(TEMPLATE);
            assert.dom(tabById('details')).hasClass('tab-item--active');

            this.set('activeTabId', 'files');
            await settled();

            assert.dom(tabById('files')).hasClass('tab-item--active', 'the controlled id wins');
            assert.dom(tabById('details')).doesNotHaveClass('tab-item--active');
            assert.deepEqual(changes, [], 'and a controlled change is not reported back as a selection');
        });

        test('replacing the tab list with an equivalent one leaves the selection alone', async function (assert) {
            await render(TEMPLATE);
            assert.dom(tabById('details')).hasClass('tab-item--active', 'the first tab is active by default');

            this.set('tabs', [tab('details'), tab('activity'), tab('files')]);
            await settled();

            assert.dom(tabById('details')).hasClass('tab-item--active', 'a new array of the same tabs changes nothing');
        });

        // A tab hidden by its own class still takes part in the measuring pass, at zero width.
        test('a tab hidden by class measures as nothing and does not consume a slot', async function (assert) {
            const tabs = Array.from({ length: 12 }, (_, index) => tab(`tab-${index}`, { label: `A fairly long tab label ${index}` }));
            tabs.splice(1, 0, tab('ghost', { label: 'Ghost', class: 'hidden' }));
            this.set('tabs', tabs);

            await render(TEMPLATE);

            assert.dom('[data-tab-navigation-more]').exists('the row still overflows');
            assert.true(tabButtons().length > 0, 'and some tabs are still visible');
        });

        // {{#if @tabs}} treats an empty array as falsy, so the measurer is torn out of the DOM —
        // but the component's reference to it is not cleared, and the overflow pass runs again
        // with a live element reference and nothing left to measure.
        test('emptying a tab list that had tabs clears the overflow state', async function (assert) {
            await render(TEMPLATE);
            assert.strictEqual(tabButtons().length, 3, 'three to begin with');

            this.set('tabs', []);
            await settled();

            assert.strictEqual(tabButtons().length, 0, 'and none afterwards');
            assert.dom('[data-tab-navigation-more]').doesNotExist();
        });

        test('taking the tab list away entirely leaves no active tab behind', async function (assert) {
            this.set('activeTabId', undefined);

            await render(TEMPLATE);
            assert.strictEqual(tabButtons().length, 3, 'three to begin with');

            this.set('tabs', undefined);
            await settled();

            assert.strictEqual(tabButtons().length, 0, 'nothing is rendered');
            assert.deepEqual(changes, [], 'and removing them is not reported as a selection');
        });

        // The overflow pass deliberately swaps the active tab into the visible row so that the
        // tab you are looking at is never the one hidden behind the "more" menu.
        test('an active tab that would overflow is swapped into the visible row', async function (assert) {
            this.set(
                'tabs',
                Array.from({ length: 12 }, (_, index) => tab(`tab-${index}`, { label: `A fairly long tab label ${index}` }))
            );
            this.set('activeTabId', 'tab-11');

            await render(TEMPLATE);

            assert.dom('[data-tab-navigation-more]').exists('the row overflows');
            assert.ok(tabById('tab-11'), 'the last tab is pulled forward because it is active');
            assert.dom(tabById('tab-11')).hasClass('tab-item--active');
        });

        // A single tab wider than the whole row still has to get the one guaranteed slot,
        // rather than leaving the row empty.
        test('a tab wider than the row still keeps the first slot', async function (assert) {
            this.set('tabs', [tab('enormous', { label: 'Enormous '.repeat(60) }), tab('activity'), tab('files')]);

            await render(TEMPLATE);

            assert.strictEqual(tabButtons().length, 1, 'exactly one tab is kept in the row');
            assert.dom('[data-tab-navigation-more]').exists('the rest move into the overflow menu');
        });

        // With the row hidden there is nothing to measure against, so the component gives up on
        // overflow rather than guessing — every tab stays in the row.
        test('a row with no measurable width keeps every tab', async function (assert) {
            const style = document.createElement('style');
            style.textContent = '.tab-navigation-test-hidden { display: none; }';
            document.head.appendChild(style);

            this.set(
                'tabs',
                Array.from({ length: 12 }, (_, index) => tab(`tab-${index}`, { label: `A fairly long tab label ${index}` }))
            );

            try {
                await render(hbs`
                    <TabNavigation @tabs={{this.tabs}} @tablistClass="tab-navigation-test-hidden" @onTabChange={{this.onTabChange}} />
                `);

                assert.strictEqual(tabButtons().length, 12, 'no tab is pushed out');
                assert.dom('[data-tab-navigation-more]').doesNotExist('and no overflow menu is offered');
            } finally {
                style.remove();
            }
        });

        test('a long list still renders every tab somewhere', async function (assert) {
            this.set(
                'tabs',
                Array.from({ length: 12 }, (_, index) => tab(`tab-${index}`, { label: `A fairly long tab label ${index}` }))
            );

            await render(TEMPLATE);

            assert.true(tabButtons().length > 0, 'the visible set is non-empty');
            assert.true(tabButtons().length <= 12, 'and never exceeds the full set');
        });
    });

    // -------------------------------------------------------------------------
    // Appended coverage: the yielded context api and the style/size defaults.
    // -------------------------------------------------------------------------

    module('the context api', function () {
        const CONTEXT_TEMPLATE = hbs`
            <TabNavigation
                @tabs={{this.tabs}}
                @activeTabId={{this.activeTabId}}
                @contextApi={{this.contextApi}}
                @onTabChange={{this.onTabChange}}
            >
                <div class="tab-body">panel body</div>
            </TabNavigation>
        `;

        function withContext(context) {
            let api;
            context.set('contextApi', (received) => {
                api = received;
            });

            return () => api;
        }

        test('the api is handed to the parent on insert', async function (assert) {
            const api = withContext(this);

            await render(CONTEXT_TEMPLATE);

            assert.ok(api(), 'the parent receives a context');
            assert.strictEqual(typeof api().selectTabById, 'function');
        });

        test('a tab can be selected by id through the api', async function (assert) {
            const api = withContext(this);

            await render(CONTEXT_TEMPLATE);
            assert.dom(tabById('details')).hasClass('tab-item--active');

            api().selectTabById('files');
            await settled();

            assert.dom(tabById('files')).hasClass('tab-item--active', 'the named tab becomes active');
            assert.dom(tabById('details')).doesNotHaveClass('tab-item--active');
            assert.deepEqual(
                changes.map((changed) => changed.id),
                ['files'],
                'and the change is reported'
            );
        });

        test('selecting an unknown id does nothing', async function (assert) {
            const api = withContext(this);

            await render(CONTEXT_TEMPLATE);

            api().selectTabById('does-not-exist');
            await settled();

            assert.dom(tabById('details')).hasClass('tab-item--active', 'the active tab is unchanged');
            assert.deepEqual(changes, [], 'and nothing is reported');
        });

        // The rendered button carries `disabled`, so the browser already refuses a click; the
        // api reaches `selectTab` directly and has to enforce the same rule itself.
        test('selecting a disabled tab through the api is refused', async function (assert) {
            const api = withContext(this);
            this.set('tabs', [tab('details'), tab('activity', { disabled: true })]);

            await render(CONTEXT_TEMPLATE);

            api().selectTabById('activity');
            await settled();

            assert.dom(tabById('details')).hasClass('tab-item--active', 'the active tab is unchanged');
            assert.deepEqual(changes, [], 'and nothing is reported');
        });

        test('selecting by id on a tab-less navigation does nothing', async function (assert) {
            const api = withContext(this);
            this.set('tabs', undefined);

            await render(CONTEXT_TEMPLATE);

            api().selectTabById('details');
            await settled();

            assert.strictEqual(tabButtons().length, 0, 'there are no tabs to select');
            assert.deepEqual(changes, [], 'and nothing is reported');
        });

        test('it renders without a context api handler', async function (assert) {
            await render(hbs`<TabNavigation @tabs={{this.tabs}}><div class="tab-body">body</div></TabNavigation>`);

            assert.strictEqual(tabButtons().length, 3);
        });
    });

    // The style and size land on data-attributes, resolved by the component's own getters.
    module('style and size arguments', function () {
        test('it defaults to the github style at medium size', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.tab-navigation').hasAttribute('data-style', 'github');
            assert.dom('.tab-navigation').hasAttribute('data-size', 'md');
        });

        test('the style can be changed', async function (assert) {
            this.set('tabStyle', 'pills');

            await render(TEMPLATE);

            assert.dom('.tab-navigation').hasAttribute('data-style', 'pills');
        });

        test('the size can be changed', async function (assert) {
            this.set('size', 'sm');

            await render(TEMPLATE);

            assert.dom('.tab-navigation').hasAttribute('data-size', 'sm');
        });
    });

    module('menu-item tabs', function () {
        test('a menu-item tab links to its slug and carries its view as a query param', async function (assert) {
            this.set('tabs', [
                tab('orders', {
                    route: 'console.menu-item',
                    _isMenuItem: true,
                    slug: 'orders',
                    view: 'grid',
                }),
            ]);

            await render(TEMPLATE);

            const link = find(`${VISIBLE} a[data-tab-id="console.menu-item"]`);
            assert.ok(link, 'the tab renders as a link');
            assert.true(link.getAttribute('href').includes('/menu-item/orders'), 'the slug becomes the model');
            assert.true(link.getAttribute('href').includes('view=grid'), 'and the view becomes a query param');
        });

        test('a menu-item tab with no view links without a query param', async function (assert) {
            this.set('tabs', [
                tab('orders', {
                    route: 'console.menu-item',
                    _isMenuItem: true,
                    slug: 'orders',
                }),
            ]);

            await render(TEMPLATE);

            const link = find(`${VISIBLE} a[data-tab-id="console.menu-item"]`);
            assert.true(link.getAttribute('href').includes('/menu-item/orders'));
            assert.false(link.getAttribute('href').includes('view='), 'no view means no query param');
        });

        test('a plain route tab links without a model', async function (assert) {
            this.set('tabs', [tab('notifications', { route: 'console.notifications' })]);

            await render(TEMPLATE);

            const link = find(`${VISIBLE} a[data-tab-id="console.notifications"]`);
            assert.ok(link, 'the tab renders as a link');
            assert.true(link.getAttribute('href').includes('/console/notifications'));
        });
    });
    // The overflow calculation has an empty-list path, and argsDidChange defaults a missing
    // @tabs to an empty list. Neither is reached while a populated array is always supplied.
    test('an empty tab list renders and recalculates without error', async function (assert) {
        this.set('tabs', []);

        await render(TEMPLATE);

        assert.dom('[role="tablist"]').exists('the tab strip still renders');
        assert.strictEqual(findAll('[role="tab"]').length, 0, 'with no tabs in it');
    });

    test('tabs appearing after an empty start select the first one', async function (assert) {
        this.set('tabs', []);

        await render(TEMPLATE);

        this.set('tabs', [
            { id: 'details', label: 'Details' },
            { id: 'files', label: 'Files' },
        ]);
        await settled();

        assert.strictEqual(findAll('[role="tab"]').length, 2, 'the new tabs render');
        assert.dom('[role="tab"][aria-selected="true"]').hasText('Details', 'and the first becomes active');
    });
    // recalculateOverflow() short-circuits when there are no tabs to lay out. Every other test
    // supplies at least one, so that arm had never run.
    test('an empty tab list lays out nothing', async function (assert) {
        this.set('tabs', []);

        await render(TEMPLATE);

        assert.strictEqual(findAll(`${VISIBLE} [role="tab"]`).length, 0, 'no tabs are rendered');
        assert.dom('.tab-body').exists('but the panel body still renders');
    });
});
