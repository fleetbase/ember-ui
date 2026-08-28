import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { task } from 'ember-concurrency';
import EmberObject from '@ember/object';

function saveTaskHost(onPerform) {
    return EmberObject.extend({
        save: task(function* (resource, options) {
            onPerform({ resource, options });
            yield Promise.resolve();
        }),
    }).create();
}

module('Integration | Component | layout/resource/panel/header-actions', function (hooks) {
    setupRenderingTest(hooks);

    let pressed;

    hooks.beforeEach(function () {
        pressed = [];
        this.set('resource', { id: 'ord_1', isNew: false });
    });

    module('the save button', function () {
        test('no save button is rendered without a save task', async function (assert) {
            await render(hbs`<Layout::Resource::Panel::HeaderActions @resource={{this.resource}} />`);

            assert.dom('button.btn').doesNotExist();
        });

        test('an existing record offers "Save Changes"', async function (assert) {
            this.set(
                'host',
                saveTaskHost(() => {})
            );

            await render(hbs`<Layout::Resource::Panel::HeaderActions @resource={{this.resource}} @saveTask={{this.host.save}} @pojoResource={{true}} />`);

            assert.dom('button.btn').containsText('Save Changes');
            assert.dom('button.btn svg').hasClass('fa-floppy-disk', 'the save icon is used');
        });

        test('a new record offers "Create <ModelName>"', async function (assert) {
            this.set(
                'host',
                saveTaskHost(() => {})
            );
            this.set('resource', { isNew: true });

            await render(hbs`<Layout::Resource::Panel::HeaderActions @resource={{this.resource}} @saveTask={{this.host.save}} @pojoResource={{true}} @modelName="Purchase Order" />`);

            assert.dom('button.btn').containsText('Create Purchase Order');
            assert.dom('button.btn svg').hasClass('fa-check');
        });

        test('an unnamed new record falls back to "Resource"', async function (assert) {
            this.set(
                'host',
                saveTaskHost(() => {})
            );
            this.set('resource', { isNew: true });

            await render(hbs`<Layout::Resource::Panel::HeaderActions @resource={{this.resource}} @saveTask={{this.host.save}} @pojoResource={{true}} />`);

            assert.dom('button.btn').containsText('Create Resource');
        });

        test('the model name is derived from the record class and titleized', async function (assert) {
            this.set(
                'host',
                saveTaskHost(() => {})
            );

            class PurchaseOrder {
                static modelName = 'purchase-order';
                isNew = true;
            }
            this.set('resource', new PurchaseOrder());

            await render(hbs`<Layout::Resource::Panel::HeaderActions @resource={{this.resource}} @saveTask={{this.host.save}} @pojoResource={{true}} />`);

            assert.dom('button.btn').containsText('Create Purchase Order');
        });

        test('saving performs the task with the record and options', async function (assert) {
            const performed = [];
            this.set(
                'host',
                saveTaskHost((payload) => performed.push(payload))
            );
            this.set('saveOptions', { closeAfter: true });

            await render(hbs`
                <Layout::Resource::Panel::HeaderActions @resource={{this.resource}} @saveTask={{this.host.save}} @saveOptions={{this.saveOptions}} @pojoResource={{true}} />
            `);
            await click('button.btn');

            assert.strictEqual(performed.length, 1);
            assert.strictEqual(performed[0].resource, this.resource);
            assert.deepEqual(performed[0].options, { closeAfter: true });
        });

        test('the save button can be disabled', async function (assert) {
            this.set(
                'host',
                saveTaskHost(() => {})
            );

            await render(hbs`<Layout::Resource::Panel::HeaderActions @resource={{this.resource}} @saveTask={{this.host.save}} @pojoResource={{true}} @saveDisabled={{true}} />`);

            assert.dom('button.btn').isDisabled();
        });

        test('a non-pojo resource routes through the permission check', async function (assert) {
            this.set(
                'host',
                saveTaskHost(() => {})
            );

            await render(hbs`<Layout::Resource::Panel::HeaderActions @resource={{this.resource}} @saveTask={{this.host.save}} />`);

            assert.dom('button.btn').containsText('Save Changes', 'the save button still renders');
        });
    });

    module('action buttons', function () {
        test('a plain action button is rendered and clickable', async function (assert) {
            this.set('actionButtons', [{ text: 'Duplicate', type: 'default', onClick: () => pressed.push('duplicate') }]);

            await render(hbs`<Layout::Resource::Panel::HeaderActions @resource={{this.resource}} @actionButtons={{this.actionButtons}} />`);
            await click('button.btn');

            assert.deepEqual(pressed, ['duplicate']);
        });

        test('an action button with items becomes a dropdown', async function (assert) {
            this.set('actionButtons', [
                {
                    text: 'More',
                    triggerClass: 'my-trigger',
                    items: [{ text: 'Duplicate', icon: 'copy', fn: () => pressed.push('duplicate') }, { separator: true }, { label: 'Archive', onClick: () => pressed.push('archive') }],
                },
            ]);

            await render(hbs`<Layout::Resource::Panel::HeaderActions @resource={{this.resource}} @actionButtons={{this.actionButtons}} />`);
            await click('.my-trigger');

            const items = findAll('.next-dd-item');
            assert.deepEqual(
                items.map((item) => item.textContent.trim()),
                ['Duplicate', 'Archive']
            );
            assert.dom('.next-dd-menu-seperator').exists();

            await click(items[1]);
            assert.deepEqual(pressed, ['archive']);
        });

        test('a component-backed action button is rendered', async function (assert) {
            this.set('actionButtons', [{ component: 'spinner', size: 'lg' }]);

            await render(hbs`<Layout::Resource::Panel::HeaderActions @resource={{this.resource}} @actionButtons={{this.actionButtons}} />`);

            assert.dom('.fleetbase-loader').exists();
        });

        test('no action buttons renders none', async function (assert) {
            await render(hbs`<Layout::Resource::Panel::HeaderActions @resource={{this.resource}} />`);

            assert.deepEqual(findAll('button.btn'), []);
        });
    });

    module('cancelling', function () {
        test('a cancel button appears only when a handler is given', async function (assert) {
            await render(hbs`<Layout::Resource::Panel::HeaderActions @resource={{this.resource}} />`);

            assert.dom('.next-content-overlay-panel-cancel-button').doesNotExist();
        });

        test('cancelling reports it', async function (assert) {
            this.set('onPressCancel', () => pressed.push('cancel'));

            await render(hbs`<Layout::Resource::Panel::HeaderActions @resource={{this.resource}} @onPressCancel={{this.onPressCancel}} @cancelButtonClass="my-cancel" />`);
            await click('.my-cancel');

            assert.deepEqual(pressed, ['cancel']);
            assert.dom('.my-cancel svg').hasClass('fa-xmark', 'the default cancel icon is a cross');
        });
    });

    test('it yields a default block and an end block', async function (assert) {
        await render(hbs`
            <Layout::Resource::Panel::HeaderActions @resource={{this.resource}}>
                <:default><span class="lead">lead</span></:default>
                <:end><span class="trail">trail</span></:end>
            </Layout::Resource::Panel::HeaderActions>
        `);

        assert.dom('.lead').hasText('lead');
        assert.dom('.trail').hasText('trail');
    });
});
