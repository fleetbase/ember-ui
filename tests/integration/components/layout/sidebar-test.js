import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | layout/sidebar', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.sidebarService = this.owner.lookup('service:sidebar');
    });

    test('it registers with the sidebar service and initializes visible state', async function (assert) {
        await render(hbs`<Layout::Sidebar />`);

        assert.true(this.sidebarService.hasContext);
        assert.true(this.sidebarService.isVisible);
        assert.false(this.sidebarService.isHidden);
        assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-hidden');
    });

    test('it initializes hidden state when rendered with @hide', async function (assert) {
        await render(hbs`<Layout::Sidebar @hide={{true}} />`);

        assert.true(this.sidebarService.isHidden);
        assert.dom('nav.next-sidebar').hasClass('sidebar-hidden');
    });

    test('it initializes hidden state when the sidebar service is disabled', async function (assert) {
        this.sidebarService.disable();

        await render(hbs`<Layout::Sidebar />`);

        assert.true(this.sidebarService.isDisabled);
        assert.true(this.sidebarService.isHidden);
        assert.dom('nav.next-sidebar').hasClass('sidebar-hidden');
    });

    test('service-driven state changes stay aligned with DOM classes', async function (assert) {
        await render(hbs`<Layout::Sidebar />`);

        this.sidebarService.minimize();
        assert.true(this.sidebarService.isMinimized);
        assert.dom('nav.next-sidebar').hasClass('sidebar-minimized');
        assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-hidden');

        this.sidebarService.show();
        assert.true(this.sidebarService.isVisible);
        assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-minimized');
        assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-hidden');

        this.sidebarService.hideNow();
        assert.true(this.sidebarService.isHidden);
        assert.dom('nav.next-sidebar').hasClass('sidebar-hidden');

        this.sidebarService.show();
        this.sidebarService.hide();
        assert.true(this.sidebarService.isHidden, 'service updates immediately during animated hide');
        assert.dom('nav.next-sidebar').hasClass('sidebar-hide');

        await settled();

        assert.dom('nav.next-sidebar').hasClass('sidebar-hidden');
        assert.dom('nav.next-sidebar').doesNotHaveClass('sidebar-hide');
    });

    test('it clears the registered context on teardown', async function (assert) {
        this.set('isRendered', true);

        await render(hbs`
          {{#if this.isRendered}}
            <Layout::Sidebar />
          {{/if}}
        `);

        assert.true(this.sidebarService.hasContext);

        this.set('isRendered', false);
        await settled();

        assert.false(this.sidebarService.hasContext);
    });
});
