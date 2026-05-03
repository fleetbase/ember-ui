import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
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
});
