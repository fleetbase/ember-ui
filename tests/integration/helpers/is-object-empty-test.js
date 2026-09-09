import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | is-object-empty', function (hooks) {
    setupRenderingTest(hooks);

    test('it is true for an empty object', async function (assert) {
        this.set('subject', {});

        await render(hbs`{{is-object-empty this.subject}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it is false for an object with keys', async function (assert) {
        this.set('subject', { name: 'Fleetbase' });

        await render(hbs`{{is-object-empty this.subject}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is false for an object whose only value is undefined', async function (assert) {
        this.set('subject', { name: undefined });

        await render(hbs`{{is-object-empty this.subject}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it does not recognize a template hash as a plain object, even an empty one', async function (assert) {
        // `{{hash}}` produces an object whose constructor is not `Object`, so the helper reports it
        // as non-empty regardless of its keys.
        await render(hbs`{{is-object-empty (hash)}}|{{is-object-empty (hash a=1)}}`);

        assert.dom(this.element).hasText('false|false');
    });

    test('it is true for null and undefined', async function (assert) {
        this.set('subject', null);

        await render(hbs`{{is-object-empty this.subject}}|{{is-object-empty this.missing}}`);

        assert.dom(this.element).hasText('true|true');
    });

    test('it is true for blank strings', async function (assert) {
        this.set('empty', '');
        this.set('whitespace', '   ');

        await render(hbs`{{is-object-empty this.empty}}|{{is-object-empty this.whitespace}}`);

        assert.dom(this.element).hasText('true|true');
    });

    test('it is false for a non blank string', async function (assert) {
        this.set('subject', 'Fleetbase');

        await render(hbs`{{is-object-empty this.subject}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is true for an empty array and false for a populated array', async function (assert) {
        this.set('empty', []);
        this.set('populated', [1]);

        await render(hbs`{{is-object-empty this.empty}}|{{is-object-empty this.populated}}`);

        assert.dom(this.element).hasText('true|false');
    });

    test('it is false for non plain objects even when they have no own keys', async function (assert) {
        this.set('date', new Date(0));
        this.set('nullProto', Object.create(null));

        await render(hbs`{{is-object-empty this.date}}|{{is-object-empty this.nullProto}}`);

        assert.dom(this.element).hasText('false|false');
    });

    test('it treats a collection that reports a zero size as empty', async function (assert) {
        // `isBlank` short circuits on anything exposing a numeric `size`, so an empty Map/Set is
        // reported as empty while a populated one falls through to the plain object check.
        this.set('emptyMap', new Map());
        this.set('populatedMap', new Map([['a', 1]]));
        this.set('emptySet', new Set());

        await render(hbs`{{is-object-empty this.emptyMap}}|{{is-object-empty this.populatedMap}}|{{is-object-empty this.emptySet}}`);

        assert.dom(this.element).hasText('true|false|true');
    });

    test('it is false for numbers including zero', async function (assert) {
        this.set('zero', 0);
        this.set('negative', -12.5);

        await render(hbs`{{is-object-empty this.zero}}|{{is-object-empty this.negative}}`);

        assert.dom(this.element).hasText('false|false');
    });
});
