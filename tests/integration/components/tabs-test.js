import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function tabLinks() {
    return findAll('.nav-tabs .nav-link');
}

function tabLabels() {
    return tabLinks().map((link) => link.textContent.trim());
}

module('Integration | Component | tabs', function (hooks) {
    setupRenderingTest(hooks);

    let clicked;
    let created;

    hooks.beforeEach(function () {
        clicked = [];
        created = [];
        this.set('onClick', (name) => clicked.push(name));
        this.set('onTabClick', (name) => clicked.push(`also:${name}`));
        this.set('onTabCreated', (name) => created.push(name));
    });

    const TEMPLATE = hbs`
        <Tabs @onClick={{this.onClick}} @onTabClick={{this.onTabClick}} @onTabCreated={{this.onTabCreated}} @tagContentClass="my-content" as |Tab|>
            <Tab @title="Details"><p class="details">Details pane</p></Tab>
            <Tab @title="Activity"><p class="activity">Activity pane</p></Tab>
        </Tabs>
    `;

    test('it renders a nav item per tab', async function (assert) {
        await render(TEMPLATE);

        assert.dom('.ui-tabs').exists();
        assert.deepEqual(tabLabels(), ['Details', 'Activity']);
    });

    test('the first tab created becomes active and only its pane is rendered', async function (assert) {
        await render(TEMPLATE);

        assert.dom(tabLinks()[0].closest('.nav-item')).hasClass('active');
        assert.dom(tabLinks()[1].closest('.nav-item')).doesNotHaveClass('active');
        assert.dom('.details').exists();
        assert.dom('.activity').doesNotExist();
    });

    test('every tab reports its creation', async function (assert) {
        await render(TEMPLATE);

        assert.deepEqual(created, ['details', 'activity'], 'tabs are identified by their dasherized title');
    });

    test('choosing a tab swaps the pane and reports it to both handlers', async function (assert) {
        await render(TEMPLATE);
        await click(tabLinks()[1]);

        assert.dom('.activity').exists();
        assert.dom('.details').doesNotExist();
        assert.deepEqual(clicked, ['activity', 'also:activity']);
    });

    test('the active pane is wormholed into the tab content element', async function (assert) {
        await render(TEMPLATE);

        const content = find('.tab-content');
        assert.dom(content).hasClass('my-content');
        assert.ok(content.querySelector('.details'), 'the pane renders inside the content element');
        assert.strictEqual(find('.ui-tab-pane').getAttribute('role'), 'tabpanel');
    });

    test('it works without any handlers', async function (assert) {
        await render(hbs`
            <Tabs as |Tab|>
                <Tab @title="One"><p class="one">One</p></Tab>
                <Tab @title="Two"><p class="two">Two</p></Tab>
            </Tabs>
        `);

        await click(tabLinks()[1]);

        assert.dom('.two').exists('no handler is required');
    });

    test('a tabs component with no tabs renders an empty list', async function (assert) {
        await render(hbs`<Tabs />`);

        assert.dom('.ui-tabs .nav-tabs').exists();
        assert.deepEqual(tabLabels(), []);
        assert.dom('.tab-content').exists();
    });
});
