import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, triggerEvent, settled } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

/**
 * Dispatches a mouse event synchronously, without waiting for settledness, so
 * that two hover events can be delivered inside a single runloop turn. That is
 * what exercises the open/close timer cancellation branches.
 */
function dispatchMouse(element, type) {
    element.dispatchEvent(new MouseEvent(type, { bubbles: false, cancelable: true, view: window }));
}

function trigger() {
    return document.querySelector('#ember-testing .ember-basic-dropdown-trigger');
}

function content() {
    return document.querySelector('#ember-testing .ember-basic-dropdown-content');
}

module('Integration | Component | basic-dropdown-hover', function (hooks) {
    setupRenderingTest(hooks);

    test('it opens on trigger mouseenter and closes on mouseleave', async function (assert) {
        await render(hbs`
            <BasicDropdownHover @renderInPlace={{true}} @delay={{50}} as |dd|>
                <dd.Trigger class="hover-trigger">Actions</dd.Trigger>
                <dd.Content class="hover-content">Fleet actions</dd.Content>
            </BasicDropdownHover>
        `);

        assert.dom('.ember-basic-dropdown-trigger').hasText('Actions', 'the trigger renders its block');
        assert.dom('.ember-basic-dropdown-content').doesNotExist('the dropdown starts closed');
        assert.dom('.ember-basic-dropdown-trigger').hasAttribute('aria-expanded', 'false');

        await triggerEvent('.ember-basic-dropdown-trigger', 'mouseenter');

        assert.dom('.ember-basic-dropdown-content').exists('hovering the trigger opens the dropdown');
        assert.dom('.ember-basic-dropdown-content').hasText('Fleet actions', 'the content block is rendered');
        assert.dom('.ember-basic-dropdown-content').hasClass('hover-content', 'attributes still reach the content component');
        assert.dom('.ember-basic-dropdown-trigger').hasAttribute('aria-expanded', 'true');

        await triggerEvent('.ember-basic-dropdown-trigger', 'mouseleave');

        assert.dom('.ember-basic-dropdown-content').doesNotExist('leaving the trigger closes the dropdown');
        assert.dom('.ember-basic-dropdown-trigger').hasAttribute('aria-expanded', 'false');
    });

    test('it opens after the default delay when no delay arguments are given', async function (assert) {
        await render(hbs`
            <BasicDropdownHover @renderInPlace={{true}} as |dd|>
                <dd.Trigger class="hover-trigger">Actions</dd.Trigger>
                <dd.Content class="hover-content">Default delay content</dd.Content>
            </BasicDropdownHover>
        `);

        await triggerEvent('.ember-basic-dropdown-trigger', 'mouseenter');

        assert.dom('.ember-basic-dropdown-content').hasText('Default delay content', 'the built in delay still opens the dropdown');

        await triggerEvent('.ember-basic-dropdown-trigger', 'mouseleave');

        assert.dom('.ember-basic-dropdown-content').doesNotExist();
    });

    test('leaving the trigger before the open delay elapses cancels the pending open', async function (assert) {
        await render(hbs`
            <BasicDropdownHover @renderInPlace={{true}} @openDelay={{100}} @closeDelay={{100}} as |dd|>
                <dd.Trigger class="hover-trigger">Actions</dd.Trigger>
                <dd.Content class="hover-content">Fleet actions</dd.Content>
            </BasicDropdownHover>
        `);

        dispatchMouse(trigger(), 'mouseenter');
        dispatchMouse(trigger(), 'mouseleave');
        await settled();

        assert.dom('.ember-basic-dropdown-content').doesNotExist('the scheduled open was cancelled and never ran');

        await triggerEvent('.ember-basic-dropdown-trigger', 'mouseenter');

        assert.dom('.ember-basic-dropdown-content').exists('a later hover still opens the dropdown');
    });

    test('re-entering the trigger before the close delay elapses cancels the pending close', async function (assert) {
        await render(hbs`
            <BasicDropdownHover @renderInPlace={{true}} @openDelay={{50}} @closeDelay={{100}} as |dd|>
                <dd.Trigger class="hover-trigger">Actions</dd.Trigger>
                <dd.Content class="hover-content">Fleet actions</dd.Content>
            </BasicDropdownHover>
        `);

        await triggerEvent('.ember-basic-dropdown-trigger', 'mouseenter');
        assert.dom('.ember-basic-dropdown-content').exists('the dropdown is open before the cancellation sequence');

        dispatchMouse(trigger(), 'mouseleave');
        dispatchMouse(trigger(), 'mouseenter');
        await settled();

        assert.dom('.ember-basic-dropdown-content').exists('the scheduled close was cancelled so the dropdown stays open');
    });

    test('hovering the content keeps the dropdown open and leaving it closes the dropdown', async function (assert) {
        await render(hbs`
            <BasicDropdownHover @renderInPlace={{true}} @openDelay={{50}} @closeDelay={{100}} as |dd|>
                <dd.Trigger class="hover-trigger">Actions</dd.Trigger>
                <dd.Content class="hover-content">Fleet actions</dd.Content>
            </BasicDropdownHover>
        `);

        await triggerEvent('.ember-basic-dropdown-trigger', 'mouseenter');

        dispatchMouse(trigger(), 'mouseleave');
        dispatchMouse(content(), 'mouseenter');
        await settled();

        assert.dom('.ember-basic-dropdown-content').exists('moving the cursor from the trigger onto the content keeps it open');

        await triggerEvent('.ember-basic-dropdown-content', 'mouseleave');

        assert.dom('.ember-basic-dropdown-content').doesNotExist('leaving the content closes the dropdown');
    });

    test('it yields the dropdown public api alongside the hover aware components', async function (assert) {
        await render(hbs`
            <BasicDropdownHover @renderInPlace={{true}} @delay={{50}} as |dd|>
                <span class="is-open-flag">{{dd.isOpen}}</span>
                <button type="button" class="close-button" {{on "click" dd.actions.close}}>Close</button>
                <dd.Trigger class="hover-trigger">Actions</dd.Trigger>
                <dd.Content class="hover-content">Fleet actions</dd.Content>
            </BasicDropdownHover>
        `);

        assert.dom('.is-open-flag').hasText('false', 'the yielded api reports the closed state');

        await triggerEvent('.ember-basic-dropdown-trigger', 'mouseenter');

        assert.dom('.is-open-flag').hasText('true', 'the yielded api reports the open state');

        await click('.close-button');

        assert.dom('.ember-basic-dropdown-content').doesNotExist('the yielded close action still closes the dropdown');
        assert.dom('.is-open-flag').hasText('false');
    });

    test('it forwards the open and close callbacks', async function (assert) {
        const events = [];
        this.set('onOpen', () => events.push('open'));
        this.set('onClose', () => events.push('close'));

        await render(hbs`
            <BasicDropdownHover @renderInPlace={{true}} @delay={{50}} @onOpen={{this.onOpen}} @onClose={{this.onClose}} as |dd|>
                <dd.Trigger class="hover-trigger">Actions</dd.Trigger>
                <dd.Content class="hover-content">Fleet actions</dd.Content>
            </BasicDropdownHover>
        `);

        assert.deepEqual(events, [], 'no callbacks fire before interaction');

        await triggerEvent('.ember-basic-dropdown-trigger', 'mouseenter');
        assert.deepEqual(events, ['open'], '@onOpen fires when the hover opens the dropdown');

        await triggerEvent('.ember-basic-dropdown-trigger', 'mouseleave');
        assert.deepEqual(events, ['open', 'close'], '@onClose fires when the hover closes the dropdown');
    });

    test('it forwards positioning arguments to the underlying dropdown', async function (assert) {
        await render(hbs`
            <BasicDropdownHover @renderInPlace={{true}} @delay={{50}} @verticalPosition="above" @horizontalPosition="right" as |dd|>
                <dd.Trigger class="hover-trigger">Actions</dd.Trigger>
                <dd.Content class="hover-content">Fleet actions</dd.Content>
            </BasicDropdownHover>
        `);

        assert.dom('.ember-basic-dropdown').exists('@renderInPlace renders the dropdown wrapper in place');
        assert.dom('.ember-basic-dropdown-trigger').hasClass('ember-basic-dropdown-trigger--in-place');

        await triggerEvent('.ember-basic-dropdown-trigger', 'mouseenter');

        assert.dom('.ember-basic-dropdown-trigger').hasClass('ember-basic-dropdown-trigger--above', '@verticalPosition is forwarded');
        assert.dom('.ember-basic-dropdown-trigger').hasClass('ember-basic-dropdown-trigger--right', '@horizontalPosition is forwarded');
        assert.dom('.ember-basic-dropdown-content').hasClass('ember-basic-dropdown-content--above');
        assert.dom('.ember-basic-dropdown-content').hasClass('ember-basic-dropdown-content--right');
        assert.dom('.ember-basic-dropdown-content').hasClass('ember-basic-dropdown-content--in-place');
    });
});
