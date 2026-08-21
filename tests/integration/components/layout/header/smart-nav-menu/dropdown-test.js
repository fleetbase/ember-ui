import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Component from '@glimmer/component';

// <LinkToExternal> comes from ember-engines and only resolves inside a mounted engine, so the
// route-backed cards are given a stand-in that still renders their label.
class LinkToExternalStub extends Component {}
const LINK_TO_EXTERNAL_TEMPLATE = hbs`<a href="javascript:;" data-test-route={{@route}} ...attributes>{{yield}}</a>`;

const SEARCH = '.snm-dropdown-search-input';
const CLEAR = '.snm-dropdown-search-clear';

function cardTitles() {
    return findAll('.snm-dropdown-card-title').map((node) => node.textContent.trim());
}

module('Integration | Component | layout/header/smart-nav-menu/dropdown', function (hooks) {
    setupRenderingTest(hooks);

    let closes;
    let pins;
    let clicked;

    hooks.beforeEach(function () {
        closes = [];
        pins = [];
        clicked = [];

        this.owner.register('component:link-to-external', LinkToExternalStub);
        this.owner.register('template:components/link-to-external', LINK_TO_EXTERNAL_TEMPLATE);

        this.set('onClose', () => closes.push('close'));
        this.set('onQuickPin', (item) => pins.push(item.id));
        this.set('items', [
            { id: 'fleet-ops', title: 'Fleet Ops', description: 'Dispatch and fulfillment', icon: 'truck', onClick: (item) => clicked.push(item.id) },
            { id: 'storefront', title: 'Storefront', description: 'Online ordering', tags: ['commerce', 'shop'], onClick: (item) => clicked.push(item.id) },
            { id: 'drivers', title: 'Drivers', _parentTitle: 'Fleet Ops', _isShortcut: true, route: 'console.drivers' },
        ]);
    });

    const TEMPLATE = hbs`
        <Layout::Header::SmartNavMenu::Dropdown
            @items={{this.items}}
            @top={{this.top}}
            @left={{this.left}}
            @atPinnedLimit={{this.atPinnedLimit}}
            @onClose={{this.onClose}}
            @onQuickPin={{this.onQuickPin}}
        />
    `;

    module('rendering', function () {
        test('it renders a card per item and positions itself from @top and @left', async function (assert) {
            this.set('top', 48);
            this.set('left', 120);

            await render(TEMPLATE);

            assert.deepEqual(cardTitles(), ['Fleet Ops', 'Storefront', 'Drivers'], 'every item gets a card');
            assert.dom('.snm-dropdown').hasAttribute('style', 'top: 48px; left: 120px;');
            assert.dom('.snm-dropdown').hasAttribute('role', 'dialog');
        });

        // No @top/@left were supplied, so the component's own zero defaults apply.
        test('it falls back to the top-left corner with no position arguments', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.snm-dropdown').hasAttribute('style', 'top: 0px; left: 0px;');
        });

        test('it renders an empty grid with no items at all', async function (assert) {
            this.set('items', undefined);

            await render(TEMPLATE);

            assert.dom('.snm-dropdown').exists('the panel still renders');
            assert.strictEqual(cardTitles().length, 0, 'with nothing in the grid');
        });

        test('the close button reports through @onClose', async function (assert) {
            await render(TEMPLATE);
            await click('.snm-dropdown-close');

            assert.deepEqual(closes, ['close']);
        });

        test('the customise link reports through @onOpenCustomizer', async function (assert) {
            const opened = [];
            this.set('onOpenCustomizer', () => opened.push('customize'));

            await render(hbs`
                <Layout::Header::SmartNavMenu::Dropdown @items={{this.items}} @onClose={{this.onClose}} @onOpenCustomizer={{this.onOpenCustomizer}} />
            `);
            await click('.snm-dropdown-customise-link');

            assert.deepEqual(opened, ['customize']);
        });

        // DEFECT (see DEFECTS.md #130): both buttons bound their argument straight into
        // `{{on "click" …}}`, which throws on an undefined handler, so the panel could not render
        // at all without them. Both are now guarded with `(or … (noop))`.
        test('it renders and stays inert with no handler arguments at all', async function (assert) {
            await render(hbs`<Layout::Header::SmartNavMenu::Dropdown @items={{this.items}} />`);

            assert.strictEqual(cardTitles().length, 3, 'the panel renders');

            await click('.snm-dropdown-close');
            await click('.snm-dropdown-customise-link');

            assert.strictEqual(cardTitles().length, 3, 'and both buttons are harmless no-ops');
        });
    });

    module('searching', function () {
        test('a matching title narrows the grid', async function (assert) {
            await render(TEMPLATE);
            await fillIn(SEARCH, 'store');

            assert.deepEqual(cardTitles(), ['Storefront'], 'only the matching card survives');
        });

        test('a match on the description counts', async function (assert) {
            await render(TEMPLATE);
            await fillIn(SEARCH, 'dispatch');

            assert.deepEqual(cardTitles(), ['Fleet Ops'], 'the description is searched too');
        });

        test('a match on the parent title counts', async function (assert) {
            await render(TEMPLATE);
            await fillIn(SEARCH, 'fleet');

            assert.deepEqual(cardTitles(), ['Fleet Ops', 'Drivers'], 'a shortcut is found through its parent');
        });

        test('a match on a tag counts', async function (assert) {
            await render(TEMPLATE);
            await fillIn(SEARCH, 'commerce');

            assert.deepEqual(cardTitles(), ['Storefront'], 'tags are searched as well');
        });

        test('a query matching nothing explains itself', async function (assert) {
            await render(TEMPLATE);
            await fillIn(SEARCH, 'nothing-matches-this');

            assert.strictEqual(cardTitles().length, 0, 'no cards are left');
            assert.dom('.snm-dropdown-empty').exists('an empty state takes their place');
            assert.dom('.snm-dropdown-empty-text').includesText('nothing-matches-this', 'and it quotes the query back');
        });

        test('whitespace alone is not treated as a query', async function (assert) {
            await render(TEMPLATE);
            await fillIn(SEARCH, '   ');

            assert.deepEqual(cardTitles(), ['Fleet Ops', 'Storefront', 'Drivers'], 'the full grid is kept');
            assert.dom('.snm-dropdown-empty').doesNotExist();
        });

        test('the clear button restores the full grid', async function (assert) {
            await render(TEMPLATE);
            await fillIn(SEARCH, 'store');
            assert.strictEqual(cardTitles().length, 1, 'the grid is filtered');

            await click(CLEAR);

            assert.dom(SEARCH).hasValue('', 'the box is emptied');
            assert.deepEqual(cardTitles(), ['Fleet Ops', 'Storefront', 'Drivers'], 'and every card is back');
        });

        test('the clear button only appears once something is typed', async function (assert) {
            await render(TEMPLATE);

            assert.dom(CLEAR).doesNotExist('nothing to clear yet');

            await fillIn(SEARCH, 'store');

            assert.dom(CLEAR).exists();
        });
    });

    module('activating a card', function () {
        function cardFor(title) {
            return findAll('.snm-dropdown-card').find((card) => card.textContent.includes(title));
        }

        test('clicking a card runs the item handler and then closes the panel', async function (assert) {
            await render(TEMPLATE);
            await click(cardFor('Fleet Ops'));

            assert.deepEqual(clicked, ['fleet-ops'], 'the item is told it was chosen');
            assert.deepEqual(closes, ['close'], 'and the panel closes behind it');
        });

        // A truthy `onClick` is what makes the template render the clickable <a> rather than a
        // route link, but the component still has to survive one that is not callable.
        test('a card whose handler is not callable still closes the panel', async function (assert) {
            this.set('items', [{ id: 'bare', title: 'Bare', onClick: 'not-a-function' }]);

            await render(TEMPLATE);
            await click(cardFor('Bare'));

            assert.deepEqual(closes, ['close'], 'the panel closes even though nothing could be invoked');
        });

        test('a card click with no @onClose argument is inert rather than broken', async function (assert) {
            this.set('items', [{ id: 'fleet-ops', title: 'Fleet Ops', onClick: (item) => clicked.push(item.id) }]);

            await render(hbs`<Layout::Header::SmartNavMenu::Dropdown @items={{this.items}} />`);
            await click(cardFor('Fleet Ops'));

            assert.deepEqual(clicked, ['fleet-ops'], 'the item still runs');
        });

        test('the pin button reports the item it belongs to', async function (assert) {
            await render(TEMPLATE);
            await click(findAll('.snm-dropdown-pin-btn')[0]);

            assert.deepEqual(pins, ['fleet-ops']);
        });

        test('a full navigation bar hides the pin buttons', async function (assert) {
            this.set('atPinnedLimit', true);

            await render(TEMPLATE);

            assert.dom('.snm-dropdown-pin-btn').doesNotExist('there is nowhere left to pin to');
            assert.strictEqual(cardTitles().length, 3, 'but the cards are all still offered');
        });
    });
    test('an item with no title at all is still searchable by its other fields', async function (assert) {
        this.set('items', [{ id: 'untitled', description: 'Dispatch and fulfillment', onClick: () => {} }]);

        await render(TEMPLATE);
        await fillIn(SEARCH, 'dispatch');

        assert.strictEqual(findAll('.snm-dropdown-card').length, 1, 'the description matched despite the missing title');
    });
});
