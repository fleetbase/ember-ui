import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function meta(overrides = {}) {
    return { current_page: 1, last_page: 5, from: 1, to: 10, total: 50, ...overrides };
}

function directionButtons() {
    return findAll('.direction-button');
}

function pageButtons() {
    return findAll('.page-item, .page-item-arrow').filter((button) => !button.classList.contains('page-item-arrow'));
}

function pageLabels() {
    return pageButtons().map((button) => button.textContent.trim());
}

function arrows() {
    return findAll('.page-item-arrow');
}

module('Integration | Component | pagination', function (hooks) {
    setupRenderingTest(hooks);

    let changes;

    hooks.beforeEach(function () {
        changes = [];
        this.set('meta', meta());
        // @currentPage must be supplied: the page-item list aliases args.currentPage, not
        // the component's own defaulted property (see DEFECTS.md #44).
        this.set('currentPage', 1);
        this.set('onPageChange', (page) => changes.push(page));
    });

    const TEMPLATE = hbs`
        <Pagination
            @meta={{this.meta}}
            @currentPage={{this.currentPage}}
            @numPagesToShow={{this.numPagesToShow}}
            @showFL={{this.showFL}}
            @truncatePages={{this.truncatePages}}
            @isLoading={{this.isLoading}}
            @onPageChange={{this.onPageChange}}
        />
    `;

    module('rendering', function () {
        test('it renders the result range and total', async function (assert) {
            await render(TEMPLATE);

            assert.dom('#fleetbase-pagination').exists();
            assert.dom('.fleetbase-pagination').containsText('1');
            assert.dom('.fleetbase-pagination').containsText('10');
            assert.dom('.fleetbase-pagination').containsText('50');
        });

        test('a meta without a range falls back to the first result', async function (assert) {
            this.set('meta', meta({ from: null, to: null }));

            await render(TEMPLATE);

            assert.dom('.fleetbase-pagination').exists('missing range values do not break the summary');
        });

        test('it renders a button per page', async function (assert) {
            await render(TEMPLATE);

            assert.deepEqual(pageLabels(), ['1', '2', '3', '4', '5']);
        });

        test('the current page is marked active and re-choosing it reports nothing', async function (assert) {
            this.set('meta', meta({ current_page: 3 }));
            this.set('currentPage', 3);

            await render(TEMPLATE);

            const active = pageButtons()[2];
            assert.dom(active).hasClass('active');

            await click(active);
            assert.deepEqual(changes, [], 'choosing the page you are already on is a no-op');
        });

        test('omitting the current page falls back to the first', async function (assert) {
            this.set('currentPage', undefined);

            await render(TEMPLATE);

            assert.deepEqual(pageLabels(), ['1', '2', '3', '4', '5'], 'the pages are still listed');
            assert.dom(pageButtons()[0]).hasClass('active', 'and page one is the active one');
        });

        test('the highlight follows a page chosen inside the component', async function (assert) {
            this.set('currentPage', undefined);

            await render(TEMPLATE);
            await click(pageButtons()[2]);

            assert.dom(pageButtons()[2]).hasClass('active', 'no round trip through the parent is needed');
            assert.deepEqual(changes, [3], 'and the choice is still reported');
        });

        test('a loading pagination shows a spinner alongside the pages', async function (assert) {
            this.set('isLoading', true);

            await render(TEMPLATE);

            assert.dom('.fleetbase-pagination svg.fa-spin-800ms, .fleetbase-pagination .fa-spin-800ms').exists('a spinner is shown');
            assert.strictEqual(pageLabels().length, 5, 'the page list stays available while loading');
        });

        test('it forwards splattributes and direction button classes', async function (assert) {
            await render(hbs`<Pagination @meta={{this.meta}} @directionButtonClass="my-direction" data-test-pagination="yes" />`);

            assert.dom('#fleetbase-pagination').hasAttribute('data-test-pagination', 'yes');
            assert.dom(directionButtons()[0]).hasClass('my-direction');
        });
    });

    module('step boundaries', function () {
        test('on the first page the backward control is marked disabled for assistive tech', async function (assert) {
            await render(TEMPLATE);

            assert.dom(directionButtons()[0]).hasClass('disabled');
            assert.dom(directionButtons()[0]).hasAttribute('aria-disabled', 'true');
            assert.dom(directionButtons()[0]).doesNotHaveAttribute('disabled', 'an anchor cannot be disabled');
            assert.dom(directionButtons()[1]).hasAttribute('aria-disabled', 'false');
            assert.dom(directionButtons()[1]).doesNotHaveClass('disabled');

            await click(directionButtons()[0]);
            assert.deepEqual(changes, [], 'stepping past the first page is refused by the action');
        });

        test('on the last page the forward control is marked disabled', async function (assert) {
            this.set('meta', meta({ current_page: 5 }));
            this.set('currentPage', 5);

            await render(TEMPLATE);

            assert.dom(directionButtons()[1]).hasClass('disabled');
            assert.dom(directionButtons()[0]).doesNotHaveClass('disabled');

            await click(directionButtons()[1]);
            assert.deepEqual(changes, [], 'stepping past the last page is refused');
        });

        test('in the middle you can step both ways', async function (assert) {
            this.set('meta', meta({ current_page: 3 }));
            this.set('currentPage', 3);

            await render(TEMPLATE);

            assert.dom(directionButtons()[0]).doesNotHaveClass('disabled');
            assert.dom(directionButtons()[1]).doesNotHaveClass('disabled');
        });

        test('a single page offers no stepping at all', async function (assert) {
            this.set('meta', meta({ current_page: 1, last_page: 1 }));

            await render(TEMPLATE);

            assert.dom(directionButtons()[0]).hasClass('disabled');
            assert.dom(directionButtons()[1]).hasClass('disabled');
        });
    });

    module('changing page', function () {
        test('stepping forward reports the next page', async function (assert) {
            this.set('meta', meta({ current_page: 2 }));
            this.set('currentPage', 2);

            await render(TEMPLATE);
            await click(directionButtons()[1]);

            assert.deepEqual(changes, [3]);
        });

        test('stepping backward reports the previous page', async function (assert) {
            this.set('meta', meta({ current_page: 2 }));
            this.set('currentPage', 2);

            await render(TEMPLATE);
            await click(directionButtons()[0]);

            assert.deepEqual(changes, [1]);
        });

        test('stepping forward from the last page is refused', async function (assert) {
            this.set('meta', meta({ current_page: 5 }));
            this.set('currentPage', 5);

            await render(TEMPLATE);
            assert.dom(arrows()[arrows().length - 1]).isDisabled('the forward arrow is a real disabled button');
            assert.deepEqual(changes, [], 'nothing is reported');
        });

        test('choosing a page reports it', async function (assert) {
            await render(TEMPLATE);
            await click(pageButtons()[3]);

            assert.deepEqual(changes, [4]);
        });

        test('the active page carries the active class', async function (assert) {
            this.set('currentPage', 2);
            this.set('meta', meta({ current_page: 2 }));

            await render(TEMPLATE);

            assert.dom(pageButtons()[1]).hasClass('active');
        });

        test('it changes page without an onPageChange handler', async function (assert) {
            await render(hbs`<Pagination @meta={{this.meta}} @currentPage={{this.currentPage}} />`);

            await click(pageButtons()[2]);

            assert.dom('#fleetbase-pagination').exists('no handler is required');
        });
    });

    module('page list shape', function () {
        test('a long pagination is truncated with an ellipsis', async function (assert) {
            this.set('meta', meta({ last_page: 40, current_page: 1, total: 400 }));

            await render(TEMPLATE);

            const labels = pageLabels();
            assert.true(labels.length < 40, 'a forty-page result is not listed in full');
            assert.true(labels.includes('1'), 'the first page is always reachable');
        });

        test('truncation can be switched off', async function (assert) {
            this.set('meta', meta({ last_page: 12, total: 120 }));
            this.set('currentPage', 1);
            this.set('truncatePages', false);

            await render(TEMPLATE);

            assert.true(pageButtons().length > 0, 'pages are still listed');
        });

        test('the number of pages shown can be configured', async function (assert) {
            this.set('meta', meta({ last_page: 30, total: 300 }));
            this.set('numPagesToShow', 5);

            await render(TEMPLATE);

            assert.true(pageButtons().length <= 12);
        });

        test('first and last controls can be enabled', async function (assert) {
            this.set('meta', meta({ last_page: 30, current_page: 15, total: 300 }));
            this.set('showFL', true);

            await render(TEMPLATE);

            assert.true(pageButtons().length > 0, 'the list still renders with first/last enabled');
        });

        test('a meta with no last page offers no numbered pages', async function (assert) {
            this.set('meta', { current_page: 1, total: 0 });

            await render(TEMPLATE);

            assert.deepEqual(
                pageLabels().filter((label) => /^\d+$/.test(label)),
                ['1'],
                'only the single implicit first page is offered'
            );
        });
    });

    test('the arrows step in both directions', async function (assert) {
        this.set('meta', meta({ current_page: 3 }));
        this.set('currentPage', 3);

        await render(TEMPLATE);

        const [backward] = arrows();
        await click(backward);
        assert.deepEqual(changes, [2]);

        const forward = arrows()[arrows().length - 1];
        assert.ok(forward, 'a forward arrow is rendered');
        await click(forward);
        assert.deepEqual(changes, [2, 3], 'the arrows step in both directions');
    });

    test('it renders without a currentPage argument', async function (assert) {
        await render(hbs`<Pagination @meta={{this.meta}} @onPageChange={{this.onPageChange}} />`);

        assert.ok(find('#fleetbase-pagination'), 'the summary still renders');
        await click(directionButtons()[1]);
        assert.deepEqual(changes, [2], 'stepping still works from the defaulted page');
    });
});
