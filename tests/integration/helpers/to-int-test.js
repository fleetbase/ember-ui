import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | to-int', function (hooks) {
    setupRenderingTest(hooks);

    test('it parses a numeric string', async function (assert) {
        this.set('value', '42');

        await render(hbs`{{to-int this.value}}`);

        assert.dom(this.element).hasText('42');
    });

    test('it strips non numeric characters before parsing', async function (assert) {
        this.set('currency', '$1,234');
        this.set('mixed', '12 units');

        await render(hbs`{{to-int this.currency}}|{{to-int this.mixed}}`);

        assert.dom(this.element).hasText('1234|12');
    });

    test('it drops decimal points so the fraction is concatenated', async function (assert) {
        this.set('value', '10.50');

        await render(hbs`{{to-int this.value}}`);

        assert.dom(this.element).hasText('1050');
    });

    test('it drops the minus sign so negative strings become positive', async function (assert) {
        this.set('value', '-5');

        await render(hbs`{{to-int this.value}}`);

        assert.dom(this.element).hasText('5');
    });

    test('it strips leading zeros', async function (assert) {
        this.set('value', '007');

        await render(hbs`{{to-int this.value}}`);

        assert.dom(this.element).hasText('7');
    });

    test('it passes numbers straight through to parseInt', async function (assert) {
        this.set('integer', 42);
        this.set('float', 10.9);
        this.set('zero', 0);
        this.set('negative', -7);

        await render(hbs`{{to-int this.integer}}|{{to-int this.float}}|{{to-int this.zero}}|{{to-int this.negative}}`);

        assert.dom(this.element).hasText('42|10|0|-7');
    });

    test('it yields NaN for strings without digits', async function (assert) {
        this.set('word', 'abc');
        this.set('empty', '');
        this.set('whitespace', '   ');

        await render(hbs`{{to-int this.word}}|{{to-int this.empty}}|{{to-int this.whitespace}}`);

        assert.dom(this.element).hasText('NaN|NaN|NaN');
    });

    test('it yields NaN for null, undefined and booleans', async function (assert) {
        this.set('nullValue', null);
        this.set('bool', true);

        await render(hbs`{{to-int this.nullValue}}|{{to-int this.missing}}|{{to-int this.bool}}`);

        assert.dom(this.element).hasText('NaN|NaN|NaN');
    });

    test('it parses digits out of exponential notation as plain digits', async function (assert) {
        this.set('value', '1e3');

        await render(hbs`{{to-int this.value}}`);

        assert.dom(this.element).hasText('13');
    });

    test('it handles digit strings beyond the safe integer range', async function (assert) {
        this.set('value', '9007199254740993');

        await render(hbs`{{to-int this.value}}`);

        assert.dom(this.element).hasText('9007199254740992', 'the value is clamped to the nearest representable number');
    });

    test('it extracts digits from unicode and formatted strings', async function (assert) {
        this.set('value', '第4号-2024');

        await render(hbs`{{to-int this.value}}`);

        assert.dom(this.element).hasText('42024');
    });
});
