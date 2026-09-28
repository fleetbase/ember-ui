import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { helper } from '@ember/component/helper';
import uiNoopHelper from '@fleetbase/ember-ui/helpers/noop';
import noopFn from '@fleetbase/ember-ui/utils/noop';

/**
 * `noop` is also shipped by ember-composable-helpers, which wins the app tree merge in the dummy
 * app. Register this addon's helper under a unique name so these tests exercise ember-ui's source
 * rather than the shadowing implementation.
 */
function registerHelpers(owner, sink) {
    owner.register('helper:ui-noop', uiNoopHelper);
    owner.register(
        'helper:capture-value',
        helper(function ([value]) {
            sink.push(value);
            return '';
        })
    );
}

module('Integration | Helper | noop', function (hooks) {
    setupRenderingTest(hooks);

    test('it yields a callable function that returns undefined', async function (assert) {
        const captured = [];
        registerHelpers(this.owner, captured);

        await render(hbs`{{capture-value (ui-noop)}}`);

        assert.strictEqual(captured.length, 1, 'the helper produced a value');
        assert.strictEqual(typeof captured[0], 'function', 'the value is a function');
        assert.strictEqual(captured[0](), undefined, 'calling it returns undefined');
        assert.strictEqual(captured[0]('a', 1, null), undefined, 'calling it with arguments returns undefined');
    });

    test('it yields the shared noop utility itself', async function (assert) {
        const captured = [];
        registerHelpers(this.owner, captured);

        await render(hbs`{{capture-value (ui-noop)}}{{capture-value (ui-noop)}}`);

        assert.strictEqual(captured.length, 2, 'the helper was invoked twice');
        assert.strictEqual(captured[0], noopFn, 'the addon noop utility is returned');
        assert.strictEqual(captured[0], captured[1], 'both invocations yield the same function reference');
    });

    test('it can be attached as an event handler without side effects', async function (assert) {
        const captured = [];
        registerHelpers(this.owner, captured);

        await render(hbs`<button type="button" class="target" {{on "click" (ui-noop)}}>Click</button>`);

        await click('.target');
        await click('.target');

        assert.dom('.target').hasText('Click', 'the DOM is untouched by the handler');
    });

    test('it accepts and ignores any arguments passed to the helper', async function (assert) {
        const captured = [];
        registerHelpers(this.owner, captured);
        this.set('value', 'ignored');

        await render(hbs`{{capture-value (ui-noop this.value 42 foo="bar")}}`);

        assert.strictEqual(captured[0], noopFn, 'still yields the shared noop utility');
        assert.strictEqual(captured[0](), undefined, 'still returns undefined');
    });
});
