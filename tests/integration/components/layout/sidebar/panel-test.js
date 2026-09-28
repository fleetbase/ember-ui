import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

function registerAbilities(owner, { permitted = true } = {}) {
    owner.unregister('service:abilities');
    owner.register(
        'service:abilities',
        class extends Service {
            can() {
                return permitted;
            }
            cannot() {
                return !permitted;
            }
        }
    );
}

module('Integration | Component | layout/sidebar/panel', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        registerAbilities(this.owner);
        this.set('title', 'Vehicles');
    });

    // The clickable toggle is the anchor inside the panel header, not the header itself.
    const TOGGLE = '.next-sidebar-panel-toggle a.next-content-panel-header-left';

    const TEMPLATE = hbs`
        <Layout::Sidebar::Panel
            @title={{this.title}}
            @titleIcon={{this.titleIcon}}
            @open={{this.open}}
            @visible={{this.visible}}
            @disabled={{this.disabled}}
            @permission={{this.permission}}
            @wrapperClass={{this.wrapperClass}}
            @containerClass={{this.containerClass}}
        >
            <div class="panel-body">Panel content</div>
        </Layout::Sidebar::Panel>
    `;

    module('rendering', function () {
        test('it renders a titled sidebar panel', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.next-sidebar-panel-container').exists();
            assert.dom('.next-sidebar-panel').exists();
            assert.dom('.next-sidebar-panel-toggle').containsText('Vehicles');
        });

        test('a title icon can be shown', async function (assert) {
            this.set('titleIcon', 'truck');

            await render(TEMPLATE);

            assert.dom('.next-sidebar-panel-toggle svg.fa-truck').exists();
        });

        test('the panel is closed by default and can be opened', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find('.panel-body'), null, 'the body starts hidden');

            await click(TOGGLE);
            assert.dom('.panel-body').hasText('Panel content');
        });

        test('the panel can start open', async function (assert) {
            this.set('open', true);

            await render(TEMPLATE);

            assert.dom('.panel-body').hasText('Panel content');
        });

        test('extra wrapper and container classes are appended', async function (assert) {
            this.setProperties({ wrapperClass: 'my-wrapper', containerClass: 'my-container' });

            await render(TEMPLATE);

            assert.dom('.next-sidebar-panel-container.my-wrapper').exists();
            assert.dom('.next-sidebar-panel.my-container').exists();
        });

        test('splattributes reach the rendered panel', async function (assert) {
            await render(hbs`<Layout::Sidebar::Panel @title="Vehicles" data-test-panel="yes" />`);

            assert.dom('.next-sidebar-panel-container').exists('the panel still renders');
            assert.dom('[data-test-panel="yes"]').exists('and the attribute lands on it');
        });
    });

    module('visibility', function () {
        test('a hidden panel renders nothing at all', async function (assert) {
            this.set('visible', false);

            await render(TEMPLATE);

            assert.strictEqual(find('.next-sidebar-panel-container'), null);
            assert.dom(this.element).hasText('');
        });

        test('a panel is visible by default', async function (assert) {
            await render(hbs`<Layout::Sidebar::Panel @title="Vehicles" />`);

            assert.dom('.next-sidebar-panel-container').exists();
        });
    });

    module('permissions', function () {
        test('a panel with no permission requirement is usable', async function (assert) {
            await render(TEMPLATE);
            await click(TOGGLE);

            assert.dom('.panel-body').exists('the panel opens');
        });

        test('a permitted panel is usable', async function (assert) {
            registerAbilities(this.owner, { permitted: true });
            this.set('permission', 'view vehicles');

            await render(TEMPLATE);
            await click(TOGGLE);

            assert.dom('.panel-body').exists('the panel opens');
        });

        test('a forbidden panel is dimmed and stays shut', async function (assert) {
            registerAbilities(this.owner, { permitted: false });
            this.set('permission', 'view vehicles');

            await render(TEMPLATE);

            assert.dom(TOGGLE).hasClass('opacity-50', 'the toggle is dimmed');

            await click(TOGGLE);
            assert.dom('.panel-body').doesNotExist('the protected content is not revealed');
        });

        test('a permitted panel still opens', async function (assert) {
            registerAbilities(this.owner, { permitted: true });
            this.set('permission', 'view vehicles');

            await render(TEMPLATE);
            await click(TOGGLE);

            assert.dom('.panel-body').exists('permission granted means the panel works normally');
        });

        test('an explicitly disabled panel is dimmed and stays shut', async function (assert) {
            this.setProperties({ disabled: true, permission: 'view vehicles' });

            await render(TEMPLATE);

            assert.dom(TOGGLE).hasClass('opacity-50', 'the toggle is dimmed');

            await click(TOGGLE);
            assert.dom('.panel-body').doesNotExist('the panel does not open');
        });
    });
});
