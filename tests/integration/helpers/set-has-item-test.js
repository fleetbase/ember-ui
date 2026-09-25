import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | set-has-item', function (hooks) {
    setupRenderingTest(hooks);

    test('it is true when the set contains the key', async function (assert) {
        this.set('collection', new Set(['a', 'b']));

        await render(hbs`{{set-has-item this.collection "a"}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it is false when the set does not contain the key', async function (assert) {
        this.set('collection', new Set(['a', 'b']));

        await render(hbs`{{set-has-item this.collection "c"}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is false for an empty set', async function (assert) {
        this.set('collection', new Set());

        await render(hbs`{{set-has-item this.collection "a"}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it uses identity rather than equality for object members', async function (assert) {
        const member = { id: 1 };
        this.set('collection', new Set([member]));
        this.set('member', member);
        this.set('lookalike', { id: 1 });

        await render(hbs`{{set-has-item this.collection this.member}}|{{set-has-item this.collection this.lookalike}}`);

        assert.dom(this.element).hasText('true|false');
    });

    test('it matches falsy members exactly', async function (assert) {
        this.set('collection', new Set([0, false, '', null]));
        this.set('zeroString', '0');

        await render(hbs`
            {{set-has-item this.collection 0}}|{{set-has-item this.collection false}}|{{set-has-item this.collection ""}}|{{set-has-item this.collection this.zeroString}}
        `);

        assert.strictEqual(this.element.textContent.trim(), 'true|true|true|false');
    });

    test('it matches NaN using SameValueZero semantics', async function (assert) {
        this.set('collection', new Set([NaN]));
        this.set('notANumber', NaN);

        await render(hbs`{{set-has-item this.collection this.notANumber}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it works with a Map as well as a Set', async function (assert) {
        this.set('collection', new Map([['a', 1]]));

        await render(hbs`{{set-has-item this.collection "a"}}|{{set-has-item this.collection "b"}}`);

        assert.dom(this.element).hasText('true|false');
    });

    test('it renders nothing when the collection is null or undefined', async function (assert) {
        this.set('collection', null);

        await render(hbs`{{set-has-item this.collection "a"}}{{set-has-item this.missing "a"}}`);

        assert.dom(this.element).hasNoText();
    });

    test('it renders nothing when the collection has no has method', async function (assert) {
        this.set('collection', { a: true });

        await render(hbs`{{set-has-item this.collection "a"}}`);

        assert.dom(this.element).hasNoText();
    });

    test('it recomputes when the collection argument is replaced', async function (assert) {
        this.set('collection', new Set());

        await render(hbs`<span class="state">{{set-has-item this.collection "order_1"}}</span>`);
        assert.dom('.state').hasText('false', 'not a member initially');

        this.set('collection', new Set(['order_1']));
        await settled();
        assert.dom('.state').hasText('true', 'a member of the replacement set');

        this.set('collection', new Set(['order_2']));
        await settled();
        assert.dom('.state').hasText('false', 'not a member of the next replacement set');
    });
});
