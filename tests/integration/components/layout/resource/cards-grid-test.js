import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const GRID = '.card-grid-container > div.grid';

function records() {
    return [
        { id: 'veh_1', name: 'Truck one' },
        { id: 'veh_2', name: 'Truck two' },
    ];
}

module('Integration | Component | layout/resource/cards-grid', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('data', records());
        this.set('resource', 'vehicle');
    });

    const TEMPLATE = hbs`
        <Layout::Resource::CardsGrid
            @data={{this.data}}
            @resource={{this.resource}}
            @columns={{this.columns}}
            @gap={{this.gap}}
            @containerClass={{this.containerClass}}
            @cardClass={{this.cardClass}}
            @emptyStateText={{this.emptyStateText}}
            @createButtonText={{this.createButtonText}}
            @onCreateNew={{this.onCreateNew}}
            @showPagination={{this.showPagination}}
            @paginationMeta={{this.paginationMeta}}
            @page={{this.page}}
            @onPageChange={{this.onPageChange}}
            as |grid|
        >
            <div class="my-card" data-id={{grid.model.id}} data-index={{grid.index}}>{{grid.model.name}}</div>
        </Layout::Resource::CardsGrid>
    `;

    module('with records', function () {
        test('it yields one card per record with its index', async function (assert) {
            await render(TEMPLATE);

            assert.deepEqual(
                findAll('.my-card').map((card) => card.textContent.trim()),
                ['Truck one', 'Truck two']
            );
            assert.deepEqual(
                findAll('.my-card').map((card) => card.dataset.index),
                ['0', '1'],
                'the position is yielded alongside the record'
            );
        });

        test('four columns is the default layout', async function (assert) {
            await render(TEMPLATE);

            assert.dom(GRID).hasClass('grid-cols-1');
            assert.dom(GRID).hasClass('md:grid-cols-4');
            assert.dom(GRID).hasClass('gap-4', 'a medium gap by default');
        });

        test('every supported column count has a layout', async function (assert) {
            const expected = {
                1: 'grid-cols-1',
                2: 'md:grid-cols-2',
                3: 'lg:grid-cols-3',
                4: 'md:grid-cols-4',
                5: 'md:grid-cols-5',
                6: 'md:grid-cols-6',
            };

            for (const [columns, className] of Object.entries(expected)) {
                this.set('columns', Number(columns));
                await render(TEMPLATE);
                assert.dom(GRID).hasClass(className, `${columns} columns`);
            }
        });

        test('a column count given as a string is understood', async function (assert) {
            this.set('columns', '2');

            await render(TEMPLATE);

            assert.dom(GRID).hasClass('md:grid-cols-2');
        });

        test('an unsupported column count falls back to a responsive three', async function (assert) {
            this.set('columns', 11);

            await render(TEMPLATE);

            assert.dom(GRID).hasClass('lg:grid-cols-3');
        });

        test('every named gap size is supported', async function (assert) {
            const expected = { xs: 'gap-1', sm: 'gap-2', md: 'gap-4', lg: 'gap-6', xl: 'gap-8' };

            for (const [gap, className] of Object.entries(expected)) {
                this.set('gap', gap);
                await render(TEMPLATE);
                assert.dom(GRID).hasClass(className, `${gap} gap`);
            }
        });

        test('an unknown gap size falls back to medium', async function (assert) {
            this.set('gap', 'enormous');

            await render(TEMPLATE);

            assert.dom(GRID).hasClass('gap-4');
        });

        test('extra container and card classes are appended', async function (assert) {
            this.setProperties({ containerClass: 'my-container', cardClass: 'my-card-style' });

            await render(TEMPLATE);

            assert.dom(GRID).hasClass('my-container');
            assert.dom(GRID).hasClass('grid', 'the base classes survive');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<Layout::Resource::CardsGrid @data={{this.data}} data-test-grid="yes" />`);

            assert.dom('.card-grid-container').hasAttribute('data-test-grid', 'yes');
        });
    });

    module('with no records', function (hooks) {
        hooks.beforeEach(function () {
            this.set('data', []);
        });

        test('it explains that the resource is empty', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find(GRID), null, 'no grid is drawn');
            assert.dom('.card-grid-container').containsText('No vehicles', 'the resource name is pluralised');
            assert.dom('.card-grid-container').containsText('No vehicles to display');
        });

        test('the empty message can be replaced', async function (assert) {
            this.set('emptyStateText', 'Add your first truck to get started.');

            await render(TEMPLATE);

            assert.dom('.card-grid-container').containsText('Add your first truck to get started.');
        });

        test('an absent data argument is treated as empty', async function (assert) {
            await render(hbs`<Layout::Resource::CardsGrid @resource="vehicle" />`);

            assert.dom('.card-grid-container').containsText('No vehicles');
        });

        test('no create button is offered unless a handler is supplied', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find('button'), null);
        });

        test('a create button is offered and reports presses', async function (assert) {
            const created = [];
            this.set('onCreateNew', () => created.push('create'));

            await render(TEMPLATE);

            assert.dom('button').containsText('Create New');

            await click('button');
            assert.deepEqual(created, ['create']);
        });

        test('the create button text can be replaced', async function (assert) {
            this.set('onCreateNew', () => {});
            this.set('createButtonText', 'Add a vehicle');

            await render(TEMPLATE);

            assert.dom('button').containsText('Add a vehicle');
        });
    });

    module('pagination', function () {
        test('no pagination is rendered unless asked for', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find('.floating-pagination'), null);
        });

        test('pagination is rendered beneath the grid', async function (assert) {
            this.setProperties({
                showPagination: true,
                paginationMeta: { current_page: 1, last_page: 3, from: 1, to: 2, total: 6 },
                page: 1,
                onPageChange: () => {},
            });

            await render(TEMPLATE);

            assert.dom('.floating-pagination').exists();
            assert.dom('.floating-pagination').containsText('6');
        });

        test('pagination is suppressed when there is nothing to page through', async function (assert) {
            this.setProperties({ data: [], showPagination: true, paginationMeta: { current_page: 1, last_page: 1 } });

            await render(TEMPLATE);

            assert.strictEqual(find('.floating-pagination'), null);
        });
    });
    // `cardClass` is only read when the block actually renders a yielded card — the hash in
    // cards-grid.hbs is not built otherwise.
    module('the yielded card', function () {
        const WITH_CARD = hbs`
            <Layout::Resource::CardsGrid @data={{this.data}} @resource={{this.resource}} @cardClass={{this.cardClass}} as |grid|>
                <grid.card data-test-card="yes">{{grid.model.name}}</grid.card>
            </Layout::Resource::CardsGrid>
        `;

        test('each model renders a card carrying the base card classes', async function (assert) {
            this.setProperties({ data: [{ name: 'First' }, { name: 'Second' }], resource: 'order', cardClass: undefined });

            await render(WITH_CARD);

            const cards = findAll('[data-test-card="yes"]');
            assert.strictEqual(cards.length, 2, 'one card per model');
            assert.dom(cards[0]).hasClass('bg-white');
            assert.dom(cards[0]).hasClass('rounded-md');
            assert.dom(cards[0]).hasClass('shadow-sm');
            assert.dom(cards[0]).hasText('First', 'and the model is yielded alongside it');
        });

        test('a cardClass is appended to the base classes rather than replacing them', async function (assert) {
            this.setProperties({ data: [{ name: 'First' }], resource: 'order', cardClass: 'ring-2 ring-blue-500' });

            await render(WITH_CARD);

            const card = find('[data-test-card="yes"]');
            assert.dom(card).hasClass('ring-2', 'the supplied class is there');
            assert.dom(card).hasClass('bg-white', 'and so are the defaults');
        });
    });
});
