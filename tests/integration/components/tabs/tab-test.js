import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const TAB = '.nav-item';
const LINK = '.nav-item .nav-link';
const PANE = '#tab-destination .tab-pane';

module('Integration | Component | tabs/tab', function (hooks) {
    setupRenderingTest(hooks);

    let clicks;
    let created;

    hooks.beforeEach(function () {
        clicks = [];
        created = [];
        this.set('title', 'Order details');
        this.set('onClick', (tabName) => clicks.push(tabName));
        this.set('onCreated', (tabName) => created.push(tabName));
    });

    const TEMPLATE = hbs`
        <div id="tab-destination"></div>
        <ul>
            <Tabs::Tab
                @title={{this.title}}
                @tabsId="tab-destination"
                @activeTab={{this.activeTab}}
                @activeTabClass={{this.activeTabClass}}
                @activePaneClass={{this.activePaneClass}}
                @tabClass={{this.tabClass}}
                @tabListItemClass={{this.tabListItemClass}}
                @onClick={{this.onClick}}
                @onCreated={{this.onCreated}}
            >
                Details content
            </Tabs::Tab>
        </ul>
    `;

    module('rendering', function () {
        test('it renders a tab labelled by its title', async function (assert) {
            await render(TEMPLATE);

            assert.dom(LINK).hasText('Order details');
            assert.dom(TAB).doesNotHaveClass('active', 'an unselected tab is not marked');
        });

        test('an unselected tab renders no pane', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find(PANE), null, 'the content stays out of the document');
        });

        test('the selected tab is marked and renders its pane into the tabs container', async function (assert) {
            this.set('activeTab', 'order-details');

            await render(TEMPLATE);

            assert.dom(TAB).hasClass('active');
            assert.dom(LINK).hasClass('active');
            assert.dom(PANE).exists('the pane is wormholed into the tabs container');
            assert.dom(PANE).containsText('Details content');
            assert.dom(PANE).hasClass('active');
        });

        test('a tab is identified by its dasherized title', async function (assert) {
            this.set('title', 'Proof Of Delivery');
            this.set('activeTab', 'proof-of-delivery');

            await render(TEMPLATE);

            assert.dom(TAB).hasClass('active');
        });

        test('the wrong active tab leaves this one alone', async function (assert) {
            this.set('activeTab', 'some-other-tab');

            await render(TEMPLATE);

            assert.dom(TAB).doesNotHaveClass('active');
            assert.strictEqual(find(PANE), null);
        });

        test('extra classes are applied to the tab, link and pane', async function (assert) {
            this.setProperties({
                activeTab: 'order-details',
                tabListItemClass: 'my-item',
                tabClass: 'my-link',
                activeTabClass: 'my-active-link',
                activePaneClass: 'my-active-pane',
            });

            await render(TEMPLATE);

            assert.dom(TAB).hasClass('my-item');
            assert.dom(LINK).hasClass('my-link');
            assert.dom(LINK).hasClass('my-active-link');
            assert.dom(PANE).hasClass('my-active-pane');
        });

        test('the pane forwards splattributes', async function (assert) {
            await render(hbs`
                <div id="tab-destination"></div>
                <Tabs::Tab @title="Order details" @tabsId="tab-destination" @activeTab="order-details" data-test-pane="yes">content</Tabs::Tab>
            `);

            assert.dom(PANE).hasAttribute('data-test-pane', 'yes');
        });
    });

    module('reporting', function () {
        test('it announces itself once created', async function (assert) {
            await render(TEMPLATE);

            assert.deepEqual(created, ['order-details'], 'the parent learns the tab name');
        });

        test('clicking the tab reports its name', async function (assert) {
            await render(TEMPLATE);
            await click(LINK);

            assert.deepEqual(clicks, ['order-details']);
        });

        test('it renders and clicks happily without handlers', async function (assert) {
            await render(hbs`
                <div id="tab-destination"></div>
                <Tabs::Tab @title="Order details" @tabsId="tab-destination">content</Tabs::Tab>
            `);
            await click(LINK);

            assert.dom(LINK).hasText('Order details', 'the tab survives');
        });
    });
});
