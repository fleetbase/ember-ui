import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const BODY = '.next-content-overlay-panel-body';
const INNER = '.next-content-overlay-panel-body-inner-wrapper';

module('Integration | Component | overlay/body', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders its block inside an inner wrapper', async function (assert) {
        await render(hbs`<Overlay::Body><span class="inside">details</span></Overlay::Body>`);

        assert.dom(`${BODY} ${INNER} .inside`).hasText('details');
    });

    test('a wrapper class is applied to the inner wrapper', async function (assert) {
        await render(hbs`<Overlay::Body @wrapperClass="p-4" />`);

        assert.dom(INNER).hasClass('p-4');
    });

    test('the inner height can be increased', async function (assert) {
        await render(hbs`<Overlay::Body @increaseInnerBodyHeightBy={{100}} />`);

        assert.ok(find(INNER).style.height, 'an explicit height is written onto the inner wrapper');
    });

    test('it forwards splattributes to the outer body', async function (assert) {
        await render(hbs`<Overlay::Body class="overflow-y-auto" data-test-body="yes" />`);

        assert.dom(BODY).hasClass('overflow-y-auto');
        assert.dom(BODY).hasAttribute('data-test-body', 'yes');
    });
});
