import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// The measured target uses content-box with a known padding/margin so that
// offsetWidth is deterministic: 300 (content) + 10 (padding-left) = 310.

module('Integration | Modifier | set-max-width', function (hooks) {
    setupRenderingTest(hooks);

    test('it defaults to a max width of 100%', async function (assert) {
        await render(hbs`<div style="width: 400px;"><div data-test-el {{set-max-width}}></div></div>`);

        assert.strictEqual(find('[data-test-el]').style.maxWidth, '100%', 'max width defaults to 100%');
    });

    test('it uses a literal value when the argument starts with a digit', async function (assert) {
        this.set('to', '250px');

        await render(hbs`<div data-test-el {{set-max-width this.to}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.maxWidth, '250px', 'literal pixel values are used as-is');
        assert.dom('[data-test-el]').hasStyle({ maxWidth: '250px' }, 'computed max width matches the literal value');
    });

    test('it measures another element when the argument is a selector, excluding spacing by default', async function (assert) {
        this.set('to', '#smw-target');

        await render(hbs`
            <div id="smw-target" style="box-sizing: content-box; width: 300px; padding-left: 10px; margin-left: 5px; height: 10px;"></div>
            <div data-test-el {{set-max-width this.to}}></div>
        `);

        assert.strictEqual(find('#smw-target').offsetWidth, 310, 'sanity: measured target is 310px wide including padding');
        assert.strictEqual(find('[data-test-el]').style.maxWidth, '295px', 'max width is the target offsetWidth minus its left padding and left margin');
    });

    test('it includes padding and margin when includeSpacing is true', async function (assert) {
        this.set('to', '#smw-target');

        await render(hbs`
            <div id="smw-target" style="box-sizing: content-box; width: 300px; padding-left: 10px; margin-left: 5px; height: 10px;"></div>
            <div data-test-el {{set-max-width this.to true}}></div>
        `);

        assert.strictEqual(find('[data-test-el]').style.maxWidth, '310px', 'max width is the full offsetWidth of the target');
    });

    test('it updates when the argument changes', async function (assert) {
        this.set('to', '120px');

        await render(hbs`
            <div id="smw-target" style="box-sizing: content-box; width: 300px; padding-left: 10px; margin-left: 5px; height: 10px;"></div>
            <div data-test-el {{set-max-width this.to}}></div>
        `);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.maxWidth, '120px', 'initial literal value applied');

        this.set('to', '#smw-target');
        await settled();
        assert.strictEqual(element.style.maxWidth, '295px', 'switching to a selector measures the target element');

        this.set('to', '60%');
        await settled();
        assert.strictEqual(element.style.maxWidth, '60%', 'switching back to a literal value applies it');
    });

    test('it leaves the max width unset when the selector matches nothing', async function (assert) {
        this.set('to', '#smw-does-not-exist');

        await render(hbs`<div data-test-el {{set-max-width this.to}}></div>`);

        assert.strictEqual(find('[data-test-el]').style.maxWidth, '', 'no max width is applied when the target is missing');
        assert.dom('[data-test-el]').hasStyle({ maxWidth: 'none' }, 'element keeps the default max width');
    });
});
