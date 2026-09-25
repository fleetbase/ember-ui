import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/wrap', function (hooks) {
    setupRenderingTest(hooks);

    test('it wraps its block in the table wrapper element', async function (assert) {
        await render(hbs`<Table::Wrap><table class="inner"><tbody><tr><td>cell</td></tr></tbody></table></Table::Wrap>`);

        assert.dom('.next-table-wrapper').exists();
        assert.dom('.next-table-wrapper > table.inner td').hasText('cell');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Table::Wrap class="extra" data-test-wrap="yes" />`);

        assert.dom('.next-table-wrapper').hasClass('extra');
        assert.dom('.next-table-wrapper').hasAttribute('data-test-wrap', 'yes');
    });
});
