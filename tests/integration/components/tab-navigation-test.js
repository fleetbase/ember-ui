import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | tab-navigation', function (hooks) {
    setupRenderingTest(hooks);

    let availableWidth;
    let originalOffsetWidth;
    let originalClientWidth;
    let OriginalResizeObserver;

    hooks.beforeEach(function () {
        availableWidth = 260;
        originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth');
        originalClientWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth');
        OriginalResizeObserver = window.ResizeObserver;

        Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
            configurable: true,
            get() {
                if (this.classList?.contains('tab-list')) {
                    return availableWidth;
                }
                return originalClientWidth?.get?.call(this) ?? 0;
            },
        });

        Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
            configurable: true,
            get() {
                if (this.hasAttribute?.('data-tab-navigation-measure-item')) {
                    return 50;
                }
                if (this.hasAttribute?.('data-tab-navigation-measure-more')) {
                    return 42;
                }
                if (this.hasAttribute?.('data-tab-navigation-title') || this.hasAttribute?.('data-tab-navigation-add')) {
                    return 0;
                }
                if (this.id === 'tab-navigation-actions') {
                    return 0;
                }
                return originalOffsetWidth?.get?.call(this) ?? 0;
            },
        });

        window.ResizeObserver = class ResizeObserver {
            constructor(callback) {
                this.callback = callback;
            }

            observe() {
                this.callback();
            }

            disconnect() {}
        };
    });

    hooks.afterEach(function () {
        if (originalClientWidth) {
            Object.defineProperty(HTMLElement.prototype, 'clientWidth', originalClientWidth);
        } else {
            delete HTMLElement.prototype.clientWidth;
        }
        if (originalOffsetWidth) {
            Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);
        } else {
            delete HTMLElement.prototype.offsetWidth;
        }
        window.ResizeObserver = OriginalResizeObserver;
    });

    test('it renders block content', async function (assert) {
        await render(hbs`
            <TabNavigation>
                template block text
            </TabNavigation>
        `);

        assert.dom('.tab-content').hasText('template block text');
    });

    test('it renders all array tabs inline when they fit', async function (assert) {
        this.set('tabs', [
            { id: 'overview', label: 'Overview' },
            { id: 'positions', label: 'Positions' },
            { id: 'devices', label: 'Devices' },
        ]);

        await render(hbs`<TabNavigation @tabs={{this.tabs}} />`);

        assert.dom('[role="tab"][data-tab-id="overview"]').exists();
        assert.dom('[role="tab"][data-tab-id="positions"]').exists();
        assert.dom('[role="tab"][data-tab-id="devices"]').exists();
        assert.dom('[data-tab-navigation-more]').doesNotExist();
    });

    test('it moves overflowing array tabs into a More menu', async function (assert) {
        availableWidth = 142;
        this.set('tabs', [
            { id: 'overview', label: 'Overview' },
            { id: 'positions', label: 'Positions' },
            { id: 'devices', label: 'Devices' },
            { id: 'schedules', label: 'Schedules' },
        ]);

        await render(hbs`<TabNavigation @tabs={{this.tabs}} />`);

        assert.dom('[role="tab"][data-tab-id="overview"]').exists();
        assert.dom('[role="tab"][data-tab-id="positions"]').exists();
        assert.dom('[role="tab"][data-tab-id="devices"]').doesNotExist();
        assert.dom('[data-tab-navigation-more]').exists();

        await click('[data-tab-navigation-more]');

        assert.dom('[role="menuitem"][data-tab-id="devices"]').exists();
        assert.dom('[role="menuitem"][data-tab-id="schedules"]').exists();
    });

    test('selecting an overflow button tab activates it and promotes it inline', async function (assert) {
        assert.expect(5);
        availableWidth = 142;
        this.set('selectedTab', null);
        this.set('tabs', [
            { id: 'overview', label: 'Overview' },
            { id: 'positions', label: 'Positions' },
            { id: 'devices', label: 'Devices' },
            { id: 'maintenance', label: 'Maintenance' },
        ]);
        this.set('onTabChange', (tab) => {
            this.set('selectedTab', tab.id);
        });

        await render(hbs`
            <TabNavigation @tabs={{this.tabs}} @onTabChange={{this.onTabChange}} as |activeTab|>
                {{activeTab.label}}
            </TabNavigation>
        `);

        await click('[data-tab-navigation-more]');
        await click('[role="menuitem"][data-tab-id="maintenance"]');

        assert.strictEqual(this.selectedTab, 'maintenance');
        assert.dom('.tab-content').hasText('Maintenance');
        assert.dom('[role="tab"][data-tab-id="maintenance"]').exists();
        assert.dom('[role="tab"][data-tab-id="positions"]').doesNotExist();

        await click('[data-tab-navigation-more]');
        assert.dom('[role="menuitem"][data-tab-id="positions"]').exists();
    });

    test('it renders route-backed overflow tabs as LinkTo items with query params', async function (assert) {
        availableWidth = 92;
        this.set('tabs', [
            { id: 'overview', label: 'Overview' },
            { id: 'route-details', label: 'Details', route: 'index', query: { view: 'details' } },
        ]);

        await render(hbs`<TabNavigation @tabs={{this.tabs}} />`);

        await click('[data-tab-navigation-more]');

        assert.dom('a[role="menuitem"][data-tab-id="index"]').exists();
        assert.dom('a[role="menuitem"][data-tab-id="index"]').hasAttribute('href', /view=details/);
    });

    test('yielded custom tab blocks are not overflow-managed', async function (assert) {
        availableWidth = 40;

        await render(hbs`
            <TabNavigation>
                <:tabs>
                    <button type="button" class="custom-tab">Custom Tab</button>
                </:tabs>
            </TabNavigation>
        `);

        assert.dom('.custom-tab').exists();
        assert.dom('[data-tab-navigation-more]').doesNotExist();
        assert.dom('.tab-overflow-measurer').doesNotExist();
    });
});
