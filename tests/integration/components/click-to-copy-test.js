import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | click-to-copy', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        // Scoped navigator.clipboard override so tests never depend on real clipboard permissions.
        this.copiedValues = [];
        this._clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
                writeText: (value) => {
                    this.copiedValues.push(value);
                    return Promise.resolve();
                },
            },
        });
    });

    hooks.afterEach(function () {
        if (this._clipboardDescriptor) {
            Object.defineProperty(navigator, 'clipboard', this._clipboardDescriptor);
        } else {
            delete navigator.clipboard;
        }
    });

    test('it renders the value with a copy prompt', async function (assert) {
        await render(hbs`<ClickToCopy @value="ORDER-12345" />`);

        assert.dom('.click-to-copy--value').hasText('ORDER-12345');
        assert.dom('.click-to-copy--tooltip').hasText('Click to copy');
    });

    test('it renders a placeholder when no value is provided', async function (assert) {
        await render(hbs`<ClickToCopy />`);

        assert.dom('.click-to-copy--value').hasText('-');
    });

    test('it yields block content in place of the value', async function (assert) {
        await render(hbs`<ClickToCopy @value="ORDER-12345"><span class="custom-label">Order number</span></ClickToCopy>`);

        assert.dom('.click-to-copy--value .custom-label').hasText('Order number');
    });

    test('it copies the value to the clipboard on click', async function (assert) {
        await render(hbs`<ClickToCopy @value="ORDER-12345" />`);
        await click('.click-to-copy');

        assert.deepEqual(this.copiedValues, ['ORDER-12345'], 'the value is written to the clipboard');
        assert.dom('.click-to-copy--tooltip').hasText('Copied!', 'tooltip confirms the copy');
    });

    test('it falls back to execCommand when the clipboard API is unavailable', async function (assert) {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
        const originalExecCommand = document.execCommand;
        const executedCommands = [];
        document.execCommand = (command) => {
            executedCommands.push(command);
            return true;
        };

        try {
            await render(hbs`<ClickToCopy @value="ORDER-12345" />`);
            await click('.click-to-copy');

            assert.deepEqual(executedCommands, ['copy'], 'the copy command is executed');
            assert.dom('.click-to-copy--tooltip').hasText('Copied!', 'tooltip confirms the copy');
        } finally {
            document.execCommand = originalExecCommand;
        }
    });
});
