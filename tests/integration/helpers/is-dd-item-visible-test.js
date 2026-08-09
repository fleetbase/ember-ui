import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | is-dd-item-visible', function (hooks) {
    setupRenderingTest(hooks);

    test('an explicit false hides the item even with no context', async function (assert) {
        this.set('context', null);
        this.set('isVisible', false);

        await render(hbs`{{is-dd-item-visible this.context this.isVisible}}`);

        assert.dom(this.element).hasText('false');
    });

    test('an explicit false hides the item when a context is present', async function (assert) {
        this.set('context', { id: 'order_1' });
        this.set('isVisible', false);

        await render(hbs`{{is-dd-item-visible this.context this.isVisible}}`);

        assert.dom(this.element).hasText('false');
    });

    test('a predicate with no context leaves the item visible rather than being invoked', async function (assert) {
        let called = 0;
        this.set('context', null);
        this.set('isVisible', () => {
            called++;
            return false;
        });

        await render(hbs`{{is-dd-item-visible this.context this.isVisible}}`);

        assert.dom(this.element).hasText('true');
        assert.strictEqual(called, 0, 'the predicate is never handed a missing context');
    });

    test('it is visible when the context is undefined', async function (assert) {
        await render(hbs`{{is-dd-item-visible this.missingContext this.missingVisibility}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it defaults to visible when no visibility argument is supplied', async function (assert) {
        this.set('context', { id: 'order_1' });

        await render(hbs`{{is-dd-item-visible this.context}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it treats an explicit boolean true as visible', async function (assert) {
        this.set('context', { id: 'order_1' });

        await render(hbs`{{is-dd-item-visible this.context true}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it evaluates a visibility function against the context', async function (assert) {
        this.set('context', { id: 'order_1', canView: true });
        this.set('isVisible', (context) => context.canView);

        await render(hbs`{{is-dd-item-visible this.context this.isVisible}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it hides the item when the visibility function returns false', async function (assert) {
        this.set('context', { id: 'order_1', canView: false });
        this.set('isVisible', (context) => context.canView);

        await render(hbs`{{is-dd-item-visible this.context this.isVisible}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it passes the context through to the visibility function', async function (assert) {
        const received = [];
        const context = { id: 'order_1' };
        this.set('context', context);
        this.set('isVisible', (given) => {
            received.push(given);
            return true;
        });

        await render(hbs`{{is-dd-item-visible this.context this.isVisible}}`);

        assert.strictEqual(received.length, 1, 'the visibility function is invoked once');
        assert.strictEqual(received[0], context, 'the visibility function receives the context');
    });

    test('it coerces a non-boolean, non-function visibility value to visible', async function (assert) {
        this.set('context', { id: 'order_1' });
        this.set('isVisible', 'yes');

        await render(hbs`{{is-dd-item-visible this.context this.isVisible}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it treats a falsy visibility value as visible even when a context is present', async function (assert) {
        this.set('context', { id: 'order_1' });
        this.set('isVisible', 0);

        await render(hbs`{{is-dd-item-visible this.context this.isVisible}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it gates conditional template blocks', async function (assert) {
        this.set('context', { id: 'order_1', canView: false });
        this.set('isVisible', (context) => context.canView);

        await render(hbs`
            {{#if (is-dd-item-visible this.context this.isVisible)}}
                <span class="dd-item">visible</span>
            {{/if}}
        `);

        assert.dom('.dd-item').doesNotExist();
    });
});
