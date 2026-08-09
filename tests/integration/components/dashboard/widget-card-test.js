import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, triggerEvent, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const CARD = '.dashboard-widget-card';

function widget(overrides = {}) {
    return { id: 'orders-kpi', name: 'Orders', description: 'Orders placed today', category: 'KPI Tiles', ...overrides };
}

function accentChip() {
    return find(`${CARD} .w-7`);
}

function badges() {
    return find(`${CARD} .flex-1 .items-center`);
}

module('Integration | Component | dashboard/widget-card', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('widget', widget());
    });

    const TEMPLATE = hbs`
        <Dashboard::WidgetCard
            @widget={{this.widget}}
            @addedCount={{this.addedCount}}
            @isAdding={{this.isAdding}}
            @onAdd={{this.onAdd}}
            @onHover={{this.onHover}}
            @onUnhover={{this.onUnhover}}
        />
    `;

    module('rendering', function () {
        test('it renders the widget name, description and key', async function (assert) {
            await render(TEMPLATE);

            assert.dom(CARD).exists();
            assert.dom(CARD).hasAttribute('data-widget-key', 'orders-kpi');
            assert.dom(CARD).includesText('Orders');
            assert.dom(CARD).includesText('Orders placed today');
        });

        test('a widget with no icon falls back to a puzzle piece', async function (assert) {
            await render(TEMPLATE);

            assert.dom(`${CARD} .fa-puzzle-piece`).exists('the neutral icon stands in');
        });

        test('a widget that declares an icon gets that one instead', async function (assert) {
            this.set('widget', widget({ icon: 'chart-line' }));

            await render(TEMPLATE);

            assert.dom(`${CARD} .fa-chart-line`).exists();
            assert.dom(`${CARD} .fa-puzzle-piece`).doesNotExist();
        });

        test('the plus affordance becomes a spinner while the widget is being added', async function (assert) {
            await render(TEMPLATE);
            assert.dom(`${CARD} .fa-plus`).exists('idle cards offer a plus');

            this.set('isAdding', true);
            await render(TEMPLATE);

            assert.dom(`${CARD} .fa-plus`).doesNotExist('which gives way to the spinner');
        });
    });

    // The chip colour is driven by the registry `category`, matched case-insensitively.
    module('the category accent', function () {
        const ACCENTS = [
            ['KPI Tiles', 'bg-emerald-100'],
            ['kpi', 'bg-emerald-100'],
            ['Analytics', 'bg-sky-100'],
            ['Maps', 'bg-purple-100'],
            ['Legacy', 'bg-amber-100'],
        ];

        ACCENTS.forEach(([category, chipClass]) => {
            test(`the ${category} category is accented ${chipClass}`, async function (assert) {
                this.set('widget', widget({ category }));

                await render(TEMPLATE);

                assert.dom(accentChip()).hasClass(chipClass);
            });
        });

        test('an unrecognised category is accented neutrally', async function (assert) {
            this.set('widget', widget({ category: 'something-else' }));

            await render(TEMPLATE);

            assert.dom(accentChip()).hasClass('bg-gray-100');
        });

        test('a widget with no category at all is accented neutrally', async function (assert) {
            this.set('widget', widget({ category: undefined }));

            await render(TEMPLATE);

            assert.dom(accentChip()).hasClass('bg-gray-100');
        });
    });

    module('the badge row', function () {
        test('a plain widget shows no badges at all', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(badges(), null, 'the row is not rendered when there is nothing to put in it');
        });

        test('a default widget is badged as such', async function (assert) {
            this.set('widget', widget({ default: true }));

            await render(TEMPLATE);

            assert.ok(badges(), 'the badge row appears');
            assert.dom(CARD).includesText('dashboard-widget-panel.badge-default', 'the default badge is shown');
        });

        test('a widget already on the dashboard once is badged "Added"', async function (assert) {
            this.set('addedCount', 1);

            await render(TEMPLATE);

            assert.dom(CARD).includesText('Added');
            assert.dom(CARD).doesNotIncludeText('×', 'a single copy needs no count');
            assert.dom(CARD).hasClass('border-sky-300/70', 'and the card border marks it');
        });

        test('a widget on the dashboard more than once carries the count', async function (assert) {
            this.set('addedCount', 3);

            await render(TEMPLATE);

            assert.dom(CARD).includesText('Added ×3');
        });

        test('an added count of zero is treated as not added', async function (assert) {
            this.set('addedCount', 0);

            await render(TEMPLATE);

            assert.strictEqual(badges(), null, 'no badge row');
            assert.dom(CARD).hasClass('border-gray-200', 'and the resting border');
        });
    });

    module('interaction', function () {
        test('the card reports clicks and hovers', async function (assert) {
            const events = [];
            this.set('onAdd', () => events.push('add'));
            this.set('onHover', () => events.push('hover'));
            this.set('onUnhover', () => events.push('unhover'));

            await render(TEMPLATE);

            await triggerEvent(CARD, 'mouseenter');
            await triggerEvent(CARD, 'mouseleave');
            await click(CARD);

            assert.deepEqual(events, ['hover', 'unhover', 'add']);
        });

        // DEFECT (see DEFECTS.md #132): all three handlers were bound straight into `{{on}}`, which
        // throws on an undefined handler, so the card could not render without every one of them.
        test('it renders and stays inert with no handlers at all', async function (assert) {
            await render(hbs`<Dashboard::WidgetCard @widget={{this.widget}} />`);

            assert.dom(CARD).exists('the card renders');

            await triggerEvent(CARD, 'mouseenter');
            await click(CARD);

            assert.dom(CARD).exists('and every interaction is a harmless no-op');
        });
    });
});
