import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

const BOX = 'input[type="checkbox"]';

module('Integration | Component | checkbox', function (hooks) {
    setupRenderingTest(hooks);

    let toggles;
    let changes;

    hooks.beforeEach(function () {
        toggles = [];
        changes = [];
        this.set('onToggle', (checked, target) => toggles.push({ checked, target }));
        this.set('onChange', (checked, event) => changes.push({ checked, event }));
    });

    module('rendering', function () {
        test('it renders an unchecked checkbox by default', async function (assert) {
            await render(hbs`<Checkbox />`);

            assert.dom(BOX).exists();
            assert.dom(BOX).isNotChecked();
            assert.dom(BOX).hasClass('fleetbase-checkbox');
            assert.dom(BOX).hasClass('text-sky-500', 'the default colour class is applied');
        });

        test('@value seeds the checked state', async function (assert) {
            await render(hbs`<Checkbox @value={{true}} />`);

            assert.dom(BOX).isChecked();
        });

        test('@checked wins over @value', async function (assert) {
            await render(hbs`<Checkbox @value={{true}} @checked={{false}} />`);

            assert.dom(BOX).isNotChecked();
        });

        test('a label is rendered and points at the input', async function (assert) {
            await render(hbs`<Checkbox @label="Notify me" @labelClass="my-label" />`);

            assert.dom('label').hasText('Notify me');
            assert.dom('label').hasClass('my-label');
            assert.strictEqual(find('label').getAttribute('for'), find(BOX).id, 'the label is wired to the input');
        });

        test('a block replaces the label argument', async function (assert) {
            await render(hbs`<Checkbox @label="ignored"><b class="custom">Custom</b></Checkbox>`);

            assert.dom('label .custom').hasText('Custom');
            assert.dom('label').doesNotContainText('ignored');
        });

        test('with neither a label nor a block no label is rendered', async function (assert) {
            await render(hbs`<Checkbox />`);

            assert.dom('label').doesNotExist();
        });

        test('an explicit id is used verbatim', async function (assert) {
            await render(hbs`<Checkbox @id="notify-me" @label="Notify me" />`);

            assert.dom(BOX).hasAttribute('id', 'notify-me');
            assert.dom('label').hasAttribute('for', 'notify-me');
        });

        test('the checked state is mirrored onto data attributes', async function (assert) {
            await render(hbs`<Checkbox @value={{true}} />`);

            // Glimmer renders a `true` attribute value as a valueless attribute.
            assert.dom(BOX).hasAttribute('data-checked', '', 'a checked box is flagged');
            assert.dom(BOX).hasAttribute('data-value', '', 'a checked box carries its value');

            await render(hbs`<Checkbox @value={{false}} />`);

            assert.dom(BOX).doesNotHaveAttribute('data-checked', 'an unchecked box drops the flag');
            assert.dom(BOX).doesNotHaveAttribute('data-value');
        });

        test('a hidden checkbox renders nothing at all', async function (assert) {
            await render(hbs`<Checkbox @visible={{false}} @label="Notify me" />`);

            assert.dom(BOX).doesNotExist();
            assert.dom(this.element).hasText('');
        });

        test('wrapper, input classes and splattributes are applied', async function (assert) {
            await render(hbs`<Checkbox @wrapperClass="my-wrapper" @inputClass="my-input" data-test-checkbox="yes" />`);

            assert.dom('.my-wrapper').exists();
            assert.dom(BOX).hasClass('my-input');
            assert.dom(BOX).hasAttribute('data-test-checkbox', 'yes');
        });

        test('help text is offered as a tooltip', async function (assert) {
            await render(hbs`<Checkbox @helpText="Sends an email" @exampleText="daily" />`);

            assert.dom('.ember-attacher').exists('a tooltip is attached');
        });
    });

    module('toggling', function () {
        test('clicking reports the new state to both handlers', async function (assert) {
            await render(hbs`<Checkbox @onToggle={{this.onToggle}} @onChange={{this.onChange}} />`);
            await click(BOX);

            assert.dom(BOX).isChecked();
            assert.strictEqual(toggles.length, 1);
            assert.true(toggles[0].checked);
            assert.strictEqual(toggles[0].target, find(BOX), 'onToggle receives the input element');
            assert.strictEqual(changes.length, 1);
            assert.true(changes[0].checked);
            assert.ok(changes[0].event, 'onChange receives the DOM event');
        });

        test('clicking a checked box reports false', async function (assert) {
            await render(hbs`<Checkbox @value={{true}} @onToggle={{this.onToggle}} />`);
            await click(BOX);

            assert.dom(BOX).isNotChecked();
            assert.false(toggles[0].checked);
        });

        test('it toggles happily with no handlers', async function (assert) {
            await render(hbs`<Checkbox />`);
            await click(BOX);

            assert.dom(BOX).isChecked('no handler is required');
        });

        test('a disabled checkbox cannot be toggled', async function (assert) {
            await render(hbs`<Checkbox @disabled={{true}} @onToggle={{this.onToggle}} />`);

            assert.dom(BOX).isDisabled();
            assert.deepEqual(toggles, []);
        });

        test('changing @value re-syncs the checked state', async function (assert) {
            this.set('value', false);

            await render(hbs`<Checkbox @value={{this.value}} />`);
            assert.dom(BOX).isNotChecked();

            this.set('value', true);
            assert.dom(BOX).isChecked('the tracked update re-syncs the input');
        });
    });

    module('permissions', function (hooks) {
        hooks.beforeEach(function () {
            this.owner.unregister('service:abilities');
            this.owner.register(
                'service:abilities',
                class extends Service {
                    cannot(permission) {
                        return permission === 'forbidden';
                    }
                }
            );
        });

        test('a forbidden permission disables the checkbox and explains why', async function (assert) {
            await render(hbs`<Checkbox @permission="forbidden" @onToggle={{this.onToggle}} />`);

            assert.dom(BOX).isDisabled();
            assert.dom('.ember-attacher').exists('an unauthorized tooltip is attached');
            assert.deepEqual(toggles, []);
        });

        test('an allowed permission leaves the checkbox usable', async function (assert) {
            await render(hbs`<Checkbox @permission="allowed" @onToggle={{this.onToggle}} />`);

            assert.dom(BOX).isNotDisabled();
            await click(BOX);
            assert.true(toggles[0].checked);
        });

        test('an explicitly disabled checkbox skips the permission check entirely', async function (assert) {
            await render(hbs`<Checkbox @disabled={{true}} @permission="allowed" />`);

            assert.dom(BOX).isDisabled();
        });
    });
    // `{{did-update this.trackValue @value}}` destructures with a default, which only applies
    // when the argument changes *to* undefined — clearing a previously set value.
    test('clearing @value unchecks the box rather than leaving it checked', async function (assert) {
        this.set('value', true);

        await render(hbs`<Checkbox @value={{this.value}} />`);
        assert.dom(BOX).isChecked('checked to begin with');

        this.set('value', undefined);
        await settled();

        assert.dom(BOX).isNotChecked('a cleared value falls back to unchecked');
    });
});
