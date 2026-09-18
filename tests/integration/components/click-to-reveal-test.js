import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | click-to-reveal', function (hooks) {
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

    test('it renders blurred with a reveal button by default', async function (assert) {
        await render(hbs`<ClickToReveal @value="sk_live_secret" />`);

        assert.dom('.click-to-reveal').hasClass('is-blurred', 'value starts blurred');
        assert.dom('.click-to-reveal').doesNotHaveClass('is-visible');
        assert.dom('.click-to-reveal--hidden-value').hasText('sk_live_secret');
        assert.dom('.click-to-reveal--button button').hasText('Click to reveal');
        assert.dom('.click-to-reveal--tooltip').doesNotExist('no copy tooltip until copying is possible');
    });

    test('it reveals the value when the reveal button is clicked', async function (assert) {
        await render(hbs`<ClickToReveal @value="sk_live_secret" />`);
        await click('.click-to-reveal--button button');

        assert.dom('.click-to-reveal').hasClass('is-visible', 'value is revealed');
        assert.dom('.click-to-reveal').doesNotHaveClass('is-blurred');
    });

    test('it renders custom reveal button text', async function (assert) {
        await render(hbs`<ClickToReveal @value="sk_live_secret" @buttonText="Show key" />`);

        assert.dom('.click-to-reveal--button button').hasText('Show key');
    });

    test('it yields block content in place of the value', async function (assert) {
        await render(hbs`<ClickToReveal @value="sk_live_secret"><span class="custom-secret">****</span></ClickToReveal>`);

        assert.dom('.click-to-reveal--hidden-value .custom-secret').hasText('****');
    });

    test('it only copies after reveal when @clickToCopy is enabled', async function (assert) {
        await render(hbs`<ClickToReveal @value="sk_live_secret" @clickToCopy={{true}} />`);

        await click('.click-to-reveal');
        assert.deepEqual(this.copiedValues, [], 'nothing is copied while the value is hidden');

        await click('.click-to-reveal--button button');
        assert.dom('.click-to-reveal--tooltip').hasText('Click to copy', 'copy tooltip appears once revealed');

        await click('.click-to-reveal');
        assert.deepEqual(this.copiedValues, ['sk_live_secret'], 'revealed value is copied to the clipboard');
        assert.dom('.click-to-reveal--tooltip').hasText('Copied!', 'tooltip confirms the copy');
    });

    test('it does not copy when @clickToCopy is disabled', async function (assert) {
        await render(hbs`<ClickToReveal @value="sk_live_secret" />`);

        await click('.click-to-reveal--button button');
        await click('.click-to-reveal');

        assert.deepEqual(this.copiedValues, [], 'nothing is copied when clickToCopy is off');
        assert.dom('.click-to-reveal--tooltip').doesNotExist('no copy tooltip is rendered');
    });

    test('it reads clickToCopy and wrapperClass from a table column definition', async function (assert) {
        this.set('column', {
            cellComponentArgs: {
                clickToCopy: true,
                wrapperClass: 'cell-reveal',
            },
        });

        await render(hbs`<ClickToReveal @value="sk_live_secret" @column={{this.column}} />`);

        assert.dom('.click-to-reveal').hasClass('cell-reveal', 'wrapper class comes from the column definition');

        await click('.click-to-reveal--button button');
        await click('.click-to-reveal');

        assert.deepEqual(this.copiedValues, ['sk_live_secret'], 'clickToCopy from the column definition enables copying');
    });

    // A column that declares cellComponentArgs but sets neither option falls back to the
    // component's own defaults rather than to undefined.
    test('a column with empty cell component args falls back to the defaults', async function (assert) {
        this.set('column', { cellComponentArgs: {} });

        await render(hbs`<ClickToReveal @value="sk_live_secret" @column={{this.column}} />`);

        assert.dom('.click-to-reveal').doesNotHaveClass('cell-reveal', 'no wrapper class is applied');

        await click('.click-to-reveal--button button');
        await click('.click-to-reveal');

        assert.deepEqual(this.copiedValues, [], 'and copying stays off');
    });
});
