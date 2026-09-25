import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | layout/header/sidebar-toggle', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.sidebarService = this.owner.lookup('service:sidebar');
    });

    test('it respects the sidebar service disabled state', async function (assert) {
        this.sidebarService.disable();

        await render(hbs`<Layout::Header::SidebarToggle />`);

        assert.dom('.sidebar-toggle-button-wrapper').hasClass('disabled');
        assert.true(this.sidebarService.isHidden);

        assert.dom('.sidebar-toggle-button').isDisabled();
        assert.true(this.sidebarService.isHidden, 'the sidebar remains hidden while disabled');
    });
    module('toggling', function () {
        // The template renders `disabled={{this.isDisabled}}`, so a disabled toggle cannot be
        // clicked at all — the matching early return inside `toggleSidebar` is belt-and-braces
        // behind a door the browser already holds shut.
        test('a disabled toggle cannot be clicked', async function (assert) {
            await render(hbs`<Layout::Header::SidebarToggle @disabled={{true}} />`);

            assert.dom('button').isDisabled();
            assert.dom('.sidebar-toggle-button-wrapper').hasClass('disabled');
        });

        test('disabling the sidebar service also disables the toggle', async function (assert) {
            const sidebar = this.owner.lookup('service:sidebar');

            await render(hbs`<Layout::Header::SidebarToggle />`);
            assert.dom('button').isNotDisabled('enabled to begin with');

            sidebar.disable();
            await settled();

            assert.dom('button').isDisabled('and disabled once the service is');
        });

        test('an enabled toggle flips the sidebar and reports it', async function (assert) {
            const sidebar = this.owner.lookup('service:sidebar');
            sidebar.show();
            const reports = [];
            this.set('onToggle', (service, isVisible) => reports.push(isVisible));

            await render(hbs`<Layout::Header::SidebarToggle @onToggle={{this.onToggle}} />`);
            await click('button');

            assert.true(sidebar.isHidden, 'the sidebar closed');
            assert.deepEqual(reports, [false], 'and the caller was told what it became');
        });

        test('with no handler it still toggles', async function (assert) {
            const sidebar = this.owner.lookup('service:sidebar');
            sidebar.show();

            await render(hbs`<Layout::Header::SidebarToggle />`);
            await click('button');

            assert.true(sidebar.isHidden);
        });
    });
});
