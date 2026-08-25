import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | chat-window/attachment', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders an image preview for image attachments', async function (assert) {
        this.set('record', {
            filename: 'delivery-photo.png',
            url: '/images/delivery-photo.png',
            isImage: true,
            download: () => {},
        });

        await render(hbs`<ChatWindow::Attachment @record={{this.record}} />`);

        assert.dom('.chat-attachment-container').exists();
        assert.dom('.chat-attachment-image-preview').exists('image attachments render an image preview');
        assert.dom('.chat-attachment-image-preview').hasAttribute('alt', 'delivery-photo.png');
        assert.dom('.chat-attachment-file-preview').doesNotExist('no file preview is rendered for images');
    });

    test('it renders a file preview with the extension icon for documents', async function (assert) {
        this.set('record', {
            filename: 'rate-confirmation.pdf',
            url: '/uploads/rate-confirmation.pdf',
            isImage: false,
            download: () => {},
        });

        await render(hbs`<ChatWindow::Attachment @record={{this.record}} />`);

        assert.dom('.chat-attachment-image-preview').doesNotExist('no image preview is rendered for documents');
        assert.dom('.chat-attachment-file-preview').exists();
        assert.dom('.chat-attachment-file-preview .file-icon').hasClass('file-icon-pdf', 'icon container reflects the file extension');
        assert.dom('.chat-attachment-file-preview-filename').hasText('rate-confirmation.pdf');
    });

    test('it tolerates unknown file extensions', async function (assert) {
        this.set('record', {
            filename: 'telemetry.xyz',
            url: '/uploads/telemetry.xyz',
            isImage: false,
            download: () => {},
        });

        await render(hbs`<ChatWindow::Attachment @record={{this.record}} />`);

        assert.dom('.chat-attachment-file-preview .file-icon').hasClass('file-icon-xyz');
        assert.dom('.chat-attachment-file-preview-filename').hasText('telemetry.xyz');
    });

    test('it downloads the attachment when clicked', async function (assert) {
        let downloads = 0;
        this.set('record', {
            filename: 'rate-confirmation.pdf',
            url: '/uploads/rate-confirmation.pdf',
            isImage: false,
            download: () => {
                downloads++;
            },
        });

        await render(hbs`<ChatWindow::Attachment @record={{this.record}} />`);
        await click('.chat-attachment-container');

        assert.strictEqual(downloads, 1, 'clicking the attachment triggers a download');
    });
    // DEFECTS #1. getExtension() returns null for a filename with no dot, and getWithDefault
    // asserts on a null key rather than falling back — so the component threw during render and
    // an attachment named README could not be displayed at all.
    test('a filename with no extension renders rather than throwing', async function (assert) {
        this.set('record', {
            filename: 'README',
            url: '/uploads/README',
            isImage: false,
            download: () => {},
        });

        await render(hbs`<ChatWindow::Attachment @record={{this.record}} />`);

        assert.dom('.chat-attachment-file-preview').exists('the attachment renders');
        // FontAwesome 6 renders the `file-alt` alias under its canonical name, `file-lines`.
        assert.dom('.chat-attachment-file-preview .file-icon svg').hasClass('fa-file-lines', 'and falls back to the generic file icon');
        assert.dom('.chat-attachment-file-preview-filename').hasText('README');
    });

    test('a dotfile with no extension also renders', async function (assert) {
        this.set('record', {
            filename: 'Dockerfile',
            url: '/uploads/Dockerfile',
            isImage: false,
            download: () => {},
        });

        await render(hbs`<ChatWindow::Attachment @record={{this.record}} />`);

        assert.dom('.chat-attachment-file-preview-filename').hasText('Dockerfile');
    });
});
