import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const BAR = '[role="progressbar"] > div';

module('Integration | Component | progress-bar', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<ProgressBar @title={{this.title}} @percent={{this.percent}} />`;

    test('it renders a titled progress bar', async function (assert) {
        this.setProperties({ title: 'Uploading', percent: 40 });

        await render(TEMPLATE);

        assert.dom('h3').hasText('Uploading');
        assert.dom('[role="progressbar"]').exists();
        assert.dom('[role="progressbar"] ~ *, [role="progressbar"]').exists();
    });

    test('it reports the percentage in words and to assistive technology', async function (assert) {
        this.setProperties({ title: 'Uploading', percent: 40 });

        await render(TEMPLATE);

        assert.dom('span').hasText('40%');
        assert.dom('[role="progressbar"]').hasAttribute('aria-valuenow', '40');
        assert.dom('[role="progressbar"]').hasAttribute('aria-valuemin', '0');
        assert.dom('[role="progressbar"]').hasAttribute('aria-valuemax', '100');
    });

    test('the filled portion tracks the percentage as it changes', async function (assert) {
        this.setProperties({ title: 'Uploading', percent: 40 });

        await render(TEMPLATE);
        this.set('percent', 75);
        await new Promise((resolve) => setTimeout(resolve, 0));

        assert.strictEqual(find(BAR).style.width, '75%', 'the bar is redrawn when the percentage changes');
        assert.dom('[role="progressbar"]').hasAttribute('aria-valuenow', '75');
    });

    test('a completed bar fills entirely', async function (assert) {
        this.setProperties({ title: 'Uploading', percent: 0 });

        await render(TEMPLATE);
        this.set('percent', 100);
        await new Promise((resolve) => setTimeout(resolve, 0));

        assert.strictEqual(find(BAR).style.width, '100%');
    });

    test('it renders with no arguments at all', async function (assert) {
        await render(hbs`<ProgressBar />`);

        assert.dom('[role="progressbar"]').exists();
        assert.dom('span').hasText('%', 'an unknown percentage renders as a bare unit');
    });
});
