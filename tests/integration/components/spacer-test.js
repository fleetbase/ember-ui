import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const SPACER = '.x-fleetbase-spacer';

module('Integration | Component | spacer', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a bare spacer with no inline styling', async function (assert) {
        await render(hbs`<Spacer />`);

        assert.dom(SPACER).exists();
        assert.strictEqual(find(SPACER).getAttribute('style'), null, 'nothing is styled without arguments');
    });

    test('every string argument becomes an inline style', async function (assert) {
        await render(hbs`<Spacer @height="24px" @width="100%" />`);

        assert.strictEqual(find(SPACER).style.height, '24px');
        assert.strictEqual(find(SPACER).style.width, '100%');
    });

    test('a dasherized argument is camelized into its css property', async function (assert) {
        await render(hbs`<Spacer @margin-top="8px" />`);

        assert.strictEqual(find(SPACER).style.marginTop, '8px', 'margin-top is applied');
    });

    test('a numeric argument is applied too', async function (assert) {
        await render(hbs`<Spacer @flexGrow={{1}} />`);

        assert.strictEqual(find(SPACER).style.flexGrow, '1');
    });

    test('a non-string, non-numeric argument is ignored', async function (assert) {
        await render(hbs`<Spacer @height="10px" @onSomething={{this.noop}} />`);

        assert.strictEqual(find(SPACER).style.height, '10px', 'the usable argument still applies');
    });

    test('it yields its block', async function (assert) {
        await render(hbs`<Spacer><span class="inside">held</span></Spacer>`);

        assert.dom(`${SPACER} .inside`).hasText('held');
    });
});
