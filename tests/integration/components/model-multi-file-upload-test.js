import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, findAll, settled } from '@ember/test-helpers';
import { selectFiles } from 'ember-file-upload/test-support';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { task } from 'ember-concurrency';

// The component only asks a subject for `get('isNew')` and `id`. getModelName() names it
// only when it is a real ember-data record, so a duck-typed subject reports a null type.
function subjectRecord({ id = 'sub_1', isNew = false } = {}) {
    return { id, get: (key) => (key === 'isNew' ? isNew : undefined) };
}

function textFile(name = 'notes.txt') {
    return new File(['hello'], name, { type: 'text/plain' });
}

function deferred() {
    let resolve;
    const promise = new Promise((r) => (resolve = r));
    return { promise, resolve };
}

module('Integration | Component | model-multi-file-upload', function (hooks) {
    setupRenderingTest(hooks);

    let uploads;
    let uploadHandler;

    hooks.beforeEach(function () {
        uploads = [];
        // The default upload succeeds immediately with a persisted file.
        uploadHandler = (file, params, callback) => callback({ id: 'file_1', original_filename: file.name });

        this.owner.unregister('service:fetch');
        this.owner.register(
            'service:fetch',
            class extends Service {
                @task
                *uploadFile(file, params, callback, errorCallback) {
                    uploads.push({ file, params });
                    yield uploadHandler(file, params, callback, errorCallback);
                }
            }
        );

        this.set('type', 'order_document');
    });

    const TEMPLATE = hbs`
        <ModelMultiFileUpload
            @type={{this.type}}
            @subject={{this.subject}}
            @path={{this.path}}
            @acceptedFileTypes={{this.acceptedFileTypes}}
            @uploadParams={{this.uploadParams}}
            @files={{this.files}}
            @onUploaded={{this.onUploaded}}
        />
    `;

    function fileInput() {
        return find('input[type="file"]');
    }

    // One upload per file: the enclosing (file-queue name="files") is the only listener now
    // that the inner <FileUpload> no longer registers its own @onFileAdded.
    const UPLOADS_PER_FILE = 1;

    module('the dropzone', function () {
        test('it renders a dropzone inviting an upload', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.dropzone').exists();
            assert.dom('.file-dropzone').exists();
            assert.ok(fileInput(), 'a file picker is offered');
            assert.dom('a.btn-magic').exists('a select-files control is offered alongside the dropzone');
        });

        test('the picker can select more than one file', async function (assert) {
            await render(TEMPLATE);

            assert.dom(fileInput()).hasAttribute('multiple');
        });

        test('by default it accepts the documented document, image, video, audio and archive types', async function (assert) {
            await render(TEMPLATE);

            const accept = fileInput().getAttribute('accept');
            assert.true(accept.includes('application/pdf'), 'pdfs are accepted');
            assert.true(accept.includes('image/png'), 'images are accepted');
            assert.true(accept.includes('video/mp4'), 'video is accepted');
            assert.true(accept.includes('audio/mpeg'), 'audio is accepted');
            assert.true(accept.includes('application/zip'), 'archives are accepted');
        });

        test('an explicit list of accepted types replaces the defaults', async function (assert) {
            this.set('acceptedFileTypes', ['image/png', 'image/gif']);

            await render(TEMPLATE);

            assert.dom(fileInput()).hasAttribute('accept', 'image/png,image/gif');
        });

        test('a comma separated string of accepted types is split apart', async function (assert) {
            this.set('acceptedFileTypes', 'image/png,application/pdf');

            await render(TEMPLATE);

            assert.dom(fileInput()).hasAttribute('accept', 'image/png,application/pdf');
        });

        test('an accepted-types value that is neither a list nor a string accepts nothing', async function (assert) {
            this.set('acceptedFileTypes', 42);

            await render(TEMPLATE);

            assert.dom(fileInput()).hasAttribute('accept', '');
        });
    });

    module('uploading', function () {
        test('choosing a file uploads it under a path derived from the type', async function (assert) {
            await render(TEMPLATE);
            await selectFiles(fileInput(), textFile());

            assert.strictEqual(uploads.length, UPLOADS_PER_FILE, 'the file is uploaded exactly once');
            assert.strictEqual(uploads[0].params.path, 'uploads/order-document', 'the type is dasherized into the path');
            assert.strictEqual(uploads[0].params.type, 'order_document', 'the type is sent underscored');
        });

        test('an explicit path wins over the derived one', async function (assert) {
            this.set('path', 'uploads/custom-folder');

            await render(TEMPLATE);
            await selectFiles(fileInput(), textFile());

            assert.strictEqual(uploads[0].params.path, 'uploads/custom-folder');
        });

        test('a persisted subject is attached to the upload', async function (assert) {
            this.set('subject', subjectRecord());

            await render(TEMPLATE);
            await selectFiles(fileInput(), textFile());

            assert.strictEqual(uploads[0].params.subject_uuid, 'sub_1', 'the owning record is named');
            assert.strictEqual(uploads[0].params.subject_type, null, 'a non-ember-data subject has no resolvable model name');
        });

        test('an unsaved subject is not attached', async function (assert) {
            this.set('subject', subjectRecord({ id: null, isNew: true }));

            await render(TEMPLATE);
            await selectFiles(fileInput(), textFile());

            assert.notOk('subject_uuid' in uploads[0].params, 'a record with no id cannot own the upload yet');
            assert.notOk('subject_type' in uploads[0].params);
        });

        test('with no subject nothing is attached', async function (assert) {
            await render(TEMPLATE);
            await selectFiles(fileInput(), textFile());

            assert.notOk('subject_uuid' in uploads[0].params);
        });

        test('extra upload params are merged in', async function (assert) {
            this.set('uploadParams', { meta: { source: 'inbox' } });

            await render(TEMPLATE);
            await selectFiles(fileInput(), textFile());

            assert.deepEqual(uploads[0].params.meta, { source: 'inbox' });
            assert.strictEqual(uploads[0].params.path, 'uploads/order-document', 'the derived params survive the merge');
        });

        test('a successful upload is reported and clears the queue', async function (assert) {
            const uploaded = [];
            this.set('onUploaded', (file) => uploaded.push(file));

            await render(TEMPLATE);
            await selectFiles(fileInput(), textFile('contract.txt'));

            assert.strictEqual(uploaded.length, UPLOADS_PER_FILE, 'the parent is told about the new file');
            assert.strictEqual(uploaded[0].original_filename, 'contract.txt');
            assert.dom('.dropzone').exists('the dropzone is offered again');
            assert.strictEqual(findAll('.bg-blue-100').length, 0, 'nothing is left queued');
        });

        test('it uploads happily without an onUploaded handler', async function (assert) {
            await render(TEMPLATE);
            await selectFiles(fileInput(), textFile());

            assert.strictEqual(uploads.length, UPLOADS_PER_FILE);
            assert.strictEqual(findAll('.bg-blue-100').length, 0, 'the queue still drains');
        });

        // A file that is no longer attached to a queue — the queue may already have dropped it —
        // is still taken out of the component's own list.
        test('a file with no queue behind it still leaves the list', async function (assert) {
            uploadHandler = (file, params, callback, errorCallback) => {
                file.queue = undefined;
                errorCallback(new Error('rejected'));
            };

            await render(TEMPLATE);
            await selectFiles(fileInput(), textFile());

            assert.strictEqual(findAll('.bg-blue-100').length, 0, 'the queue still drains');
            assert.dom('.dropzone').exists('and nothing throws');
        });

        test('a failed upload also clears the queue', async function (assert) {
            const uploaded = [];
            this.set('onUploaded', (file) => uploaded.push(file));
            uploadHandler = (file, params, callback, errorCallback) => errorCallback(new Error('rejected'));

            await render(TEMPLATE);
            await selectFiles(fileInput(), textFile());

            assert.deepEqual(uploaded, [], 'nothing is reported as uploaded');
            assert.strictEqual(findAll('.bg-blue-100').length, 0, 'the failed file is not left queued');
            assert.dom('.dropzone').exists('the dropzone recovers');
        });

        test('an upload that blows up is swallowed rather than breaking the page', async function (assert) {
            uploadHandler = () => {
                throw new Error('network down');
            };

            await render(TEMPLATE);
            await selectFiles(fileInput(), textFile());

            assert.dom('.dropzone').exists('the component survives');
        });

        test('an upload in flight shows a spinner and lists the queued file', async function (assert) {
            const pending = deferred();
            uploadHandler = () => pending.promise;

            await render(TEMPLATE);
            selectFiles(fileInput(), textFile('big-video.mp4'));
            await settled();

            assert.dom('.dropzone').containsText('Uploading...', 'the dropzone is replaced by a progress state');
            assert.strictEqual(find('.file-dropzone'), null, 'no further files can be dropped mid-upload');
            assert.dom('.bg-blue-100').containsText('big-video.mp4', 'the queued file is listed by name');
            assert.dom('.bg-blue-100').containsText('%', 'with its progress');

            pending.resolve();
            await settled();

            assert.dom('.file-dropzone').exists('the dropzone comes back once the upload settles');
        });
    });

    module('already uploaded files', function (hooks) {
        hooks.beforeEach(function () {
            this.set('files', [
                { id: 'file_1', original_filename: 'contract.pdf', content_type: 'application/pdf', destroyRecord: () => Promise.resolve() },
                { id: 'file_2', original_filename: 'notes.txt', content_type: 'text/plain', destroyRecord: () => Promise.resolve() },
            ]);
        });

        test('every file is listed', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(findAll('[id^="file-actions-"]').length, 2, 'one entry per file');
        });

        test('a file can be deleted', async function (assert) {
            let destroyed = null;
            this.files[0].destroyRecord = function () {
                destroyed = this;
                return Promise.resolve();
            };

            await render(TEMPLATE);
            await click('#file-actions-file_1 .ember-basic-dropdown-trigger');
            await click('#file-actions-file_1 a.text-red-600');

            assert.strictEqual(destroyed, this.files[0], 'the chosen file is destroyed');
        });

        test('a delete that fails is swallowed rather than breaking the page', async function (assert) {
            this.files[0].destroyRecord = () => Promise.reject(new Error('locked'));

            await render(TEMPLATE);
            await click('#file-actions-file_1 .ember-basic-dropdown-trigger');
            await click('#file-actions-file_1 a.text-red-600');

            assert.dom('.dropzone').exists('the uploader survives');
        });
    });

    test('it renders with no arguments at all', async function (assert) {
        await render(hbs`<ModelMultiFileUpload />`);

        assert.dom('.dropzone').exists();
        assert.dom(this.element).doesNotContainText('undefined');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<ModelMultiFileUpload data-test-uploader="yes" />`);

        assert.dom('[data-test-uploader="yes"]').exists();
    });
});
