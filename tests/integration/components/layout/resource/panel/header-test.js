import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import EmberObject from '@ember/object';
import { task } from 'ember-concurrency';

const saved = [];
const Saver = EmberObject.extend({
    saveTask: task(function* (resource) {
        saved.push(resource);
        yield Promise.resolve();
    }),
});

// getModelName-style resolution reads `constructor.modelName`, so a fake record needs a
// named class rather than a plain object literal.
function record(modelName, attributes = {}) {
    const Klass = class {};
    Klass.modelName = modelName;
    return Object.assign(new Klass(), attributes);
}

module('Integration | Component | layout/resource/panel/header', function (hooks) {
    setupRenderingTest(hooks);

    let cancels;

    hooks.beforeEach(function () {
        saved.length = 0;
        cancels = [];
        this.set('onPressCancel', () => cancels.push('cancel'));
    });

    const TEMPLATE = hbs`
        <Layout::Resource::Panel::Header
            @title={{this.title}}
            @resource={{this.resource}}
            @modelName={{this.modelName}}
            @actionButtons={{this.actionButtons}}
            @onPressCancel={{this.onPressCancel}}
        />
    `;

    module('rendering', function () {
        test('it renders a titled panel header', async function (assert) {
            this.set('title', 'Vehicle details');

            await render(TEMPLATE);

            assert.dom('.resource-panel-header').exists();
            assert.dom('.next-content-overlay-panel-title').hasText('Vehicle details');
        });

        test('it renders without a title', async function (assert) {
            await render(hbs`<Layout::Resource::Panel::Header />`);

            assert.dom('.resource-panel-header').exists();
            assert.dom('.next-content-overlay-panel-title').hasText('');
        });

        test('extra classes and splattributes are forwarded', async function (assert) {
            await render(hbs`<Layout::Resource::Panel::Header @title="Vehicle" @titleClass="my-title" data-test-header="yes" />`);

            assert.dom('.resource-panel-header').hasAttribute('data-test-header', 'yes');
            assert.dom('.next-content-overlay-panel-title').hasClass('my-title');
        });

        test('it offers a way to close the panel', async function (assert) {
            this.set('title', 'Vehicle details');

            await render(TEMPLATE);
            const closeButton = findAll('.resource-panel-header button').at(-1);

            assert.ok(closeButton, 'a close control is offered');

            await click(closeButton);
            assert.deepEqual(cancels, ['cancel']);
        });
    });

    module('action buttons', function () {
        test('no action buttons are rendered unless supplied', async function (assert) {
            this.set('title', 'Vehicle details');

            await render(TEMPLATE);

            assert.strictEqual(find('.resource-panel-header .btn-primary'), null);
        });

        test('each action button is rendered', async function (assert) {
            const pressed = [];
            this.set('actionButtons', [
                { text: 'Duplicate', onClick: () => pressed.push('duplicate') },
                { text: 'Archive', onClick: () => pressed.push('archive') },
            ]);

            await render(TEMPLATE);

            const labels = findAll('.resource-panel-header button')
                .map((button) => button.textContent.trim())
                .filter(Boolean);
            assert.true(labels.includes('Duplicate'), 'the first action is offered');
            assert.true(labels.includes('Archive'), 'the second action is offered');
        });

        test('an action button with items becomes a dropdown', async function (assert) {
            const chosen = [];
            this.set('actionButtons', [
                {
                    text: 'More',
                    items: [{ text: 'Export', onClick: () => chosen.push('export') }, { separator: true }, { text: 'Delete', onClick: () => chosen.push('delete') }],
                },
            ]);

            await render(TEMPLATE);
            await click('.resource-panel-header .ember-basic-dropdown-trigger');

            assert.dom('.next-dd-menu').containsText('Export');
            assert.dom('.next-dd-menu').containsText('Delete');
            assert.dom('.next-dd-menu-seperator').exists('the separator is rendered');

            await click(findAll('.next-dd-menu a').find((item) => item.textContent.includes('Export')));
            assert.deepEqual(chosen, ['export'], 'choosing an item runs its action');
        });
    });

    // The resolved model name is only ever surfaced through the save button's label, so
    // these cases render the header with a save task attached. The name is resolved by
    // Layout::Resource::Panel::HeaderActions, which is now the only implementation.
    module('naming the resource', function (hooks) {
        const SAVING_TEMPLATE = hbs`
            <Layout::Resource::Panel::Header
                @title="Panel"
                @resource={{this.resource}}
                @modelName={{this.modelName}}
                @pojoResource={{true}}
                @saveTask={{this.saveTask}}
            />
        `;

        function saveButton() {
            return findAll('.resource-panel-header button').find((button) => /Create|Save/.test(button.textContent));
        }

        hooks.beforeEach(function () {
            this.set('saveTask', Saver.create().saveTask);
        });

        test('an explicit model name wins over the record type', async function (assert) {
            this.set('resource', record('delivery_vehicle', { isNew: true }));
            this.set('modelName', 'Truck');

            await render(SAVING_TEMPLATE);

            assert.dom(saveButton()).hasText('Create Truck');
        });

        test('a record supplies a titleized model name', async function (assert) {
            this.set('resource', record('delivery_vehicle', { isNew: true }));

            await render(SAVING_TEMPLATE);

            assert.dom(saveButton()).hasText('Create Delivery Vehicle', 'the underscored model name is titleized');
        });

        test('a dasherized record type is titleized too', async function (assert) {
            this.set('resource', record('delivery-vehicle', { isNew: true }));

            await render(SAVING_TEMPLATE);

            assert.dom(saveButton()).hasText('Create Delivery Vehicle');
        });

        test('an unnameable resource falls back to "Resource"', async function (assert) {
            this.set('resource', { isNew: true });

            await render(SAVING_TEMPLATE);

            assert.dom(saveButton()).hasText('Create Resource');
        });

        test('an existing record offers to save changes instead', async function (assert) {
            this.set('resource', record('delivery_vehicle', { isNew: false }));

            await render(SAVING_TEMPLATE);

            assert.dom(saveButton()).hasText('Save Changes');
        });

        test('saving runs the supplied task', async function (assert) {
            const resource = record('delivery_vehicle', { isNew: true });
            this.set('resource', resource);

            await render(SAVING_TEMPLATE);
            await click(saveButton());

            assert.deepEqual(saved, [resource], 'the record is handed to the save task');
        });
    });
});
