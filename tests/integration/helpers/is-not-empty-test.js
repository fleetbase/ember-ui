import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import ArrayProxy from '@ember/array/proxy';
import { A } from '@ember/array';

module('Integration | Helper | is-not-empty', function (hooks) {
    setupRenderingTest(hooks);

    test('it is true for a non-empty string', async function (assert) {
        this.set('subject', 'Fleetbase');

        await render(hbs`{{is-not-empty this.subject}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it is false for an empty string', async function (assert) {
        this.set('subject', '');

        await render(hbs`{{is-not-empty this.subject}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is true for a whitespace only string', async function (assert) {
        this.set('subject', '   ');

        await render(hbs`{{is-not-empty this.subject}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it is false for null and undefined', async function (assert) {
        this.set('subject', null);

        await render(hbs`{{is-not-empty this.subject}}|{{is-not-empty this.missing}}`);

        assert.dom(this.element).hasText('false|false');
    });

    test('it is false for an empty array', async function (assert) {
        this.set('subject', []);

        await render(hbs`{{is-not-empty this.subject}}`);

        assert.dom(this.element).hasText('false');
    });

    test('it is true for a populated array', async function (assert) {
        this.set('subject', ['a']);

        await render(hbs`{{is-not-empty this.subject}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it unwraps an ArrayProxy to determine emptiness', async function (assert) {
        this.set('empty', ArrayProxy.create({ content: A([]) }));
        this.set('populated', ArrayProxy.create({ content: A(['a']) }));

        await render(hbs`{{is-not-empty this.empty}}|{{is-not-empty this.populated}}`);

        assert.dom(this.element).hasText('false|true');
    });

    test('it is true for numbers including zero', async function (assert) {
        this.set('zero', 0);
        this.set('negative', -1);

        await render(hbs`{{is-not-empty this.zero}}|{{is-not-empty this.negative}}`);

        assert.dom(this.element).hasText('true|true');
    });

    test('it is true for booleans including false', async function (assert) {
        this.set('subject', false);

        await render(hbs`{{is-not-empty this.subject}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it is true for an empty object because objects have no length', async function (assert) {
        this.set('subject', {});

        await render(hbs`{{is-not-empty this.subject}}`);

        assert.dom(this.element).hasText('true');
    });

    test('it is false for an object that reports a zero length', async function (assert) {
        this.set('subject', { length: 0 });

        await render(hbs`{{is-not-empty this.subject}}`);

        assert.dom(this.element).hasText('false');
    });
});
