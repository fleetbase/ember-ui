import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const BLOCK = '.ui-input-info-block';

module('Integration | Component | info-block', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders informational text with the default type, size and icon', async function (assert) {
        await render(hbs`<InfoBlock @text="Orders sync every 5 minutes." />`);

        assert.dom(BLOCK).hasClass('info');
        assert.dom(BLOCK).hasClass('base');
        assert.dom(`${BLOCK} svg`).hasClass('fa-circle-info');
        assert.dom('.ui-input-info-block-text').hasText('Orders sync every 5 minutes.');
    });

    test('the type, size and icon can all be overridden', async function (assert) {
        await render(hbs`<InfoBlock @type="warning" @size="sm" @icon="triangle-exclamation" @text="Careful" />`);

        assert.dom(BLOCK).hasClass('warning');
        assert.dom(BLOCK).hasClass('sm');
        assert.dom(`${BLOCK} svg`).hasClass('fa-triangle-exclamation');
    });

    test('example text is rendered as code beside the message', async function (assert) {
        await render(hbs`<InfoBlock @text="Use an ISO date" @exampleText="2024-01-31" />`);

        assert.dom(`${BLOCK} code`).hasText('2024-01-31');
    });

    test('no example text renders no code element', async function (assert) {
        await render(hbs`<InfoBlock @text="Plain" />`);

        assert.dom(`${BLOCK} code`).doesNotExist();
    });

    test('a block replaces the text and example', async function (assert) {
        await render(hbs`<InfoBlock @text="ignored" @exampleText="ignored"><b class="custom">Custom</b></InfoBlock>`);

        assert.dom('.ui-input-info-block-text .custom').hasText('Custom');
        assert.dom(BLOCK).doesNotContainText('ignored');
        assert.dom(`${BLOCK} code`).doesNotExist();
    });

    test('every class hook and splattribute is applied', async function (assert) {
        await render(hbs`
            <InfoBlock
                @text="Text"
                @exampleText="Example"
                @innerWrapperClass="my-inner"
                @iconWrapperClass="my-icon-wrapper"
                @iconClass="my-icon"
                @blockContainerClass="my-block-container"
                @blockClass="my-block"
                @textClass="my-text"
                @exampleTextWrapperClass="my-example-wrapper"
                @exampleTextClass="my-example"
                data-test-info="yes"
            />
        `);

        assert.dom(BLOCK).hasAttribute('data-test-info', 'yes');
        assert.dom('.ui-input-info-block-inner').hasClass('my-inner');
        assert.dom('.ui-input-info-block-icon-container').hasClass('my-icon-wrapper');
        assert.dom(`${BLOCK} svg`).hasClass('my-icon');
        assert.dom('.ui-input-info-block-yield-container').hasClass('my-block-container');
        assert.dom('.ui-input-info-block-text').hasClass('my-block');
        assert.dom('.ui-input-info-block-text span').hasClass('my-text');
        assert.dom(`${BLOCK} code`).hasClass('my-example');
    });
});
