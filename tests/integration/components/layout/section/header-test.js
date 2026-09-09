import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, triggerKeyEvent, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import Evented from '@ember/object/evented';

class MobileMediaStub extends Service.extend(Evented) {
    isMobile = true;
}

const HEADER = '#next-view-section-subheader';

module('Integration | Component | layout/section/header', function (hooks) {
    setupRenderingTest(hooks);

    module('the default header', function () {
        test('it renders the title', async function (assert) {
            await render(hbs`<Layout::Section::Header @title="Orders" />`);

            assert.dom(HEADER).exists();
            assert.dom('#next-view-section-subheader-title').hasText('Orders');
        });

        test('a subtitle is rendered beside the title', async function (assert) {
            await render(hbs`<Layout::Section::Header @title="Orders" @subtitle="50 results" @subtitleClass="my-subtitle" />`);

            assert.dom('.my-subtitle').hasText('50 results');
        });

        test('no subtitle renders nothing extra', async function (assert) {
            await render(hbs`<Layout::Section::Header @title="Orders" />`);

            assert.dom('#next-view-section-subheader-title').hasText('Orders');
            assert.dom('.next-view-section-subheader-left-inner-wrapper > div').doesNotExist('no subtitle element');
        });

        test('an icon is rendered before the title', async function (assert) {
            await render(hbs`<Layout::Section::Header @title="Orders" @icon="box" @iconClass="my-icon" @iconSize="lg" />`);

            assert.dom('.next-view-section-subheader-left svg').hasClass('fa-box');
            assert.dom('.next-view-section-subheader-left svg').hasClass('my-icon');
            assert.dom('.next-view-section-subheader-left svg').hasClass('fa-lg');
        });

        test('a badge is rendered before the title', async function (assert) {
            await render(hbs`<Layout::Section::Header @title="Orders" @badge="dispatched" @badgeContainerClass="my-badge-container" />`);

            assert.dom('.my-badge-container').exists();
            assert.dom('.my-badge-container').containsText('Dispatched', 'the status is humanized');
        });

        test('badge humanization can be switched off', async function (assert) {
            await render(hbs`<Layout::Section::Header @title="Orders" @badge="in_transit" @disableBadgeHumanize={{true}} />`);

            assert.dom(HEADER).containsText('in_transit');
        });

        test('no badge renders no badge container', async function (assert) {
            await render(hbs`<Layout::Section::Header @title="Orders" />`);

            assert.dom('.next-view-section-subheader-left-inner-wrapper span').doesNotExist();
        });

        test('it is not marked as mobile on a desktop', async function (assert) {
            await render(hbs`<Layout::Section::Header @title="Orders" />`);

            assert.dom(HEADER).doesNotHaveClass('is-mobile');
        });

        test('class hooks and splattributes are applied', async function (assert) {
            await render(hbs`<Layout::Section::Header @title="Orders" @leftSubheaderClass="my-left" @titleClass="my-title" data-test-header="yes" />`);

            assert.dom(HEADER).hasAttribute('data-test-header', 'yes');
            assert.dom('#next-view-section-subheader-left').hasClass('my-left');
            assert.dom('#next-view-section-subheader-title').hasClass('my-title');
        });
    });

    module('the actions area', function () {
        test('the block is rendered in place beside the title', async function (assert) {
            await render(hbs`<Layout::Section::Header @title="Orders"><button type="button" class="my-action">New</button></Layout::Section::Header>`);

            assert.dom('#next-view-section-subheader-actions button.my-action').hasText('New');
        });

        test('the actions area can be hidden entirely', async function (assert) {
            await render(hbs`<Layout::Section::Header @title="Orders" @hideActions={{true}}><button type="button" class="my-action">New</button></Layout::Section::Header>`);

            assert.dom(HEADER).hasClass('actions-hidden');
            assert.dom('.my-action').doesNotExist();
        });

        test('an actions wrapper class is applied', async function (assert) {
            await render(hbs`<Layout::Section::Header @title="Orders" @actionsWrapperClass="my-actions" />`);

            assert.dom('#next-view-section-subheader-actions').hasClass('my-actions');
        });

        test('the actions can be wormholed to another destination', async function (assert) {
            await render(hbs`
                <div id="elsewhere"></div>
                <Layout::Section::Header @title="Orders" @actionsRenderDestination="elsewhere">
                    <button type="button" class="my-action">New</button>
                </Layout::Section::Header>
            `);

            assert.dom('#elsewhere button.my-action').exists('the actions land in the destination element');
            assert.dom(`${HEADER} button.my-action`).doesNotExist('and not in the header itself');
        });
    });

    module('search', function () {
        test('no search input is rendered without a handler', async function (assert) {
            await render(hbs`<Layout::Section::Header @title="Orders" />`);

            assert.dom('input').doesNotExist();
        });

        test('a search handler renders an input whose placeholder pluralizes the title', async function (assert) {
            this.set('onSearch', () => {});

            await render(hbs`<Layout::Section::Header @title="Order" @onSearch={{this.onSearch}} />`);

            assert.dom('input').exists();
            assert.dom('input').hasAttribute('placeholder', 'common.search Orders');
            assert.dom('input').hasAttribute('aria-label', 'common.search-input');
        });

        test('the placeholder can be overridden', async function (assert) {
            this.set('onSearch', () => {});

            await render(hbs`<Layout::Section::Header @title="Order" @onSearch={{this.onSearch}} @searchPlaceholder="Find an order" />`);

            assert.dom('input').hasAttribute('placeholder', 'Find an order');
        });

        test('typing reports each keystroke', async function (assert) {
            const events = [];
            this.set('onSearch', (event) => events.push(event.target.value));

            await render(hbs`<Layout::Section::Header @title="Orders" @onSearch={{this.onSearch}} />`);

            find('input').value = 'ord';
            await triggerKeyEvent('input', 'keyup', 'D');

            assert.deepEqual(events, ['ord']);
        });

        test('the search input can be disabled and restyled', async function (assert) {
            this.set('onSearch', () => {});

            await render(hbs`<Layout::Section::Header @title="Orders" @onSearch={{this.onSearch}} @searchDisabled={{true}} @searchInputClass="my-search" />`);

            assert.dom('input').isDisabled();
            assert.dom('input').hasClass('my-search');
        });
    });

    module('component overrides', function () {
        test('a header component replaces the whole header body', async function (assert) {
            await render(hbs`<Layout::Section::Header @title="Orders" @headerComponent="spinner" />`);

            assert.dom(`${HEADER} .fleetbase-loader`).exists();
            assert.dom('#next-view-section-subheader-left').doesNotExist();
            assert.dom('#next-view-section-subheader-actions').doesNotExist('even the actions area is replaced');
        });

        test('a header title component replaces only the title block', async function (assert) {
            await render(hbs`<Layout::Section::Header @title="Orders" @headerTitleComponent="spinner" />`);

            assert.dom('#next-view-section-subheader-left .fleetbase-loader').exists();
            assert.dom('#next-view-section-subheader-title').doesNotExist();
            assert.dom('#next-view-section-subheader-actions').exists('the actions area survives');
        });
    });

    module('on mobile', function (hooks) {
        hooks.beforeEach(function () {
            this.owner.unregister('service:media');
            this.owner.register('service:media', MobileMediaStub);
        });

        test('the header is marked as mobile', async function (assert) {
            await render(hbs`<Layout::Section::Header @title="Orders" />`);

            assert.dom(HEADER).hasClass('is-mobile');
        });
    });
});
