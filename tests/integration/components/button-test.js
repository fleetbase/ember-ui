import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

const BUTTON = 'button.btn';

module('Integration | Component | button', function (hooks) {
    setupRenderingTest(hooks);

    let clicks;

    hooks.beforeEach(function () {
        clicks = [];
        this.set('onClick', (...args) => clicks.push(args));
    });

    module('rendering', function () {
        test('it renders a default button', async function (assert) {
            await render(hbs`<Button @text="Save" />`);

            assert.dom(BUTTON).hasText('Save');
            assert.dom(BUTTON).hasClass('btn-default', 'default is the fallback type');
            assert.dom(BUTTON).hasClass('btn-sm', 'small is the fallback size');
            assert.dom(BUTTON).hasAttribute('type', 'button');
            assert.dom('.btn-wrapper').hasClass('shadow-sm');
        });

        test('the type, size and button type are configurable', async function (assert) {
            await render(hbs`<Button @text="Delete" @type="danger" @size="lg" @buttonType="submit" />`);

            assert.dom(BUTTON).hasClass('btn-danger');
            assert.dom(BUTTON).hasClass('btn-lg');
            assert.dom(BUTTON).hasAttribute('type', 'submit');
        });

        test('a secondary button drops the shadow', async function (assert) {
            await render(hbs`<Button @text="Cancel" @type="secondary" />`);

            assert.dom('.btn-wrapper').doesNotHaveClass('shadow-sm');
        });

        test('an outline button carries the outline class', async function (assert) {
            await render(hbs`<Button @text="Save" @outline={{true}} />`);

            assert.dom(BUTTON).hasClass('btn-outline');
        });

        test('an icon is rendered beside the text', async function (assert) {
            await render(hbs`<Button @text="Save" @icon="floppy-disk" @iconClass="my-icon" />`);

            assert.dom('.btn-icon-wrapper svg').hasClass('fa-floppy-disk');
            assert.dom('.btn-icon-wrapper svg').hasClass('my-icon');
            assert.dom('.btn-icon-wrapper svg').hasClass('mr-2', 'the icon is spaced from the text');
        });

        test('an icon-only button drops the text spacing', async function (assert) {
            await render(hbs`<Button @icon="trash" />`);

            assert.dom('.btn-icon-wrapper svg').doesNotHaveClass('mr-2');
            assert.dom(BUTTON).hasText('');
        });

        test('the icon prefix is exposed for styling', async function (assert) {
            await render(hbs`<Button @icon="star" @iconPrefix="far" />`);

            assert.dom('.btn-icon-wrapper').hasAttribute('data-icon-prefix', 'far');
        });

        test('a loading button swaps the icon for a spinner', async function (assert) {
            await render(hbs`<Button @text="Saving" @icon="floppy-disk" @isLoading={{true}} />`);

            assert.dom('.btn-loading-icon-wrapper .fleetbase-loader').exists();
            assert.dom('.btn-icon-wrapper svg.fa-floppy-disk').doesNotExist('the icon gives way to the spinner');
            assert.dom(BUTTON).hasClass('btn-is-loading');
            assert.dom('.btn-wrapper').hasClass('is-loading');
        });

        test('the loader size is configurable', async function (assert) {
            await render(hbs`<Button @isLoading={{true}} @loaderWidth={{22}} @loaderHeight={{22}} />`);

            const loader = find('.fleetbase-loader');
            assert.strictEqual(loader.style.width, '22px');
            assert.strictEqual(loader.style.height, '22px');
        });

        test('a block is rendered inside the button', async function (assert) {
            await render(hbs`<Button @text="Save"><span class="badge">3</span></Button>`);

            assert.dom(`${BUTTON} .badge`).hasText('3');
            assert.dom(BUTTON).containsText('Save');
        });

        test('a hidden button renders nothing at all', async function (assert) {
            await render(hbs`<Button @text="Save" @visible={{false}} />`);

            assert.dom(BUTTON).doesNotExist();
            assert.dom(this.element).hasText('');
        });

        test('class hooks and splattributes are applied', async function (assert) {
            await render(hbs`<Button @text="Save" @wrapperClass="my-wrapper" @textClass="my-text" data-test-button="yes" />`);

            assert.dom('.btn-wrapper').hasClass('my-wrapper');
            assert.dom(`${BUTTON} span.my-text`).hasText('Save');
            assert.dom(BUTTON).hasAttribute('data-test-button', 'yes');
        });

        test('help text is offered as a tooltip', async function (assert) {
            await render(hbs`<Button @text="Save" @helpText="Persists the order" @exampleText="Ctrl+S" />`);

            assert.dom('.ember-attacher').exists();
        });

        test('onInsert is called once the button is in the DOM', async function (assert) {
            let inserted = 0;
            this.set('onInsert', () => inserted++);

            await render(hbs`<Button @text="Save" @onInsert={{this.onInsert}} />`);

            assert.strictEqual(inserted, 1);
        });
    });

    module('clicking', function () {
        test('clicking reports through onClick', async function (assert) {
            await render(hbs`<Button @text="Save" @onClick={{this.onClick}} />`);
            await click(BUTTON);

            assert.strictEqual(clicks.length, 1);
            assert.ok(clicks[0][0], 'the click event is handed on');
        });

        test('it clicks happily with no handler', async function (assert) {
            await render(hbs`<Button @text="Save" />`);
            await click(BUTTON);

            assert.dom(BUTTON).exists('no handler is required');
        });

        test('a disabled button refuses to click', async function (assert) {
            await render(hbs`<Button @text="Save" @disabled={{true}} @onClick={{this.onClick}} />`);

            assert.dom(BUTTON).isDisabled();
            assert.deepEqual(clicks, []);
        });

        test('a loading button refuses to click', async function (assert) {
            await render(hbs`<Button @text="Saving" @isLoading={{true}} @onClick={{this.onClick}} />`);

            assert.dom(BUTTON).isDisabled();
            assert.deepEqual(clicks, []);
        });
    });

    module('analytics', function (hooks) {
        let tracked;

        hooks.beforeEach(function () {
            tracked = [];
            this.owner.unregister('service:events');
            this.owner.register(
                'service:events',
                class extends Service {
                    trackEvent(...args) {
                        tracked.push(args);
                    }
                }
            );
        });

        test('a named event is tracked on click', async function (assert) {
            await render(hbs`<Button @text="Save" @eventName="order.saved" @onClick={{this.onClick}} />`);
            await click(BUTTON);

            assert.deepEqual(tracked, [['order.saved']]);
            assert.strictEqual(clicks.length, 1, 'the click handler still runs');
        });

        test('event arguments are forwarded', async function (assert) {
            this.set('eventArgs', ['ord_1', { source: 'toolbar' }]);

            await render(hbs`<Button @text="Save" @eventName="order.saved" @eventArgs={{this.eventArgs}} />`);
            await click(BUTTON);

            assert.deepEqual(tracked, [['order.saved', 'ord_1', { source: 'toolbar' }]]);
        });

        test('a button with no event name tracks nothing', async function (assert) {
            await render(hbs`<Button @text="Save" />`);
            await click(BUTTON);

            assert.deepEqual(tracked, []);
        });

        test('a disabled button tracks nothing', async function (assert) {
            await render(hbs`<Button @text="Save" @eventName="order.saved" @disabled={{true}} />`);

            assert.deepEqual(tracked, []);
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

        test('a forbidden permission disables the button and explains why', async function (assert) {
            await render(hbs`<Button @text="Save" @permission="forbidden" @onClick={{this.onClick}} />`);

            assert.dom(BUTTON).isDisabled();
            assert.dom('.ember-attacher').exists('an unauthorized tooltip is attached');
            assert.deepEqual(clicks, []);
        });

        test('an allowed permission leaves the button usable', async function (assert) {
            await render(hbs`<Button @text="Save" @permission="allowed" @onClick={{this.onClick}} />`);
            await click(BUTTON);

            assert.dom(BUTTON).isNotDisabled();
            assert.strictEqual(clicks.length, 1);
        });

        test('an explicitly disabled button skips the permission check', async function (assert) {
            await render(hbs`<Button @text="Save" @disabled={{true}} @permission="forbidden" />`);

            assert.dom(BUTTON).isDisabled();
            assert.dom('.ember-attacher').doesNotExist('the permission branch never ran');
        });

        test('gaining a permission after render re-enables the button', async function (assert) {
            this.setProperties({ permission: 'forbidden', disabled: false, visible: true });

            await render(hbs`<Button @text="Save" @permission={{this.permission}} @disabled={{this.disabled}} @visible={{this.visible}} @onClick={{this.onClick}} />`);
            assert.dom(BUTTON).isDisabled();

            this.setProperties({ permission: 'allowed', disabled: false, visible: true });
            await click(BUTTON);

            assert.dom(BUTTON).isNotDisabled();
            assert.strictEqual(clicks.length, 1, 'the did-update pass re-ran the permission check');
        });

        test('becoming hidden after render removes the button', async function (assert) {
            this.setProperties({ visible: true, disabled: false, permission: null });

            await render(hbs`<Button @text="Save" @visible={{this.visible}} @disabled={{this.disabled}} @permission={{this.permission}} />`);
            assert.dom(BUTTON).exists();

            this.setProperties({ visible: false, disabled: false, permission: null });

            assert.dom(BUTTON).doesNotExist();
        });
    });
});
