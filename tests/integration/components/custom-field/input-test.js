import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, fillIn, find, findAll, settled, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { selectFiles } from 'ember-file-upload/test-support';
import Model from '@ember-data/model';

const HORIZONTAL = [
    [0.1, 0.5],
    [0.35, 0.5],
    [0.6, 0.5],
    [0.9, 0.5],
];

function pointerEvent(type, { x, y, buttons }) {
    return new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
        button: buttons === 0 ? -1 : 0,
        buttons,
        pressure: buttons === 0 ? 0 : 0.5,
        clientX: x,
        clientY: y,
    });
}

async function drawStroke(canvas, points = HORIZONTAL) {
    const rect = canvas.getBoundingClientRect();
    const toClient = ([fx, fy]) => ({ x: rect.left + rect.width * fx, y: rect.top + rect.height * fy });
    const [first, ...rest] = points.map(toClient);
    const last = rest[rest.length - 1] ?? first;

    canvas.dispatchEvent(pointerEvent('pointerdown', { ...first, buttons: 1 }));
    for (const point of rest) {
        window.dispatchEvent(pointerEvent('pointermove', { ...point, buttons: 1 }));
    }
    window.dispatchEvent(pointerEvent('pointerup', { ...last, buttons: 0 }));

    await settled();
}

function createCustomField(attributes = {}) {
    return {
        id: 'custom-field-1',
        name: 'priority',
        label: 'Priority',
        help_text: null,
        required: false,
        component: 'input',
        type: 'input',
        options: [],
        meta: {},
        ...attributes,
    };
}

function createSubject(customFieldValues = []) {
    return {
        id: 'subject-1',
        custom_field_values: customFieldValues,
        get(key) {
            return this[key];
        },
    };
}

module('Integration | Component | custom-field/input', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders a text input with the field label and the existing value from the subject', async function (assert) {
        this.set('customField', createCustomField());
        this.set('subject', createSubject([{ custom_field_uuid: 'custom-field-1', value: 'High' }]));

        await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('label').hasText('Priority');
        assert.dom('input').hasValue('High');
    });

    test('typing into the input calls onChange with the value and the custom field', async function (assert) {
        const customField = createCustomField();
        const changes = [];
        this.set('customField', customField);
        this.set('subject', createSubject());
        this.set('onChange', (value, changedCustomField) => changes.push({ value, changedCustomField }));

        await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} @onChange={{this.onChange}} />`);
        await fillIn('input', 'Low');

        assert.true(changes.length > 0, 'onChange is called');
        const lastChange = changes[changes.length - 1];
        assert.strictEqual(lastChange.value, 'Low', 'onChange receives the input value');
        assert.strictEqual(lastChange.changedCustomField, customField, 'onChange receives the custom field');
    });

    test('it renders a select with the field options and calls onChange on selection', async function (assert) {
        const customField = createCustomField({ component: 'select', type: 'select', options: ['Low', 'Medium', 'High'] });
        const changes = [];
        this.set('customField', customField);
        this.set('subject', createSubject([{ custom_field_uuid: 'custom-field-1', value: 'Medium' }]));
        this.set('onChange', (value, changedCustomField) => changes.push({ value, changedCustomField }));

        await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} @onChange={{this.onChange}} />`);

        const optionValues = findAll('select option')
            .map((option) => option.getAttribute('value'))
            .filter(Boolean);
        assert.deepEqual(optionValues, ['Low', 'Medium', 'High'], 'the custom field options are rendered');
        assert.dom('select').hasValue('Medium', 'the existing subject value is preselected');

        await fillIn('select', 'High');

        assert.strictEqual(changes.length, 1, 'onChange is called once');
        assert.strictEqual(changes[0].value, 'High');
        assert.strictEqual(changes[0].changedCustomField, customField);
    });

    test('it falls back to a text input when the custom field has no component', async function (assert) {
        this.set('customField', createCustomField({ component: undefined }));
        this.set('subject', createSubject());

        await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('input').exists('a text input is rendered as the fallback');
    });

    test('it applies the column span from the custom field meta', async function (assert) {
        this.set('customField', createCustomField({ meta: { colSpan: 2 } }));
        this.set('subject', createSubject());

        await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('.col-span-2').exists('the wrapper uses the configured column span');
    });

    test('it uploads a selected file and reports the file value through onChange', async function (assert) {
        const customField = createCustomField({ component: 'file-upload', type: 'file-upload', name: 'attachment', label: 'Attachment' });
        const changes = [];
        this.set('customField', customField);
        this.set('onChange', (value, changedCustomField) => changes.push({ value, changedCustomField }));

        await render(hbs`<CustomField::Input @customField={{this.customField}} @onChange={{this.onChange}} />`);

        assert.dom('input[type="file"]').exists('a file input is rendered');

        await selectFiles('input[type="file"]', new File(['hello'], 'notes.txt', { type: 'text/plain' }));

        const fetch = this.owner.lookup('service:fetch');
        const uploadCalls = fetch.calls.filter((call) => call.method === 'uploadFile.perform');
        assert.strictEqual(uploadCalls.length, 1, 'the file is uploaded through the fetch service');
        assert.strictEqual(uploadCalls[0].args[1].path, 'uploads/fleet-ops/custom-field-1', 'the upload path is derived from the custom field');
        assert.strictEqual(changes.length, 1, 'onChange is called once the upload completes');
        assert.strictEqual(changes[0].value, 'file:test-file-1', 'onChange receives the uploaded file value');
        assert.dom('.custom-field-file').exists('the uploaded file is rendered');
    });

    // `onChangeHandler` is shared by every sub-component the type map can pick, and each one calls
    // it with a different shape. Until now only the plain `<input>`/`<select>` DOM-event shape ran.
    module('the shapes onChangeHandler accepts', function () {
        test('a radio-button-select reports the chosen option as a raw string', async function (assert) {
            const customField = createCustomField({ component: 'radio-button-select', type: 'radio-button-select', options: ['Low', 'High'] });
            const changes = [];
            this.set('customField', customField);
            this.set('subject', createSubject());
            this.set('onChange', (value, changedCustomField) => changes.push({ value, changedCustomField }));

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} @onChange={{this.onChange}} />`);
            await click('#priority-radio-option-1');

            assert.strictEqual(changes.length, 1, 'the selection is reported once');
            assert.strictEqual(changes[0].value, 'High', 'as the option itself rather than an event');
            assert.strictEqual(changes[0].changedCustomField, customField);
            assert.dom('.radio-group-item.is-checked').exists({ count: 1 }, 'and the field tracks the new value');
        });

        test('a text field records the typed value with no onChange handler', async function (assert) {
            this.set('customField', createCustomField({ component: 'input', type: 'text' }));
            this.set('subject', createSubject());

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);
            await fillIn('input[type="text"]', 'Typed with nobody listening');

            assert.dom('input[type="text"]').hasValue('Typed with nobody listening', 'the value is kept internally');
        });

        test('a radio-button-select still records the value with no onChange handler', async function (assert) {
            this.set('customField', createCustomField({ component: 'radio-button-select', type: 'radio-button-select', options: ['Low', 'High'] }));
            this.set('subject', createSubject());

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);
            await click('#priority-radio-option-0');

            assert.dom('.radio-group-item.is-checked').exists({ count: 1 }, 'the value is kept internally');
        });

        test('a date-time-input reports the formatted string rather than the date instance', async function (assert) {
            const customField = createCustomField({ component: 'date-time-input', type: 'date-time-input' });
            const changes = [];
            this.set('customField', customField);
            this.set('subject', createSubject());
            this.set('onChange', (value, changedCustomField) => changes.push({ value, changedCustomField }));

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} @onChange={{this.onChange}} />`);
            await fillIn('[aria-label="Date Input"]', '2026-06-19');

            assert.strictEqual(changes.length, 1, 'the update is reported once');
            assert.strictEqual(typeof changes[0].value, 'string', 'the second argument wins over the date instance');
            assert.ok(changes[0].value.startsWith('2026-06-19'), `the chosen date is reported (${changes[0].value})`);
            assert.strictEqual(changes[0].changedCustomField, customField);
        });

        test('a date-picker reports the formatted string the same way', async function (assert) {
            const customField = createCustomField({ component: 'date-picker', type: 'date-picker' });
            const changes = [];
            this.set('customField', customField);
            this.set('subject', createSubject());
            this.set('onChange', (value) => changes.push(value));

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} @onChange={{this.onChange}} />`);
            await click('.fleetbase-date-picker');
            await click(findAll('.air-datepicker-cell.-day-')[9]);

            assert.strictEqual(changes.length, 1, 'the pick is reported once');
            assert.strictEqual(typeof changes[0], 'string', 'as the formatted string, not the raw Date');
        });

        test('a date-time-input with no onChange handler does not throw', async function (assert) {
            this.set('customField', createCustomField({ component: 'date-time-input', type: 'date-time-input' }));
            this.set('subject', createSubject());

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);
            await fillIn('[aria-label="Date Input"]', '2026-06-19');

            assert.dom('[aria-label="Date Input"]').hasValue('2026-06-19', 'the input keeps the entered date');
        });
    });

    module('managing an uploaded file', function () {
        const FILE_FIELD = { component: 'file-upload', type: 'file-upload', name: 'attachment', label: 'Attachment' };

        function textFile(name = 'notes.txt') {
            return new File(['hello'], name, { type: 'text/plain' });
        }

        async function uploadOne(context) {
            context.set('customField', createCustomField(FILE_FIELD));

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} @onChange={{this.onChange}} />`);
            await selectFiles('input[type="file"]', textFile());
        }

        test('the uploaded file offers a delete control', async function (assert) {
            await uploadOne(this);

            assert.dom('.custom-field-file').exists();

            await click('.custom-field-file .ember-basic-dropdown-trigger');

            assert.ok(find('.custom-field-file a.text-red-600'), 'a delete action is offered');
        });

        test('deleting the file clears the value and reports it', async function (assert) {
            const changes = [];
            this.set('onChange', (value, customField) => changes.push({ value, customField }));

            await uploadOne(this);
            await click('.custom-field-file .ember-basic-dropdown-trigger');
            await click('.custom-field-file a.text-red-600');

            assert.strictEqual(find('.custom-field-file'), null, 'the file is removed from the field');
            assert.strictEqual(changes.at(-1).value, undefined, 'the value is cleared');
            assert.strictEqual(changes.at(-1).customField.id, 'custom-field-1', 'alongside the custom field');
        });

        test('deleting works without an onChange handler', async function (assert) {
            this.set('customField', createCustomField(FILE_FIELD));

            await render(hbs`<CustomField::Input @customField={{this.customField}} />`);
            await selectFiles('input[type="file"]', textFile());
            await click('.custom-field-file .ember-basic-dropdown-trigger');
            await click('.custom-field-file a.text-red-600');

            assert.strictEqual(find('.custom-field-file'), null);
        });

        test('a failed upload clears the progress state and reports nothing', async function (assert) {
            const changes = [];
            const removedFromQueue = [];
            this.set('onChange', (value) => changes.push(value));
            this.set('customField', createCustomField(FILE_FIELD));

            // The dummy fetch stub always succeeds; swap in a failing perform for this test.
            const fetch = this.owner.lookup('service:fetch');
            fetch.uploadFile.perform = (file, params, onSuccess, onError) => {
                file.queue = { remove: (removed) => removedFromQueue.push(removed) };
                onError(new Error('upload rejected'));

                return Promise.resolve();
            };

            await render(hbs`<CustomField::Input @customField={{this.customField}} @onChange={{this.onChange}} />`);
            await selectFiles('input[type="file"]', textFile());

            assert.strictEqual(find('.custom-field-file'), null, 'no file is attached');
            assert.deepEqual(changes, [], 'nothing is reported to the parent');
            assert.strictEqual(removedFromQueue.length, 1, 'the failed file is dropped from the upload queue');
        });

        test('a failed upload for a file with no queue still clears the progress state', async function (assert) {
            this.set('customField', createCustomField(FILE_FIELD));

            const fetch = this.owner.lookup('service:fetch');
            fetch.uploadFile.perform = (file, params, onSuccess, onError) => {
                // ember-file-upload attaches a queue to every selected file; drop it to reach the
                // half of the guard that a real selection never does.
                file.queue = undefined;
                onError(new Error('upload rejected'));

                return Promise.resolve();
            };

            await render(hbs`<CustomField::Input @customField={{this.customField}} />`);
            await selectFiles('input[type="file"]', textFile());

            assert.strictEqual(find('.custom-field-file'), null, 'nothing is attached');
            assert.dom('input[type="file"]').exists('the field is ready for another attempt');
        });

        test('a subject ember-data cannot name falls back to the generic upload path', async function (assert) {
            const params = [];
            this.set('customField', createCustomField(FILE_FIELD));
            // A plain object is not a Model, so getModelName() returns null for it.
            this.set('subject', { id: 'sub_1', name: 'Not a record' });

            const fetch = this.owner.lookup('service:fetch');
            fetch.uploadFile.perform = (file, uploadParams, onSuccess) => {
                params.push(uploadParams);
                onSuccess({ id: 'file_1', original_filename: file.name });

                return Promise.resolve();
            };

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);
            await selectFiles('input[type="file"]', textFile());

            assert.strictEqual(params.length, 1, 'the upload starts instead of throwing');
            assert.strictEqual(params[0].type, 'custom_field_file', 'and falls back to the generic type');
            // The generic path keys on the custom field, not on a model name it could not resolve.
            assert.strictEqual(params[0].path, 'uploads/fleet-ops/custom-field-1', 'and to the generic path');
        });

        // The other half of the same fork: a subject ember-data DOES recognise gets its model name
        // folded into both the upload path and the file type.
        test('a nameable subject keys the upload on its model name', async function (assert) {
            const params = [];
            this.set('customField', createCustomField(FILE_FIELD));
            this.set('subject', Object.assign(Object.create(Model.prototype), { constructor: { modelName: 'work-order' } }));

            const fetch = this.owner.lookup('service:fetch');
            fetch.uploadFile.perform = (file, uploadParams, onSuccess) => {
                params.push(uploadParams);
                onSuccess({ id: 'file_1', original_filename: file.name });

                return Promise.resolve();
            };

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);
            await selectFiles('input[type="file"]', textFile());

            assert.strictEqual(params.length, 1, 'the upload starts');
            assert.strictEqual(params[0].path, 'uploads/fleet-ops/work-order-cf-files', 'the model name keys the path');
            assert.strictEqual(params[0].type, 'work_order_file', 'and is underscored into the file type');
        });

        test('removing a record-backed file destroys the record', async function (assert) {
            const destroyed = [];
            this.set('customField', createCustomField(FILE_FIELD));

            const uploadedFile = Object.assign(Object.create(Model.prototype), {
                original_filename: 'notes.txt',
                destroyRecord: () => {
                    destroyed.push('destroyed');
                    return Promise.resolve();
                },
            });

            const fetch = this.owner.lookup('service:fetch');
            fetch.uploadFile.perform = (file, uploadParams, onSuccess) => {
                onSuccess(uploadedFile);
                return Promise.resolve();
            };

            await render(hbs`<CustomField::Input @customField={{this.customField}} />`);
            await selectFiles('input[type="file"]', textFile());
            await click('.custom-field-file .ember-basic-dropdown-trigger');
            await click('.custom-field-file a.text-red-600');

            assert.deepEqual(destroyed, ['destroyed'], 'the record is destroyed rather than merely forgotten');
            assert.strictEqual(find('.custom-field-file'), null, 'and the field is cleared');
        });
    });

    module('signature fields', function () {
        function signatureField(overrides = {}) {
            return createCustomField({ name: 'signature', label: 'Signature', type: 'signature-pad', component: 'signature-pad', ...overrides });
        }

        function uploadCalls(context) {
            return context.owner.lookup('service:fetch').calls.filter((call) => call.method === 'uploadFile.perform');
        }

        test('it renders a signature pad for the signature-pad field type', async function (assert) {
            this.set('customField', signatureField());
            this.set('subject', createSubject());

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);

            assert.dom('canvas.signature-pad-canvas').exists('the signature pad is rendered');
            assert.dom('.input-group').includesText('Signature', 'the field label is rendered');
        });

        test('it honours meta.height', async function (assert) {
            this.set('customField', signatureField({ meta: { height: 320 } }));
            this.set('subject', createSubject());

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);

            assert.dom('canvas.signature-pad-canvas').hasStyle({ height: '320px' });
        });

        test('it uploads the signature and emits the file sentinel', async function (assert) {
            const changes = [];
            this.set('customField', signatureField());
            this.set('subject', createSubject());
            this.set('onChange', (value, customField) => changes.push([value, customField]));

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} @uploadDelay={{0}} @onChange={{this.onChange}} />`);
            await drawStroke(document.querySelector('canvas.signature-pad-canvas'));
            await waitUntil(() => uploadCalls(this).length > 0);
            await settled();

            const uploads = uploadCalls(this);
            assert.strictEqual(uploads.length, 1, 'the signature was uploaded once');
            assert.strictEqual(uploads[0].args[0].name, 'signature-signature.png', 'the upload is given a meaningful filename');
            assert.strictEqual(uploads[0].args[0].type, 'image/png', 'the upload is a png');
            assert.ok(uploads[0].args[0].queue, 'the upload is attached to a queue');
            assert.deepEqual(uploads[0].args[1], { path: 'uploads/fleet-ops/custom-field-1', type: 'custom_field_file' }, 'the upload is scoped to the custom field');

            assert.strictEqual(changes.length, 1, 'onChange fired once');
            assert.strictEqual(changes[0][0], 'file:test-file-1', 'the file sentinel was emitted');
            assert.strictEqual(changes[0][1], this.customField, 'the custom field was passed through');
        });

        test('with no @uploadDelay the upload waits out the default debounce', async function (assert) {
            this.set('customField', signatureField());
            this.set('subject', createSubject());

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);
            await drawStroke(document.querySelector('canvas.signature-pad-canvas'));

            assert.strictEqual(uploadCalls(this).length, 0, 'nothing uploads right after the stroke');

            await waitUntil(() => uploadCalls(this).length > 0, { timeout: 3000 });
            assert.strictEqual(uploadCalls(this).length, 1, 'the default 750ms debounce delivers the upload');
        });

        test('it debounces several strokes into a single upload', async function (assert) {
            this.set('customField', signatureField());
            this.set('subject', createSubject());

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} @uploadDelay={{50}} />`);

            const canvas = document.querySelector('canvas.signature-pad-canvas');
            await drawStroke(canvas, HORIZONTAL);
            await drawStroke(canvas, [
                [0.2, 0.2],
                [0.5, 0.4],
                [0.8, 0.3],
            ]);
            await waitUntil(() => uploadCalls(this).length > 0);
            await settled();

            assert.strictEqual(uploadCalls(this).length, 1, 'two strokes produced one upload');
        });

        test('it renders the uploaded file after a successful upload', async function (assert) {
            this.set('customField', signatureField());
            this.set('subject', createSubject());

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} @uploadDelay={{0}} />`);
            await drawStroke(document.querySelector('canvas.signature-pad-canvas'));
            await waitUntil(() => uploadCalls(this).length > 0);
            await settled();

            assert.dom('.custom-field-file').exists('the uploaded signature is shown');
        });

        test('it clears the value when the signature is cleared', async function (assert) {
            const changes = [];
            this.set('customField', signatureField());
            this.set('subject', createSubject());
            this.set('onChange', (value) => changes.push(value));

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} @uploadDelay={{0}} @onChange={{this.onChange}} />`);
            await drawStroke(document.querySelector('canvas.signature-pad-canvas'));
            await waitUntil(() => uploadCalls(this).length > 0);
            await settled();

            await click('.signature-pad-clear-button');

            assert.strictEqual(changes[changes.length - 1], undefined, 'the value was cleared');
            assert.dom('.custom-field-file').doesNotExist('the uploaded signature was removed');
            assert.strictEqual(uploadCalls(this).length, 1, 'clearing does not trigger another upload');
        });

        test('it rehydrates an existing signature from the stored file json', async function (assert) {
            this.set('customField', signatureField());
            this.set('subject', createSubject([{ custom_field_uuid: 'custom-field-1', value: JSON.stringify({ uuid: 'file_9', url: 'https://files.test/existing.png' }) }]));

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);

            assert.dom('canvas.signature-pad-canvas').exists('the pad is rendered for an existing value');
            assert.strictEqual(uploadCalls(this).length, 0, 'rendering an existing value does not upload anything');
        });

        test('it does not rehydrate from an unexpanded file sentinel', async function (assert) {
            this.set('customField', signatureField());
            this.set('subject', createSubject([{ custom_field_uuid: 'custom-field-1', value: 'file:file_9' }]));

            await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);

            assert.dom('canvas.signature-pad-canvas').exists('the pad still renders');
        });
    });
});
