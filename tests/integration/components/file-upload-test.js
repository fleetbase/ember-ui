import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const INPUT = 'input[type="file"]';

function selectFiles(files) {
    const input = find(INPUT);
    const transfer = new DataTransfer();
    for (const file of files) {
        transfer.items.add(file);
    }
    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

module('Integration | Component | file-upload', function (hooks) {
    setupRenderingTest(hooks);

    let added;

    hooks.beforeEach(function () {
        added = [];
        this.set('onFileAdded', (file) => added.push(file));
    });

    test('it renders a labelled hidden file input', async function (assert) {
        await render(hbs`<FileUpload @name="attachments" />`);

        assert.dom('label.file-upload').exists();
        assert.dom(INPUT).exists();
        assert.dom(INPUT).hasAttribute('hidden', '', 'the raw input is hidden behind the label');
    });

    test('the accept list is forwarded', async function (assert) {
        await render(hbs`<FileUpload @name="attachments" @accept="image/png,application/pdf" />`);

        assert.dom(INPUT).hasAttribute('accept', 'image/png,application/pdf');
    });

    test('a disabled upload disables both the label and the input', async function (assert) {
        await render(hbs`<FileUpload @name="attachments" @disabled={{true}} />`);

        assert.dom('label.file-upload').hasAttribute('disabled', '');
        assert.dom(INPUT).isDisabled();
    });

    test('class hooks and splattributes are applied', async function (assert) {
        await render(hbs`<FileUpload @name="attachments" @labelClass="my-label" @inputClass="my-input" data-test-upload="yes" />`);

        assert.dom('label.file-upload').hasClass('my-label');
        assert.dom(INPUT).hasClass('my-input');
        assert.dom(INPUT).hasAttribute('data-test-upload', 'yes');
    });

    test('it yields the queue', async function (assert) {
        await render(hbs`
            <FileUpload @name="attachments" as |queue|>
                <span class="name">{{queue.name}}</span>
                <span class="count">{{queue.files.length}}</span>
            </FileUpload>
        `);

        assert.dom('.name').hasText('attachments');
        assert.dom('.count').hasText('0', 'the queue starts empty');
    });

    test('selecting a file reports it through onFileAdded', async function (assert) {
        await render(hbs`<FileUpload @name="attachments-added" @onFileAdded={{this.onFileAdded}} />`);

        selectFiles([new File(['data'], 'manifest.pdf', { type: 'application/pdf' })]);

        assert.strictEqual(added.length, 1, 'the file is reported once');
        assert.strictEqual(added[0].name, 'manifest.pdf');
    });

    test('the multiple flag is forwarded to the picker', async function (assert) {
        await render(hbs`<FileUpload @name="attachments" @multiple={{true}} />`);

        assert.dom(INPUT).hasAttribute('multiple');
    });

    test('a picker that is not asked to be multiple is single-file', async function (assert) {
        await render(hbs`<FileUpload @name="attachments" />`);

        assert.dom(INPUT).doesNotHaveAttribute('multiple');
    });

    test('the input is hidden by default', async function (assert) {
        await render(hbs`<FileUpload @name="attachments" />`);

        assert.dom(INPUT).hasAttribute('hidden');
    });

    test('the hidden flag can be switched off', async function (assert) {
        await render(hbs`<FileUpload @name="attachments" @hidden={{false}} />`);

        assert.dom(INPUT).doesNotHaveAttribute('hidden', 'an explicit false reveals the input');
    });
});
