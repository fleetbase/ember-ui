import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | content-panel', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the title and starts closed by default', async function (assert) {
        await render(hbs`<ContentPanel @title="Panel Title">Panel body content</ContentPanel>`);

        assert.dom('.next-content-panel-wrapper').hasClass('is-closed');
        assert.dom('.panel-title').containsText('Panel Title');
        assert.dom('.next-content-panel-body-inner').doesNotExist('body is not rendered while closed');
        assert.dom('.next-content-panel-header-left').doesNotHaveAria('expanded');
    });

    test('it renders open and yields body content when @open is true', async function (assert) {
        await render(hbs`<ContentPanel @title="Panel Title" @open={{true}}>Panel body content</ContentPanel>`);

        assert.dom('.next-content-panel-wrapper').hasClass('is-open');
        assert.dom('.next-content-panel-body-inner').exists();
        assert.dom('.next-content-panel-body-inner').containsText('Panel body content');
        assert.dom('.next-content-panel-header-left').hasAttribute('aria-expanded');
    });

    test('it renders subtitle and prefix title when provided', async function (assert) {
        await render(hbs`<ContentPanel @title="Panel Title" @subtitle="Panel Subtitle" @prefixTitle="Prefix" />`);

        assert.dom('.next-content-panel-header').containsText('Panel Subtitle');
        assert.dom('.next-content-panel-prefix-title').hasText('Prefix');
    });

    test('clicking the header toggles the panel and fires @onToggle', async function (assert) {
        const toggles = [];
        this.set('onToggle', (isOpen) => toggles.push(isOpen));

        await render(hbs`<ContentPanel @title="Panel Title" @onToggle={{this.onToggle}}>Panel body content</ContentPanel>`);

        await click('.next-content-panel-header-left');
        assert.dom('.next-content-panel-wrapper').hasClass('is-open');
        assert.dom('.next-content-panel-body-inner').containsText('Panel body content');

        await click('.next-content-panel-header-left');
        assert.dom('.next-content-panel-wrapper').hasClass('is-closed');
        assert.dom('.next-content-panel-body-inner').doesNotExist();

        assert.deepEqual(toggles, [true, false]);
    });

    test('with @toggleOnCaretOnly only the caret toggles the panel', async function (assert) {
        const events = [];
        this.set('onClickPanelTitle', () => events.push('title'));
        this.set('onClickCaret', () => events.push('caret'));

        await render(hbs`
            <ContentPanel
                @title="Panel Title"
                @toggleOnCaretOnly={{true}}
                @onClickPanelTitle={{this.onClickPanelTitle}}
                @onClickCaret={{this.onClickCaret}}
            >Panel body content</ContentPanel>
        `);

        await click('.next-content-panel-header-left');
        assert.dom('.next-content-panel-wrapper').hasClass('is-closed', 'clicking the title does not toggle');
        assert.deepEqual(events, ['title'], 'onClickPanelTitle fired');

        await click('.next-content-panel-header-right .icon-container');
        assert.dom('.next-content-panel-wrapper').hasClass('is-open', 'clicking the caret toggles');
        assert.deepEqual(events, ['title', 'caret'], 'onClickCaret fired');
    });

    test('@hideCaret hides the caret icon container', async function (assert) {
        await render(hbs`<ContentPanel @title="Panel Title" @hideCaret={{true}} />`);

        assert.dom('.icon-container').doesNotExist();
    });

    test('@onInsert exposes a context api to open, close, and toggle the panel', async function (assert) {
        let context;
        this.set('onInsert', (panelContext) => {
            context = panelContext;
        });

        await render(hbs`<ContentPanel @title="Panel Title" @onInsert={{this.onInsert}}>Panel body content</ContentPanel>`);

        assert.ok(context, 'context api was provided');

        context.open();
        await settled();
        assert.dom('.next-content-panel-wrapper').hasClass('is-open');

        context.close();
        await settled();
        assert.dom('.next-content-panel-wrapper').hasClass('is-closed');

        context.toggle();
        await settled();
        assert.dom('.next-content-panel-wrapper').hasClass('is-open');
    });

    test('it syncs the open state when @open changes', async function (assert) {
        this.set('open', false);

        await render(hbs`<ContentPanel @title="Panel Title" @open={{this.open}}>Panel body content</ContentPanel>`);
        assert.dom('.next-content-panel-wrapper').hasClass('is-closed');

        this.set('open', true);
        await settled();
        assert.dom('.next-content-panel-wrapper').hasClass('is-open');
    });
    test('@onClick fires on every header click and receives the context api', async function (assert) {
        const contexts = [];
        this.set('onClick', (context) => contexts.push(context));

        await render(hbs`<ContentPanel @title="Panel Title" @onClick={{this.onClick}}>Panel body content</ContentPanel>`);

        await click('.next-content-panel-header-left');
        await click('.next-content-panel-header-left');

        assert.strictEqual(contexts.length, 2, 'it fires whether the panel is opening or closing');
        assert.strictEqual(typeof contexts[0].toggle, 'function', 'the same context api the panel yields is handed over');
        assert.strictEqual(typeof contexts[0].open, 'function');
        assert.strictEqual(typeof contexts[0].close, 'function');
    });

    // Without @toggleOnCaretOnly the caret is just another part of the header: it reports the
    // caret click and then falls through to the same toggle the title performs.
    test('the caret toggles the panel when the whole header is clickable', async function (assert) {
        await render(hbs`<ContentPanel @title="Panel Title">Panel body content</ContentPanel>`);

        await click('.next-content-panel-header-right .icon-container');

        assert.dom('.next-content-panel-wrapper').hasClass('is-open', 'the caret still toggles');
        assert.dom('.next-content-panel-body-inner').containsText('Panel body content');

        await click('.next-content-panel-header-right .icon-container');

        assert.dom('.next-content-panel-wrapper').hasClass('is-closed');
    });

    module('the actions dropdown', function () {
        const TEMPLATE = hbs`
            <ContentPanel @title="Panel Title" @dropdownButton={{true}} @dropdownButtonActions={{this.actions}}>
                Panel body content
            </ContentPanel>
        `;

        async function openMenu() {
            await click('.next-content-panel-header-right .ember-basic-dropdown-trigger');
        }

        function menuItems() {
            return findAll('.next-dd-item');
        }

        test('choosing an item runs both of its callbacks with its context and closes the menu', async function (assert) {
            const calls = [];
            const context = { id: 'record-1' };
            this.set('actions', [{ label: 'Archive', context, fn: (ctx) => calls.push(['fn', ctx]), onClick: (ctx) => calls.push(['onClick', ctx]) }]);

            await render(TEMPLATE);
            await openMenu();

            assert.strictEqual(menuItems().length, 1, 'the action is offered');

            await click(menuItems()[0]);

            assert.deepEqual(calls, [
                ['fn', context],
                ['onClick', context],
            ]);
            assert.strictEqual(menuItems().length, 0, 'the menu closes itself');
        });

        test('an item with no callbacks at all is still clickable', async function (assert) {
            this.set('actions', [{ label: 'Inert' }]);

            await render(TEMPLATE);
            await openMenu();
            await click(menuItems()[0]);

            assert.strictEqual(menuItems().length, 0, 'it closes the menu and does nothing else');
        });

        test('a separator renders instead of an item and an invisible action is dropped', async function (assert) {
            this.set('actions', [{ label: 'Archive', fn: () => {} }, { separator: true }, { label: 'Hidden', isVisible: false }]);

            await render(TEMPLATE);
            await openMenu();

            assert.deepEqual(
                menuItems().map((item) => item.textContent.trim()),
                ['Archive'],
                'only the visible action is listed'
            );
            assert.dom('.next-dd-menu .next-dd-menu-seperator').exists({ count: 1 });
        });
    });
});
