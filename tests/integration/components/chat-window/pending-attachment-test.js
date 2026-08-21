import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | chat-window/pending-attachment', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders an image preview for image files', async function (assert) {
        this.set('file', {
            id: 'file-1',
            original_filename: 'delivery-photo.png',
            url: '/images/delivery-photo.png',
        });

        await render(hbs`<ChatWindow::PendingAttachment @file={{this.file}} />`);

        assert.dom('.chat-window-pending-attachment').exists();
        assert.dom('img.x-fleetbase-file-preview').exists('image files render an image preview');
        assert.dom('img.x-fleetbase-file-preview').hasAttribute('alt', 'delivery-photo.png');
        assert.dom('.chat-window-pending-attachment-name').hasText('delivery-photo.png');
    });

    test('it renders a file icon preview for non-image files', async function (assert) {
        this.set('file', {
            id: 'file-1',
            original_filename: 'notes.txt',
            url: '/uploads/notes.txt',
        });

        await render(hbs`<ChatWindow::PendingAttachment @file={{this.file}} />`);

        assert.dom('img.x-fleetbase-file-preview').doesNotExist('no image preview is rendered for documents');
        assert.dom('.chat-window-pending-attachment-preview .file-icon').exists('a file icon is rendered instead');
        assert.dom('.chat-window-pending-attachment-name').hasText('notes.txt');
    });

    test('it truncates long filenames', async function (assert) {
        this.set('file', {
            id: 'file-1',
            original_filename: 'really-long-filename-for-chat-upload.png',
            url: '/uploads/really-long-filename-for-chat-upload.png',
        });

        await render(hbs`<ChatWindow::PendingAttachment @file={{this.file}} />`);

        assert.dom('.chat-window-pending-attachment-name').hasText('really-long-f....png');
    });

    test('it invokes @onRemove with the file when the remove action is clicked', async function (assert) {
        const removed = [];
        this.set('file', {
            id: 'file-1',
            original_filename: 'notes.txt',
            url: '/uploads/notes.txt',
        });
        this.set('onRemove', (file) => {
            removed.push(file);
        });

        await render(hbs`<ChatWindow::PendingAttachment @file={{this.file}} @onRemove={{this.onRemove}} />`);
        await click('.chat-window-pending-attachment-actions a');

        assert.strictEqual(removed.length, 1, 'onRemove is called once');
        assert.strictEqual(removed[0], this.file, 'onRemove receives the pending file');
    });
});
