import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find, clearRender } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/foot', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a footer once it is ready', async function (assert) {
        await render(hbs`<table><Table::Foot><tr><td class="total">50 results</td></tr></Table::Foot></table>`);

        assert.dom('tfoot').exists('the footer appears after the deferred readiness pass');
        assert.dom('tfoot td.total').hasText('50 results');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<table><Table::Foot class="pinned" data-test-foot="yes" /></table>`);

        assert.dom('tfoot').hasClass('pinned');
        assert.dom('tfoot').hasAttribute('data-test-foot', 'yes');
    });

    test('an explicit vertical offset is applied verbatim', async function (assert) {
        await render(hbs`<table><Table::Foot @tfootVerticalOffset={{120}} /></table>`);

        assert.strictEqual(find('tfoot').style.bottom, '120px', 'the supplied offset positions the footer');
    });

    test('with no offset it measures the surrounding chrome itself', async function (assert) {
        // calculateTableFooterVerticalOffset() measures offsetHeight, so the header needs a real
        // height. An inline style is the only way to give it one inside a rendering test.
        await render(hbs`
            {{! template-lint-disable no-inline-styles }}
            <div class="next-table-wrapper">
                <table>
                    <thead><tr><th style="height: 30px">Name</th></tr></thead>
                    <Table::Foot />
                </table>
            </div>
        `);

        const bottom = parseInt(find('tfoot').style.bottom, 10);
        assert.true(bottom >= 4, `a measured offset of ${bottom}px includes the header height plus the constant`);
    });

    test('offset elements can be supplied directly', async function (assert) {
        this.set('elements', ['.next-table-wrapper > table > thead']);

        await render(hbs`<table><Table::Foot @tfootVerticalOffsetElements={{this.elements}} /></table>`);

        assert.dom('tfoot').exists('supplying elements skips the self-measurement branch');
    });

    test('tearing the table down before it is ready does not throw', async function (assert) {
        render(hbs`<table><Table::Foot /></table>`);
        await clearRender();

        assert.dom('tfoot').doesNotExist('the pending readiness timer is cancelled on destroy');
    });
});
