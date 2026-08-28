import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, triggerEvent, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function button() {
    return find('a.btn');
}

module('Integration | Component | upload-button', function (hooks) {
    setupRenderingTest(hooks);

    let added;

    hooks.beforeEach(function () {
        added = [];
        this.set('onFileAdded', (file) => added.push(file));
    });

    const TEMPLATE = hbs`
        <UploadButton
            @name="image"
            @accept="image/png"
            @onFileAdded={{this.onFileAdded}}
            @buttonText={{this.buttonText}}
            @icon={{this.icon}}
            @type={{this.type}}
            @size={{this.size}}
            @outline={{this.outline}}
            @disabled={{this.disabled}}
            @hideButtonText={{this.hideButtonText}}
            @helpText={{this.helpText}}
        />
    `;

    module('rendering', function () {
        test('it renders a default upload button', async function (assert) {
            await render(TEMPLATE);

            assert.dom(button()).hasText('Upload new');
            assert.dom(button()).hasClass('btn-default');
            assert.dom(button()).hasClass('btn-sm');
            assert.dom('a.btn svg').exists('a default icon is shown');
        });

        test('the label, icon, type and size can all be overridden', async function (assert) {
            this.set('buttonText', 'Choose a photo');
            this.set('icon', 'camera');
            this.set('type', 'primary');
            this.set('size', 'lg');

            await render(TEMPLATE);

            assert.dom(button()).hasText('Choose a photo');
            assert.dom(button()).hasClass('btn-primary');
            assert.dom(button()).hasClass('btn-lg');
        });

        test('the outline variant is opt-in', async function (assert) {
            await render(TEMPLATE);
            assert.dom(button()).doesNotHaveClass('btn-outline');

            this.set('outline', true);
            assert.dom(button()).hasClass('btn-outline');
        });

        test('the label can be hidden, leaving an icon-only button', async function (assert) {
            this.set('hideButtonText', true);

            await render(TEMPLATE);

            assert.dom(button()).hasText('');
            assert.dom('a.btn svg').exists('the icon remains');
        });

        test('a disabled button is marked and dimmed', async function (assert) {
            this.set('disabled', true);

            await render(TEMPLATE);

            assert.dom(button()).hasAttribute('disabled');
            assert.dom(button()).hasClass('cursor-not-allowed');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<UploadButton @name="image" data-test-upload="yes" />`);

            assert.dom('a.btn').hasAttribute('data-test-upload', 'yes');
        });
    });

    module('uploading', function () {
        test('choosing a file reports it', async function (assert) {
            await render(TEMPLATE);

            const file = new File(['image-bytes'], 'logo.png', { type: 'image/png' });
            await triggerEvent('input[type="file"]', 'change', { files: [file] });

            assert.strictEqual(added.length, 1, 'the file is handed to the caller');
            assert.strictEqual(added[0].name, 'logo.png');
        });

        test('while a file is queued it shows an uploading state', async function (assert) {
            await render(TEMPLATE);

            const file = new File(['image-bytes'], 'logo.png', { type: 'image/png' });
            await triggerEvent('input[type="file"]', 'change', { files: [file] });

            assert.dom(button()).containsText('Uploading...');
            assert.dom('a.btn .fleetbase-loader').exists('a spinner replaces the icon');
        });

        test('it renders without an onFileAdded handler', async function (assert) {
            await render(hbs`<UploadButton @name="image" />`);

            assert.ok(button(), 'no handler is required to render');
        });
    });
});
