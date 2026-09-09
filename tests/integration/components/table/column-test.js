import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/column', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders only its block', async function (assert) {
        await render(hbs`<Table::Column><span class="inside">Driver</span></Table::Column>`);

        assert.dom('.inside').hasText('Driver');
    });

    test('with no block it renders nothing', async function (assert) {
        await render(hbs`<div class="host"><Table::Column /></div>`);

        assert.dom('.host').hasText('', 'the component contributes no markup of its own');
    });
});
