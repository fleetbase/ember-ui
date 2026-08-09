import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const ITEMS = [
    { id: 'fleet-ops', title: 'Fleet Ops', icon: 'truck' },
    { id: 'storefront', title: 'Storefront', icon: 'store' },
    { id: 'iam', title: 'IAM', icon: 'users', _parentTitle: 'Console' },
    { id: 'dev', title: 'Developers', icon: 'code' },
];

function pinnedTitles() {
    return findAll('.snm-customizer-pinned-item .snm-customizer-item-title').map((node) => node.textContent.trim());
}

function allItems() {
    return findAll('.snm-customizer-all-item');
}

function allItem(title) {
    return allItems().find((button) => button.textContent.includes(title));
}

function badge() {
    return find('.snm-customizer-col-badge');
}

module('Integration | Component | layout/header/smart-nav-menu/customizer', function (hooks) {
    setupRenderingTest(hooks);

    let applied;
    let closed;

    hooks.beforeEach(function () {
        applied = [];
        closed = 0;
        this.set('allItems', ITEMS);
        this.set('onApply', (ids) => applied.push(ids));
        this.set('onClose', () => closed++);
    });

    const TEMPLATE = hbs`
        <Layout::Header::SmartNavMenu::Customizer
            @allItems={{this.allItems}}
            @pinnedIds={{this.pinnedIds}}
            @maxVisible={{this.maxVisible}}
            @onApply={{this.onApply}}
            @onClose={{this.onClose}}
        />
    `;

    module('the initial pinned set', function () {
        test('with no saved order the first items are pinned up to the limit', async function (assert) {
            this.set('maxVisible', 2);

            await render(TEMPLATE);

            assert.deepEqual(pinnedTitles(), ['Fleet Ops', 'Storefront']);
        });

        test('five items are pinned by default', async function (assert) {
            await render(TEMPLATE);

            assert.deepEqual(pinnedTitles(), ['Fleet Ops', 'Storefront', 'IAM', 'Developers'], 'all four fit under the default cap of five');
        });

        test('a saved order is restored exactly', async function (assert) {
            this.set('pinnedIds', ['dev', 'fleet-ops']);

            await render(TEMPLATE);

            assert.deepEqual(pinnedTitles(), ['Developers', 'Fleet Ops'], 'the saved order wins over the universe order');
        });

        test('a saved id that no longer exists is dropped', async function (assert) {
            this.set('pinnedIds', ['dev', 'retired-extension', 'iam']);

            await render(TEMPLATE);

            assert.deepEqual(pinnedTitles(), ['Developers', 'IAM']);
        });

        test('an empty saved list falls back to the defaults', async function (assert) {
            this.set('pinnedIds', []);
            this.set('maxVisible', 1);

            await render(TEMPLATE);

            assert.deepEqual(pinnedTitles(), ['Fleet Ops']);
        });

        test('with no items at all the pinned column is empty', async function (assert) {
            this.set('allItems', []);

            await render(TEMPLATE);

            assert.deepEqual(pinnedTitles(), []);
            assert.dom('.snm-customizer-empty-state').containsText('No extensions pinned yet.');
        });

        test('it renders with no arguments at all', async function (assert) {
            await render(hbs`<Layout::Header::SmartNavMenu::Customizer />`);

            assert.dom('.snm-customizer-panel').exists();
            assert.dom('.snm-customizer-empty-state').exists();
        });
    });

    module('the full extension list', function () {
        test('every extension is listed and pinned ones are marked', async function (assert) {
            this.set('pinnedIds', ['fleet-ops']);

            await render(TEMPLATE);

            assert.strictEqual(allItems().length, 4, 'all extensions are offered');
            assert.dom(allItem('Fleet Ops')).hasClass('is-pinned');
            assert.dom(allItem('Storefront')).doesNotHaveClass('is-pinned');
        });

        test('a pinned extension explains that clicking unpins it', async function (assert) {
            this.set('pinnedIds', ['fleet-ops']);

            await render(TEMPLATE);

            assert.dom(allItem('Fleet Ops')).hasAttribute('title', 'Click to unpin');
            assert.dom(allItem('Storefront')).hasAttribute('title', 'Click to pin to bar');
        });

        test('an extension nested under a parent shows the parent name', async function (assert) {
            await render(TEMPLATE);

            assert.dom(allItem('IAM')).containsText('Console');
        });
    });

    module('pinning and unpinning', function () {
        test('an unpinned extension can be pinned', async function (assert) {
            this.set('pinnedIds', ['fleet-ops']);

            await render(TEMPLATE);
            await click(allItem('Storefront'));

            assert.deepEqual(pinnedTitles(), ['Fleet Ops', 'Storefront'], 'it is appended to the end');
            assert.dom(allItem('Storefront')).hasClass('is-pinned');
        });

        test('a pinned extension can be unpinned from the list', async function (assert) {
            this.set('pinnedIds', ['fleet-ops', 'storefront']);

            await render(TEMPLATE);
            await click(allItem('Fleet Ops'));

            assert.deepEqual(pinnedTitles(), ['Storefront']);
        });

        test('a pinned extension can be removed from the bar directly', async function (assert) {
            this.set('pinnedIds', ['fleet-ops', 'storefront']);

            await render(TEMPLATE);
            await click(findAll('.snm-customizer-unpin-btn')[0]);

            assert.deepEqual(pinnedTitles(), ['Storefront']);
        });

        test('the limit is enforced and shown', async function (assert) {
            this.setProperties({ pinnedIds: ['fleet-ops'], maxVisible: 2 });

            await render(TEMPLATE);
            assert.dom(badge()).doesNotHaveClass('at-limit');

            await click(allItem('Storefront'));

            assert.dom(badge()).hasClass('at-limit', 'the counter warns that the bar is full');
            assert.dom(allItem('IAM')).isDisabled('no more can be pinned');
            assert.dom(allItem('IAM')).hasClass('is-disabled');
        });

        test('unpinning below the limit re-enables the rest', async function (assert) {
            this.setProperties({ pinnedIds: ['fleet-ops', 'storefront'], maxVisible: 2 });

            await render(TEMPLATE);
            assert.dom(allItem('IAM')).isDisabled();

            await click(allItem('Fleet Ops'));

            assert.dom(allItem('IAM')).isNotDisabled();
            assert.dom(badge()).doesNotHaveClass('at-limit');
        });

        test('a pinned extension can still be unpinned while at the limit', async function (assert) {
            this.setProperties({ pinnedIds: ['fleet-ops', 'storefront'], maxVisible: 2 });

            await render(TEMPLATE);

            assert.dom(allItem('Fleet Ops')).isNotDisabled('already-pinned items stay clickable');

            await click(allItem('Fleet Ops'));
            assert.deepEqual(pinnedTitles(), ['Storefront']);
        });
    });

    module('applying and discarding', function () {
        test('applying reports the pinned ids in order', async function (assert) {
            this.set('pinnedIds', ['storefront', 'fleet-ops']);

            await render(TEMPLATE);
            await click('.snm-btn-primary');

            assert.deepEqual(applied, [['storefront', 'fleet-ops']]);
        });

        test('applying reports changes made in the panel', async function (assert) {
            this.setProperties({ pinnedIds: ['fleet-ops'], maxVisible: 3 });

            await render(TEMPLATE);
            await click(allItem('Developers'));
            await click('.snm-btn-primary');

            assert.deepEqual(applied, [['fleet-ops', 'dev']]);
        });

        test('cancelling closes without reporting anything', async function (assert) {
            this.set('pinnedIds', ['fleet-ops']);

            await render(TEMPLATE);
            await click(allItem('Storefront'));
            await click('.snm-btn-secondary');

            assert.strictEqual(closed, 1, 'the panel is closed');
            assert.deepEqual(applied, [], 'and nothing is applied');
        });

        test('the close control cancels too', async function (assert) {
            await render(TEMPLATE);
            await click('.snm-customizer-close');

            assert.strictEqual(closed, 1);
        });

        test('clicking the backdrop cancels', async function (assert) {
            await render(TEMPLATE);
            await click('.snm-customizer-backdrop');

            assert.strictEqual(closed, 1);
        });

        test('resetting restores the default selection', async function (assert) {
            this.setProperties({ pinnedIds: ['dev'], maxVisible: 2 });

            await render(TEMPLATE);
            assert.deepEqual(pinnedTitles(), ['Developers']);

            await click('.snm-customizer-reset-btn');

            assert.deepEqual(pinnedTitles(), ['Fleet Ops', 'Storefront'], 'the first items in universe order');
        });

        test('resetting with no items leaves the panel empty', async function (assert) {
            this.set('allItems', []);

            await render(TEMPLATE);
            await click('.snm-customizer-reset-btn');

            assert.deepEqual(pinnedTitles(), []);
        });

        test('it applies and closes happily without handlers', async function (assert) {
            await render(hbs`<Layout::Header::SmartNavMenu::Customizer @allItems={{this.allItems}} />`);
            await click('.snm-btn-primary');
            await click('.snm-btn-secondary');

            assert.dom('.snm-customizer-panel').exists('the panel survives');
        });
    });
    test('resetting to the default with no items at all leaves the bar empty', async function (assert) {
        await render(hbs`<Layout::Header::SmartNavMenu::Customizer />`);

        const reset = [...this.element.querySelectorAll('button')].find((button) => /reset/i.test(button.textContent));
        assert.ok(reset, 'the reset control is offered');

        await click(reset);

        assert.deepEqual(pinnedTitles(), [], 'there is nothing to restore and nothing breaks');
    });
});
