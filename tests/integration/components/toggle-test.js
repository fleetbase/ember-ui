import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

const SWITCH = '[role="checkbox"]';

function track() {
    return find(`${SWITCH} span[aria-hidden="true"]`);
}

module('Integration | Component | toggle', function (hooks) {
    setupRenderingTest(hooks);

    let toggles;

    hooks.beforeEach(function () {
        toggles = [];
        this.set('onToggle', (isToggled) => toggles.push(isToggled));
    });

    module('rendering', function () {
        test('it renders an off switch by default', async function (assert) {
            await render(hbs`<Toggle />`);

            assert.dom(SWITCH).exists();
            assert.dom(SWITCH).hasAttribute('aria-checked', 'false');
            assert.dom(track()).hasClass('bg-gray-200', 'the track is grey when off');
        });

        test('@isToggled turns it on and colours the track', async function (assert) {
            await render(hbs`<Toggle @isToggled={{true}} />`);

            assert.dom(SWITCH).hasAttribute('aria-checked', 'true');
            assert.dom(track()).hasClass('bg-green-400', 'green is the default active colour');
        });

        test('the active colour is configurable', async function (assert) {
            await render(hbs`<Toggle @isToggled={{true}} @activeColor="blue" />`);

            assert.dom(track()).hasClass('bg-blue-400');
        });

        test('a label is rendered beside the switch', async function (assert) {
            await render(hbs`<Toggle @label="Live tracking" @labelClass="my-label" />`);

            assert.dom('.my-label').hasText('Live tracking');
        });

        test('a block is rendered beside the switch', async function (assert) {
            await render(hbs`<Toggle><b class="custom">Custom</b></Toggle>`);

            assert.dom('.custom').hasText('Custom');
        });

        test('a hidden toggle renders nothing at all', async function (assert) {
            await render(hbs`<Toggle @visible={{false}} @label="Live tracking" />`);

            assert.dom(SWITCH).doesNotExist();
            assert.dom(this.element).hasText('');
        });

        test('a disabled toggle is dimmed and flagged', async function (assert) {
            await render(hbs`<Toggle @disabled={{true}} />`);

            assert.dom(SWITCH).hasClass('opacity-50');
            // Glimmer renders a `true` attribute value as a valueless attribute.
            assert.dom(SWITCH).hasAttribute('data-disabled', '', 'the switch is flagged disabled');
        });

        test('wrapper class and splattributes are applied', async function (assert) {
            await render(hbs`<Toggle @wrapperClass="my-wrapper" data-test-toggle="yes" />`);

            assert.dom('.my-wrapper').exists();
            assert.dom(SWITCH).hasAttribute('data-test-toggle', 'yes');
        });

        test('help text is offered as a tooltip', async function (assert) {
            await render(hbs`<Toggle @helpText="Shares your location" @exampleText="every 30s" />`);

            assert.dom('.ember-attacher').exists();
        });
    });

    module('toggling', function () {
        test('clicking turns it on and reports the new state', async function (assert) {
            await render(hbs`<Toggle @onToggle={{this.onToggle}} />`);
            await click(SWITCH);

            assert.deepEqual(toggles, [true]);
            assert.dom(SWITCH).hasAttribute('aria-checked', 'true');
        });

        test('clicking again turns it back off', async function (assert) {
            await render(hbs`<Toggle @onToggle={{this.onToggle}} />`);
            await click(SWITCH);
            await click(SWITCH);

            assert.deepEqual(toggles, [true, false]);
            assert.dom(SWITCH).hasAttribute('aria-checked', 'false');
        });

        test('it toggles happily with no handler', async function (assert) {
            await render(hbs`<Toggle />`);
            await click(SWITCH);

            assert.dom(SWITCH).hasAttribute('aria-checked', 'true');
        });

        test('a disabled toggle refuses to change', async function (assert) {
            await render(hbs`<Toggle @disabled={{true}} @onToggle={{this.onToggle}} />`);
            await click(SWITCH);

            assert.deepEqual(toggles, []);
            assert.dom(SWITCH).hasAttribute('aria-checked', 'false');
        });

        test('a controlled toggle follows its argument', async function (assert) {
            this.set('isToggled', false);

            await render(hbs`<Toggle @isToggled={{this.isToggled}} @onToggle={{this.onToggle}} />`);
            assert.dom(SWITCH).hasAttribute('aria-checked', 'false');

            this.set('isToggled', true);
            assert.dom(SWITCH).hasAttribute('aria-checked', 'true', 'the argument drives the rendered state');
        });

        test('becoming disabled after render stops further toggling', async function (assert) {
            this.setProperties({ isToggled: false, disabled: false });

            await render(hbs`<Toggle @isToggled={{this.isToggled}} @disabled={{this.disabled}} @onToggle={{this.onToggle}} />`);
            await click(SWITCH);
            assert.deepEqual(toggles, [true]);

            this.setProperties({ isToggled: true, disabled: true });
            await click(SWITCH);

            assert.deepEqual(toggles, [true], 'the did-update pass applied the new disabled state');
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

        test('a forbidden permission disables the toggle and explains why', async function (assert) {
            await render(hbs`<Toggle @permission="forbidden" @onToggle={{this.onToggle}} />`);
            await click(SWITCH);

            assert.dom(SWITCH).hasClass('opacity-50');
            assert.dom('.ember-attacher').exists('an unauthorized tooltip is attached');
            assert.deepEqual(toggles, []);
        });

        test('an allowed permission leaves the toggle usable', async function (assert) {
            await render(hbs`<Toggle @permission="allowed" @onToggle={{this.onToggle}} />`);
            await click(SWITCH);

            assert.deepEqual(toggles, [true]);
        });
    });
});
