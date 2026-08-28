import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const HEADER = '.next-content-overlay-panel-header';

module('Integration | Component | overlay/header', function (hooks) {
    setupRenderingTest(hooks);

    module('the default header', function () {
        test('it renders the title', async function (assert) {
            await render(hbs`<Overlay::Header @title="Order 123" />`);

            assert.dom('.next-content-overlay-panel-title').hasText('Order 123');
        });

        test('a minimized overlay truncates a long title', async function (assert) {
            this.set('overlay', { isMinimized: true });

            await render(hbs`<Overlay::Header @title="A very long order title indeed" @overlay={{this.overlay}} />`);

            assert.dom('.next-content-overlay-panel-title').hasText('A very long ord...');
        });

        test('a minimized overlay leaves a short title alone apart from the ellipsis', async function (assert) {
            this.set('overlay', { isMinimized: true });

            await render(hbs`<Overlay::Header @title="Short" @overlay={{this.overlay}} />`);

            assert.dom('.next-content-overlay-panel-title').hasText('Short...');
        });

        // The component always carried a `useEllipsis` getter encoding a 15-character
        // threshold, but nothing consulted it — the template truncated on @overlay.isMinimized
        // alone. @titleEllipsis opts a non-minimized header into the same truncation, and
        // @titleEllipsisLength makes the threshold configurable.
        test('@titleEllipsis truncates a long title on an open overlay', async function (assert) {
            await render(hbs`<Overlay::Header @title="A very long order title indeed" @titleEllipsis={{true}} />`);

            assert.dom('.next-content-overlay-panel-title').hasText('A very long ord...');
        });

        test('a title at or under the threshold is left alone', async function (assert) {
            await render(hbs`<Overlay::Header @title="Order 123" @titleEllipsis={{true}} />`);

            assert.dom('.next-content-overlay-panel-title').hasText('Order 123', 'nine characters is under fifteen');
        });

        test('a title of exactly the threshold is not truncated', async function (assert) {
            await render(hbs`<Overlay::Header @title="123456789012345" @titleEllipsis={{true}} />`);

            assert.dom('.next-content-overlay-panel-title').hasText('123456789012345', 'the threshold is exclusive');
        });

        test('without @titleEllipsis an open overlay never truncates', async function (assert) {
            await render(hbs`<Overlay::Header @title="A very long order title indeed" />`);

            assert.dom('.next-content-overlay-panel-title').hasText('A very long order title indeed', 'the argument is opt-in');
        });

        test('@titleEllipsisLength moves the threshold', async function (assert) {
            await render(hbs`<Overlay::Header @title="A very long order title indeed" @titleEllipsis={{true}} @titleEllipsisLength={{5}} />`);

            assert.dom('.next-content-overlay-panel-title').hasText('A ver...');
        });

        test('a length of zero truncates everything', async function (assert) {
            await render(hbs`<Overlay::Header @title="Order 123" @titleEllipsis={{true}} @titleEllipsisLength={{0}} />`);

            assert.dom('.next-content-overlay-panel-title').hasText('...', 'zero is honoured rather than falling back to the default');
        });

        test('a minimized overlay still truncates without the argument', async function (assert) {
            this.set('overlay', { isMinimized: true });

            await render(hbs`<Overlay::Header @title="A very long order title indeed" @overlay={{this.overlay}} @titleEllipsis={{false}} />`);

            assert.dom('.next-content-overlay-panel-title').hasText('A very long ord...', 'minimizing is independent of the opt-in');
        });

        test('@titleEllipsisLength applies to a minimized overlay too', async function (assert) {
            this.set('overlay', { isMinimized: true });

            await render(hbs`<Overlay::Header @title="A very long order title indeed" @overlay={{this.overlay}} @titleEllipsisLength={{4}} />`);

            assert.dom('.next-content-overlay-panel-title').hasText('A ve...');
        });

        test('a status renders a badge', async function (assert) {
            await render(hbs`<Overlay::Header @title="Order 123" @status="dispatched" />`);

            assert.dom('.next-view-header-left .status-badge, .next-view-header-left [class*="badge"]').exists('a status badge is rendered');
        });

        test('a created date is rendered', async function (assert) {
            await render(hbs`<Overlay::Header @title="Order 123" @createdAt="2 Feb 2024" />`);

            assert.dom(HEADER).containsText('2 Feb 2024');
        });

        test('the left section can be hidden entirely', async function (assert) {
            await render(hbs`<Overlay::Header @title="Order 123" @hideLeftSection={{true}} />`);

            assert.dom('.next-view-header-left').doesNotExist();
            assert.dom('.next-view-header-right').exists('the actions area remains');
        });

        test('class hooks and splattributes are applied', async function (assert) {
            await render(hbs`
                <Overlay::Header
                    @title="Order 123"
                    @headerLeftClass="my-left"
                    @headerLeftInnerClass="my-left-inner"
                    @titleWrapperClass="my-title-wrapper"
                    @titleClass="my-title"
                    @actionsWrapperClass="my-actions"
                    data-test-header="yes"
                />
            `);

            assert.dom(HEADER).hasAttribute('data-test-header', 'yes');
            assert.dom('.next-view-header-left').hasClass('my-left');
            assert.dom('.next-view-header-left-inner').hasClass('my-left-inner');
            assert.dom('.next-view-header-left-title-wrapper').hasClass('my-title-wrapper');
            assert.dom('.next-content-overlay-panel-title').hasClass('my-title');
            assert.dom('.next-view-header-right').hasClass('my-actions');
        });
    });

    test('a block replaces the whole left section and receives the overlay', async function (assert) {
        this.set('overlay', { isMinimized: false, name: 'order-overlay' });

        await render(hbs`
            <Overlay::Header @title="ignored" @overlay={{this.overlay}} as |overlay|>
                <span class="custom">{{overlay.name}}</span>
            </Overlay::Header>
        `);

        assert.dom('.custom').hasText('order-overlay');
        assert.dom('.next-content-overlay-panel-title').doesNotExist();
    });

    test('the actions named block is rendered on the right', async function (assert) {
        await render(hbs`
            <Overlay::Header @title="Order 123">
                <:actions><button type="button" class="my-action">Do</button></:actions>
            </Overlay::Header>
        `);

        assert.dom('.next-view-header-right button.my-action').hasText('Do');
    });

    module('action buttons', function () {
        test('a plain action button is rendered and clickable', async function (assert) {
            const pressed = [];
            this.set('actionButtons', [{ text: 'Save', type: 'primary', icon: 'floppy-disk', onClick: () => pressed.push('save') }]);

            await render(hbs`<Overlay::Header @title="Order 123" @actionButtons={{this.actionButtons}} />`);
            await click('.next-view-header-right button.btn');

            assert.deepEqual(pressed, ['save']);
        });

        test('an fn callback is used when there is no onClick', async function (assert) {
            const pressed = [];
            this.set('actionButtons', [{ text: 'Save', fn: () => pressed.push('save') }]);

            await render(hbs`<Overlay::Header @title="Order 123" @actionButtons={{this.actionButtons}} />`);
            await click('.next-view-header-right button.btn');

            assert.deepEqual(pressed, ['save']);
        });

        test('a button with items becomes a dropdown', async function (assert) {
            const pressed = [];
            this.set('actionButtons', [
                {
                    text: 'More',
                    items: [{ text: 'Duplicate', icon: 'copy', onClick: () => pressed.push('duplicate') }, { separator: true }, { label: 'Archive', fn: () => pressed.push('archive') }],
                },
            ]);

            await render(hbs`<Overlay::Header @title="Order 123" @actionButtons={{this.actionButtons}} />`);
            await click('.ember-basic-dropdown-trigger');

            const items = findAll('.next-dd-item');
            assert.deepEqual(
                items.map((item) => item.textContent.trim()),
                ['Duplicate', 'Archive']
            );
            assert.dom('.next-dd-menu-seperator').exists('the separator is rendered');

            await click(items[1]);
            assert.deepEqual(pressed, ['archive']);
        });

        test('a component-backed action button is rendered', async function (assert) {
            this.set('actionButtons', [{ component: 'spinner', size: 'lg' }]);

            await render(hbs`<Overlay::Header @title="Order 123" @actionButtons={{this.actionButtons}} />`);

            assert.dom('.next-view-header-right .fleetbase-loader').exists();
        });

        test('no action buttons renders an empty actions area', async function (assert) {
            await render(hbs`<Overlay::Header @title="Order 123" />`);

            assert.dom('.next-view-header-right').exists();
            assert.dom('.next-view-header-right button').doesNotExist();
        });
    });

    module('overlay controls', function () {
        test('maximize and minimize buttons appear only when the overlay supports them', async function (assert) {
            const events = [];
            this.set('overlay', {
                onMaximize: () => {},
                onMinimize: () => {},
                maximize: () => events.push('maximize'),
                minimize: () => events.push('minimize'),
            });

            await render(hbs`<Overlay::Header @title="Order 123" @overlay={{this.overlay}} />`);

            await click('.next-content-overlay-panel-maximize-button');
            await click('.next-content-overlay-panel-minimize-button');

            assert.deepEqual(events, ['maximize', 'minimize']);
        });

        test('an overlay without those hooks renders no controls', async function (assert) {
            this.set('overlay', {});

            await render(hbs`<Overlay::Header @title="Order 123" @overlay={{this.overlay}} />`);

            assert.dom('.next-content-overlay-panel-maximize-button').doesNotExist();
            assert.dom('.next-content-overlay-panel-minimize-button').doesNotExist();
        });

        test('the control button sizes are configurable', async function (assert) {
            this.set('overlay', { onMinimize: () => {}, minimize: () => {} });

            await render(hbs`<Overlay::Header @title="Order 123" @overlay={{this.overlay}} @minimizeButtonHeight={{30}} @minimizeButtonWidth={{30}} />`);

            const button = find('.next-content-overlay-panel-minimize-button');
            assert.strictEqual(button.style.height, '30px');
            assert.strictEqual(button.style.width, '30px');
        });
    });

    module('cancelling', function () {
        test('a cancel button appears only when a handler is given', async function (assert) {
            await render(hbs`<Overlay::Header @title="Order 123" />`);

            assert.dom('.next-content-overlay-panel-cancel-button').doesNotExist();
        });

        test('cancelling hands back a closeOverlay helper that closes the panel', async function (assert) {
            let received;
            const closed = [];
            this.set('onPressCancel', (context) => {
                received = context;
            });

            await render(hbs`
                <div class="next-content-overlay is-open">
                    <Overlay::Header @title="Order 123" @onPressCancel={{this.onPressCancel}} />
                </div>
            `);
            await click('.next-content-overlay-panel-cancel-button');

            assert.ok(received, 'the handler is called');
            assert.strictEqual(typeof received.closeOverlay, 'function');

            received.closeOverlay(() => closed.push('closed'));
            assert.dom('.next-content-overlay').doesNotHaveClass('is-open', 'the panel is closed immediately');

            await settled();
            assert.deepEqual(closed, ['closed'], 'the callback runs after the close animation');
        });

        test('closeOverlay works without a callback', async function (assert) {
            let received;
            this.set('onPressCancel', (context) => {
                received = context;
            });

            await render(hbs`
                <div class="next-content-overlay is-open">
                    <Overlay::Header @title="Order 123" @onPressCancel={{this.onPressCancel}} />
                </div>
            `);
            await click('.next-content-overlay-panel-cancel-button');

            received.closeOverlay();
            await settled();

            assert.dom('.next-content-overlay').doesNotHaveClass('is-open');
        });

        test('closeOverlay outside a panel is harmless', async function (assert) {
            let received;
            this.set('onPressCancel', (context) => {
                received = context;
            });

            await render(hbs`<Overlay::Header @title="Order 123" @onPressCancel={{this.onPressCancel}} />`);
            await click('.next-content-overlay-panel-cancel-button');

            received.closeOverlay();
            await settled();

            assert.dom(HEADER).exists('nothing throws when there is no overlay to close');
        });
    });
});
