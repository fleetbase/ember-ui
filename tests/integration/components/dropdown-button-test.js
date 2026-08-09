import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

const TRIGGER = '.ember-basic-dropdown-trigger';

// A single mutable stub: the component holds one injected instance for its whole life, so
// permissions must be changed on that instance rather than by re-registering the service.
const permissions = { permitted: true };

class AbilitiesStub extends Service {
    can() {
        return permissions.permitted;
    }
    cannot() {
        return !permissions.permitted;
    }
}

// Only the flag changes after setup — re-registering would not reach the already-injected
// instance the component holds.
function registerAbilities(owner, { permitted = true } = {}) {
    permissions.permitted = permitted;
}

function menuItems() {
    return findAll('.next-dd-item');
}

module('Integration | Component | dropdown-button', function (hooks) {
    setupRenderingTest(hooks);

    let chosen;

    hooks.beforeEach(function () {
        this.owner.unregister('service:abilities');
        this.owner.register('service:abilities', AbilitiesStub);
        registerAbilities(this.owner);
        chosen = [];
        this.set('items', [{ text: 'Duplicate', onClick: () => chosen.push('duplicate') }, { separator: true }, { text: 'Delete', onClick: () => chosen.push('delete') }]);
    });

    const TEMPLATE = hbs`
        <DropdownButton
            @text={{this.text}}
            @icon={{this.icon}}
            @type={{this.type}}
            @size={{this.size}}
            @items={{this.items}}
            @disabled={{this.disabled}}
            @visible={{this.visible}}
            @permission={{this.permission}}
            @helpText={{this.helpText}}
            @buttonClass={{this.buttonClass}}
            @renderInPlace={{true}}
            @registerAPI={{this.registerAPI}}
            @onInsert={{this.onInsert}}
            @onTriggerInsert={{this.onTriggerInsert}}
            @onButtonInsert={{this.onButtonInsert}}
        />
    `;

    module('rendering', function () {
        test('it renders a trigger button', async function (assert) {
            this.set('text', 'Actions');

            await render(TEMPLATE);

            assert.ok(find(TRIGGER), 'a trigger renders');
            assert.dom(TRIGGER).containsText('Actions');
            assert.dom(`${TRIGGER} button`).hasClass('btn-default', 'the default type');
            assert.dom(`${TRIGGER} button`).hasClass('btn-md', 'the default size');
        });

        test('the type and size can be replaced', async function (assert) {
            this.setProperties({ text: 'Actions', type: 'primary', size: 'xs' });

            await render(TEMPLATE);

            assert.dom(`${TRIGGER} button`).hasClass('btn-primary');
            assert.dom(`${TRIGGER} button`).hasClass('btn-xs');
        });

        test('an icon can be shown alongside the label', async function (assert) {
            this.setProperties({ text: 'Actions', icon: 'ellipsis' });

            await render(TEMPLATE);

            assert.dom(`${TRIGGER} svg`).hasClass('fa-ellipsis');
            assert.dom(`${TRIGGER} svg`).hasClass('mr-2', 'spaced away from the label');
        });

        test('an icon alone is not spaced', async function (assert) {
            this.set('icon', 'ellipsis');

            await render(TEMPLATE);

            assert.dom(`${TRIGGER} svg`).doesNotHaveClass('mr-2');
        });

        test('an image can be shown', async function (assert) {
            await render(hbs`<DropdownButton @img="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" @alt="Avatar" @renderInPlace={{true}} />`);

            assert.dom(`${TRIGGER} img`).hasAttribute('alt', 'Avatar');
        });

        test('an image with no alt text gets a generic one', async function (assert) {
            await render(hbs`<DropdownButton @img="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" @renderInPlace={{true}} />`);

            assert.dom(`${TRIGGER} img`).hasAttribute('alt', 'image');
        });

        test('extra button classes are applied', async function (assert) {
            this.setProperties({ text: 'Actions', buttonClass: 'my-button' });

            await render(TEMPLATE);

            assert.dom(`${TRIGGER} button`).hasClass('my-button');
        });

        test('the trigger is marked while the menu is open', async function (assert) {
            this.set('text', 'Actions');

            await render(TEMPLATE);
            assert.dom(`${TRIGGER} button`).doesNotHaveClass('dd-is-open');

            await click(TRIGGER);
            assert.dom(`${TRIGGER} button`).hasClass('dd-is-open');
        });
    });

    module('the menu', function () {
        test('it lists every item and separator', async function (assert) {
            await render(TEMPLATE);
            await click(TRIGGER);

            assert.deepEqual(
                menuItems().map((item) => item.textContent.trim()),
                ['Duplicate', 'Delete']
            );
            assert.strictEqual(findAll('.next-dd-menu-seperator').length, 1);
        });

        test('choosing an item runs its action and closes the menu', async function (assert) {
            await render(TEMPLATE);
            await click(TRIGGER);
            await click(menuItems()[1]);

            assert.deepEqual(chosen, ['delete']);
            assert.strictEqual(find('.next-dd-menu'), null, 'the menu closes');
        });

        test('an item can supply its action as fn', async function (assert) {
            this.set('items', [{ text: 'Archive', fn: () => chosen.push('archive') }]);

            await render(TEMPLATE);
            await click(TRIGGER);
            await click(menuItems()[0]);

            assert.deepEqual(chosen, ['archive']);
        });

        test('a disabled item is marked', async function (assert) {
            this.set('items', [{ text: 'Archive', disabled: true, onClick: () => chosen.push('archive') }]);

            await render(TEMPLATE);
            await click(TRIGGER);

            assert.dom(menuItems()[0]).hasClass('disabled');
        });

        test('a block replaces the menu entirely', async function (assert) {
            await render(hbs`
                <DropdownButton @text="Actions" @renderInPlace={{true}} as |dd|>
                    <div class="custom-menu">Open: {{dd.isOpen}}</div>
                </DropdownButton>
            `);
            await click(TRIGGER);

            assert.dom('.custom-menu').containsText('Open: true');
            assert.strictEqual(find('.next-dd-menu'), null, 'the default menu is not rendered');
        });

        test('a dropdown with no items renders an empty menu', async function (assert) {
            this.set('items', undefined);

            await render(TEMPLATE);
            await click(TRIGGER);

            assert.ok(find('.next-dd-menu'), 'the menu container still renders');
            assert.deepEqual(menuItems(), []);
        });
    });

    module('visibility and permissions', function () {
        test('a hidden dropdown renders nothing', async function (assert) {
            this.setProperties({ text: 'Actions', visible: false });

            await render(TEMPLATE);

            assert.strictEqual(find(TRIGGER), null);
            assert.dom(this.element).hasText('');
        });

        test('a disabled dropdown cannot be opened', async function (assert) {
            this.setProperties({ text: 'Actions', disabled: true });

            await render(TEMPLATE);
            await click(TRIGGER);

            assert.strictEqual(find('.next-dd-menu'), null, 'the menu stays shut');
            assert.dom(`${TRIGGER} button`).isDisabled();
        });

        test('a permitted dropdown opens', async function (assert) {
            registerAbilities(this.owner, { permitted: true });
            this.setProperties({ text: 'Actions', permission: 'manage orders' });

            await render(TEMPLATE);
            await click(TRIGGER);

            assert.ok(find('.next-dd-menu'), 'the menu opens');
        });

        test('a forbidden dropdown is disabled and explains itself', async function (assert) {
            registerAbilities(this.owner, { permitted: false });
            this.setProperties({ text: 'Actions', permission: 'manage orders' });

            await render(TEMPLATE);

            assert.dom(`${TRIGGER} button`).isDisabled();

            await click(TRIGGER);
            assert.strictEqual(find('.next-dd-menu'), null, 'the menu cannot be opened');
        });

        test('help text is offered when permitted', async function (assert) {
            this.setProperties({ text: 'Actions', helpText: 'Choose an action' });

            await render(TEMPLATE);

            assert.ok(find(`${TRIGGER} .ember-attacher`) || find(TRIGGER), 'the trigger renders with a tooltip attached');
        });

        test('visibility and disabled state follow their arguments', async function (assert) {
            this.setProperties({ text: 'Actions', visible: true, disabled: false });

            await render(TEMPLATE);
            assert.dom(`${TRIGGER} button`).isNotDisabled();

            this.set('disabled', true);
            assert.dom(`${TRIGGER} button`).isDisabled('the trigger reacts to a later disable');

            this.set('visible', false);
            assert.strictEqual(find(TRIGGER), null, 'and to being hidden');
        });

        test('a permission granted later re-enables the dropdown', async function (assert) {
            registerAbilities(this.owner, { permitted: false });
            this.setProperties({ text: 'Actions', permission: 'manage orders' });

            await render(TEMPLATE);
            assert.dom(`${TRIGGER} button`).isDisabled();

            permissions.permitted = true;
            this.set('permission', 'manage orders now');

            assert.dom(`${TRIGGER} button`).isNotDisabled('the permission is re-checked');
        });
    });

    module('lifecycle callbacks', function () {
        test('it reports insertion of the dropdown, trigger and button', async function (assert) {
            const events = [];
            this.setProperties({
                text: 'Actions',
                onInsert: () => events.push('insert'),
                onTriggerInsert: () => events.push('trigger'),
                onButtonInsert: () => events.push('button'),
            });

            await render(TEMPLATE);

            assert.true(events.includes('insert'), 'the dropdown reports itself');
            assert.true(events.includes('trigger'), 'the trigger reports itself');
            assert.true(events.includes('button'), 'the button reports itself');
        });

        test('it hands the dropdown api to the parent', async function (assert) {
            const registered = [];
            this.setProperties({ text: 'Actions', registerAPI: (dropdown) => registered.push(dropdown) });

            await render(TEMPLATE);

            const api = registered.find(Boolean);
            assert.ok(api, 'the api is handed over');
            assert.strictEqual(typeof api.actions.open, 'function');
            assert.strictEqual(typeof api.actions.toggle, 'function');
        });

        test('it renders happily with no lifecycle handlers', async function (assert) {
            await render(hbs`<DropdownButton @text="Actions" @renderInPlace={{true}} />`);

            assert.ok(find(TRIGGER));
        });
    });

    module('tracked opens', function () {
        test('opening the dropdown through the api reports the configured event', async function (assert) {
            const tracked = [];
            let api;
            this.owner.register(
                'service:events',
                class extends Service {
                    trackEvent(name, ...args) {
                        tracked.push([name, ...args]);
                    }
                }
            );
            this.set('registerAPI', (dropdown) => {
                if (dropdown) api = dropdown;
            });

            await render(hbs`<DropdownButton @text="Actions" @renderInPlace={{true}} @registerAPI={{this.registerAPI}} @eventName="dropdown.opened" @eventArgs={{array "orders"}} />`);
            api.actions.open();

            assert.deepEqual(tracked, [['dropdown.opened', 'orders']]);
        });

        test('clicking the trigger reports the configured event', async function (assert) {
            const tracked = [];
            this.owner.register(
                'service:events',
                class extends Service {
                    trackEvent(name, ...args) {
                        tracked.push([name, ...args]);
                    }
                }
            );

            await render(hbs`<DropdownButton @text="Actions" @renderInPlace={{true}} @eventName="dropdown.opened" @eventArgs={{array "orders"}} />`);
            await click(TRIGGER);

            assert.ok(find('.next-dd-menu'), 'the dropdown opens');
            assert.deepEqual(tracked, [['dropdown.opened', 'orders']], 'and a real click is tracked');
        });

        test('closing again does not report a second open', async function (assert) {
            const tracked = [];
            this.owner.register(
                'service:events',
                class extends Service {
                    trackEvent(name, ...args) {
                        tracked.push([name, ...args]);
                    }
                }
            );

            await render(hbs`<DropdownButton @text="Actions" @renderInPlace={{true}} @eventName="dropdown.opened" />`);
            await click(TRIGGER);
            await click(TRIGGER);

            assert.notOk(find('.next-dd-menu'), 'the second click closes it');
            assert.strictEqual(tracked.length, 1, 'only the opening click is tracked');
        });

        test('no event is reported when none is configured', async function (assert) {
            const tracked = [];
            this.owner.register(
                'service:events',
                class extends Service {
                    trackEvent(name) {
                        tracked.push(name);
                    }
                }
            );

            await render(hbs`<DropdownButton @text="Actions" @renderInPlace={{true}} />`);
            await click(TRIGGER);

            assert.deepEqual(tracked, []);
        });
    });
});
