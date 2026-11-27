import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, triggerKeyEvent, triggerEvent, focus } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { setupShellStubs } from '../../../helpers/shell-stubs';

const TRIGGER = '.fb-chrome-menu-trigger';

module('Integration | Component | layout/chrome-menu', function (hooks) {
    setupRenderingTest(hooks);
    setupShellStubs(hooks);

    hooks.beforeEach(function () {
        this.items = [
            { label: 'Orders', route: 'console.fleet-ops.orders', description: 'All orders' },
            { separator: true },
            { label: 'Drivers', route: 'console.fleet-ops.drivers', checked: true },
            { label: 'Archived', disabled: true, checked: false },
        ];
    });

    test('closed, it renders only the trigger with its label and caret', async function (assert) {
        await render(hbs`<Layout::ChromeMenu @label="Fleet-Ops" @items={{this.items}} @triggerClass="crumb" class="extra" />`);

        assert.dom('.fb-chrome-menu').hasClass('extra').hasClass('is-align-left');
        assert.dom(TRIGGER).hasClass('crumb').hasAttribute('aria-haspopup', 'menu').hasAttribute('aria-expanded', 'false').containsText('Fleet-Ops');
        assert.dom('.fb-chrome-menu-caret').exists();
        assert.dom('[role="menu"]').doesNotExist();
    });

    test('opening lists the items, focuses the first and marks checked items as radios', async function (assert) {
        await render(hbs`<Layout::ChromeMenu @label="Fleet-Ops" @items={{this.items}} @align="right" />`);
        await click(TRIGGER);

        assert.dom('.fb-chrome-menu').hasClass('is-open').hasClass('is-align-right');
        assert.dom(TRIGGER).hasAttribute('aria-expanded', 'true');
        assert.dom('[role="menu"]').hasAttribute('aria-label', 'Fleet-Ops');
        assert.dom('[role="separator"]').exists({ count: 1 });
        assert.dom('[role="menuitem"]').exists({ count: 1 });
        assert.dom('[role="menuitemradio"]').exists({ count: 2 });
        assert.dom('[role="menuitemradio"][aria-checked="true"]').containsText('Drivers');
        assert.dom('[role="menuitemradio"][aria-checked="false"]').isDisabled();
        assert.dom('.fb-chrome-menu-item-description').hasText('All orders');
        assert.dom('[role="menuitem"]').isFocused('focus moves into the menu');
    });

    test('choosing an item closes the menu and navigates to it', async function (assert) {
        await render(hbs`<Layout::ChromeMenu @label="Fleet-Ops" @items={{this.items}} />`);
        await click(TRIGGER);
        await click('[role="menuitem"]');

        assert.dom('[role="menu"]').doesNotExist();
        assert.deepEqual(this.router.transitions, [['console.fleet-ops.orders', { queryParams: {} }]]);
    });

    test('@onSelect replaces the default handling', async function (assert) {
        const chosen = [];
        this.onSelect = (item) => chosen.push(item.label);
        await render(hbs`<Layout::ChromeMenu @label="Fleet-Ops" @items={{this.items}} @onSelect={{this.onSelect}} />`);
        await click(TRIGGER);
        await click('[role="menuitemradio"][aria-checked="true"]');

        assert.deepEqual(chosen, ['Drivers']);
        assert.deepEqual(this.router.transitions, []);
    });

    test('clicking the trigger again closes it, and so does a click outside', async function (assert) {
        await render(hbs`<button type="button" class="outside">x</button><Layout::ChromeMenu @label="Fleet-Ops" @items={{this.items}} />`);

        await click(TRIGGER);
        await click(TRIGGER);
        assert.dom('[role="menu"]').doesNotExist('toggled closed');

        await click(TRIGGER);
        await triggerEvent('[role="menu"]', 'mousedown');
        assert.dom('[role="menu"]').exists('a press inside keeps it open');

        await triggerEvent('.outside', 'mousedown');
        assert.dom('[role="menu"]').doesNotExist('a press outside closes it');
    });

    test('arrow keys, Home and End move between items; Escape closes and returns focus', async function (assert) {
        await render(hbs`<Layout::ChromeMenu @label="Fleet-Ops" @items={{this.items}} />`);
        await click(TRIGGER);

        await triggerKeyEvent('[role="menu"]', 'keydown', 'ArrowDown');
        assert.dom('[role="menuitemradio"][aria-checked="true"]').isFocused();
        await triggerKeyEvent('[role="menu"]', 'keydown', 'ArrowUp');
        assert.dom('[role="menuitem"]').isFocused();
        await triggerKeyEvent('[role="menu"]', 'keydown', 'End');
        assert.dom('[role="menuitemradio"][aria-checked="false"]').exists('the last item is disabled and cannot take focus');
        await triggerKeyEvent('[role="menu"]', 'keydown', 'Home');
        assert.dom('[role="menuitem"]').isFocused();

        await triggerKeyEvent('[role="menu"]', 'keydown', 'Tab');
        assert.dom('[role="menu"]').exists('other keys are left alone');

        await triggerKeyEvent('[role="menu"]', 'keydown', 'Escape');
        assert.dom('[role="menu"]').doesNotExist();
        assert.dom(TRIGGER).isFocused();
    });

    test('ArrowDown on the closed trigger opens it; other keys and Escape while closed do nothing', async function (assert) {
        await render(hbs`<Layout::ChromeMenu @label="Fleet-Ops" @items={{this.items}} />`);
        await focus(TRIGGER);

        await triggerKeyEvent(TRIGGER, 'keydown', 'Escape');
        await triggerKeyEvent(TRIGGER, 'keydown', 'ArrowUp');
        assert.dom('[role="menu"]').doesNotExist();

        await triggerKeyEvent(TRIGGER, 'keydown', 'ArrowDown');
        assert.dom('[role="menu"]').exists();
    });

    test('a menu without items renders an empty list', async function (assert) {
        await render(hbs`<Layout::ChromeMenu @label="Empty" />`);
        await click(TRIGGER);

        assert.dom('[role="menu"] li').doesNotExist();
    });

    test('custom trigger and panel blocks', async function (assert) {
        await render(hbs`
            <Layout::ChromeMenu @ariaLabel="Account" @title="Ron">
                <:trigger><span class="initials">RR</span></:trigger>
                <:panel as |menu|>
                    <input type="text" class="field" />
                    <div role="group">
                        <button type="button" class="pick" role="menuitem" {{on "click" (fn menu.select (hash label="Pick" action=this.pick))}}>Pick</button>
                        <button type="button" class="done" role="menuitem" {{on "click" menu.close}}>Done</button>
                    </div>
                </:panel>
            </Layout::ChromeMenu>
        `);

        assert.dom(TRIGGER).hasAttribute('aria-haspopup', 'dialog').hasAttribute('aria-label', 'Account').hasAttribute('title', 'Ron');
        assert.dom('.initials').hasText('RR');
        assert.dom('.fb-chrome-menu-caret').doesNotExist();

        await click(TRIGGER);
        assert.dom('[role="dialog"]').hasAttribute('aria-label', 'Account');
        assert.dom('.field').isFocused('the first focusable control takes focus');

        await triggerKeyEvent('.field', 'keydown', 'ArrowDown');
        assert.dom('.field').isFocused('arrow keys stay with a text field');

        await focus('.pick');
        await triggerKeyEvent('.pick', 'keydown', 'ArrowDown');
        assert.dom('.done').isFocused('arrow keys move between menu items in a panel');

        await click('.done');
        assert.dom('[role="dialog"]').doesNotExist();
    });

    test('menu.select runs an item action from a panel', async function (assert) {
        const picked = [];
        this.pick = (item) => picked.push(item.label);
        await render(hbs`
            <Layout::ChromeMenu @ariaLabel="Account">
                <:panel as |menu|>
                    <button type="button" class="pick" {{on "click" (fn menu.select (hash label="Pick" action=this.pick))}}>Pick</button>
                </:panel>
            </Layout::ChromeMenu>
        `);
        await click(TRIGGER);
        await click('.pick');

        assert.deepEqual(picked, ['Pick']);
        assert.dom('[role="dialog"]').doesNotExist();
    });

    test('it stops listening for outside presses when destroyed while open', async function (assert) {
        this.set('show', true);
        await render(hbs`{{#if this.show}}<Layout::ChromeMenu @label="Fleet-Ops" @items={{this.items}} />{{/if}}`);
        await click(TRIGGER);
        this.set('show', false);

        await triggerEvent(document.body, 'mousedown');
        assert.dom('.fb-chrome-menu').doesNotExist('no error from a destroyed menu');
    });
});
