import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, findAll } from '@ember/test-helpers';
import { selectFiles } from 'ember-file-upload/test-support';
import { hbs } from 'ember-cli-htmlbars';

const FILE_QUEUE_COLUMNS = [
    { name: 'Type', key: 'type' },
    { name: 'Name', key: 'name', valuePath: 'name' },
    { name: 'Size', key: 'fileSize', valuePath: 'size' },
    { name: 'Uploaded', key: 'uploadDate', valuePath: 'uploadedAt' },
    { name: '', key: 'delete' },
];

function queuedFile(overrides = {}) {
    return {
        name: 'deliveries.xlsx',
        size: 2048,
        type: 'application/vnd.ms-excel',
        uploadedAt: new Date(2026, 2, 12),
        ...overrides,
    };
}

function bodyCells() {
    return findAll('tbody td').map((cell) => cell.textContent.trim());
}

function spreadsheetFile(name = 'deliveries.xlsx') {
    return new File(['id,name'], name, { type: 'text/csv' });
}

module('Integration | Component | modals/import-form', function (hooks) {
    setupRenderingTest(hooks);

    let queued;
    let removed;

    hooks.beforeEach(function () {
        queued = [];
        removed = [];
        this.set('options', {
            acceptedFileTypes: ['text/csv', 'application/vnd.ms-excel'],
            queueFile: (file) => queued.push(file),
            removeFile: (file) => removed.push(file),
        });
    });

    const TEMPLATE = hbs`<Modals::ImportForm @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    module('the dropzone', function () {
        test('it invites a spreadsheet upload', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.dropzone').exists();
            assert.dom('.modal-body-container h4').exists('the prompt is shown');
            assert.dom('.modal-body-container').containsText('spreadsheet', 'the copy names what is wanted');
            assert.ok(find('input[type="file"]'), 'a file picker is offered');
        });

        test('the picker accepts only the configured file types', async function (assert) {
            await render(TEMPLATE);

            assert.dom('input[type="file"]').hasAttribute('accept', 'text/csv,application/vnd.ms-excel');
        });

        // The dropzone and the button now share ONE queue named "spreadsheets", with the
        // enclosing file-queue as its only listener — so exactly one call, not two (see #58).
        test('choosing a file through the button queues it exactly once', async function (assert) {
            await render(TEMPLATE);
            await selectFiles(find('input[type="file"]'), spreadsheetFile());

            assert.strictEqual(queued.length, 1, 'the dropzone queue never fires alongside it');
            assert.strictEqual(queued[0].name, 'deliveries.xlsx');
        });

        test('a processing import replaces the dropzone with a spinner', async function (assert) {
            this.set('options', { ...this.options, isProcessing: true });

            await render(TEMPLATE);

            assert.strictEqual(find('.file-dropzone, input[type="file"]'), null, 'no more files can be added');
            assert.dom('.fleetbase-loader').exists('a loading indicator is shown');
        });
    });

    module('the upload queue', function () {
        test('no queue table is shown while nothing is queued', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find('table'), null);
        });

        test('queued files are tabulated under the configured columns', async function (assert) {
            this.set('options', {
                ...this.options,
                fileQueueColumns: FILE_QUEUE_COLUMNS,
                uploadQueue: [queuedFile()],
            });

            await render(TEMPLATE);

            assert.deepEqual(
                findAll('thead th').map((th) => th.textContent.trim()),
                ['Type', 'Name', 'Size', 'Uploaded', '']
            );
            assert.strictEqual(findAll('tbody tr').length, 1);
        });

        test('each column key renders its own kind of cell', async function (assert) {
            this.set('options', {
                ...this.options,
                fileQueueColumns: FILE_QUEUE_COLUMNS,
                uploadQueue: [queuedFile()],
            });

            await render(TEMPLATE);

            const cells = bodyCells();
            assert.strictEqual(cells[1], 'deliveries.xlsx', 'a plain column renders the value');
            assert.strictEqual(cells[2], '2 KB', 'a size column is formatted as bytes');
            assert.strictEqual(cells[3], '12 Mar 2026', 'a date column is formatted');
            assert.ok(findAll('tbody td')[0].querySelector('svg'), 'a type column renders a file icon');
            assert.ok(findAll('tbody td')[4].querySelector('a svg'), 'a delete column renders a control');
        });

        test('every queued file gets a row', async function (assert) {
            this.set('options', {
                ...this.options,
                fileQueueColumns: FILE_QUEUE_COLUMNS,
                uploadQueue: [queuedFile(), queuedFile({ name: 'returns.csv' })],
            });

            await render(TEMPLATE);

            assert.strictEqual(findAll('tbody tr').length, 2);
        });

        test('a queued file can be dropped again', async function (assert) {
            const files = [queuedFile(), queuedFile({ name: 'returns.csv' })];
            this.set('options', { ...this.options, fileQueueColumns: FILE_QUEUE_COLUMNS, uploadQueue: files });

            await render(TEMPLATE);
            await click(findAll('tbody tr')[1].querySelector('a'));

            assert.deepEqual(removed, [files[1]], 'the file beside the clicked control is removed');
        });

        test('a queue with no columns renders empty rows', async function (assert) {
            this.set('options', { ...this.options, uploadQueue: [queuedFile()] });

            await render(TEMPLATE);

            assert.strictEqual(findAll('tbody tr').length, 1);
            assert.deepEqual(bodyCells(), [], 'nothing is rendered without column definitions');
        });
    });

    module('the import template', function () {
        test('no template link is offered unless a handler is supplied', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find('a[download]'), null);
        });

        test('a template link is offered', async function (assert) {
            this.set('options', { ...this.options, onImportTemplate: () => {} });

            await render(TEMPLATE);

            assert.dom('a[download]').hasText('Download Import Template (XLSX)');
        });
    });

    test('it renders with no options at all', async function (assert) {
        await render(hbs`<Modals::ImportForm />`);

        assert.dom('.dropzone').exists();
        assert.dom('.modal-body-container').doesNotContainText('undefined');
    });
});
