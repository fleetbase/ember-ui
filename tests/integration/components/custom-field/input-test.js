import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, render, settled, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import EmberObject from '@ember/object';
import Service from '@ember/service';
import { helper } from '@ember/component/helper';
import { setComponentTemplate } from '@ember/component';
import GlimmerComponent from '@glimmer/component';

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

/**
 * `custom-field/input.js` imports several `@fleetbase/ember-core` utilities, and that
 * addon is a peer of the host application rather than a dependency of this one — the
 * dummy app cannot resolve it, so the component module fails to load here. Installing
 * it pulls in the whole ember-data stack, which is well beyond what this addon's test
 * app is set up for. These tests are therefore skipped in the dummy app and run as
 * written wherever `@fleetbase/ember-core` is present.
 */
const canRenderCustomFields = typeof window.require === 'function' && window.require.has('@fleetbase/ember-core/utils/is-object');
const maybeTest = canRenderCustomFields ? test : test.skip;

module('Integration | Component | custom-field/input', function (hooks) {
    setupRenderingTest(hooks);

    let uploads;

    /**
     * `custom-field/input.hbs` is one template with a branch per field type, and Glimmer
     * resolves every component reference in it at compile time. A few of those branches
     * depend on things the dummy app cannot provide — ember-intl for `{{t}}`, an
     * `ember-radio-button` install, and an `@fleetbase/ember-core` new enough to export
     * `lookup-user-ip` — so the whole template fails to compile in this environment.
     * None of them are on the signature-pad branch, so they are stubbed out here.
     */
    function stubUnrenderedBranches(owner) {
        for (const name of ['phone-input', 'radio-button']) {
            owner.register(`component:${name}`, setComponentTemplate(hbs``, class extends GlimmerComponent {}));
        }

        owner.register(
            'helper:t',
            helper(([key]) => key)
        );
    }

    hooks.beforeEach(function () {
        uploads = [];
        stubUnrenderedBranches(this.owner);

        this.owner.register(
            'service:fetch',
            class FetchStub extends Service {
                uploadFile = {
                    perform: (file, params, onSuccess) => {
                        uploads.push({ file, params });
                        const uploadedFile = {
                            id: `file_${uploads.length}`,
                            url: 'https://files.test/signature.png',
                            original_filename: file.name,
                            content_type: file.type,
                        };

                        if (typeof onSuccess === 'function') {
                            onSuccess(uploadedFile);
                        }

                        return Promise.resolve(uploadedFile);
                    },
                };
            }
        );

        this.subject = EmberObject.create({ custom_field_values: [] });
    });

    function signatureField(overrides = {}) {
        return EmberObject.create({
            id: 'cf_signature',
            name: 'signature',
            label: 'Signature',
            type: 'signature-pad',
            component: 'signature-pad',
            required: false,
            meta: {},
            ...overrides,
        });
    }

    maybeTest('it renders a text input for the input field type', async function (assert) {
        this.set('customField', EmberObject.create({ id: 'cf_text', name: 'notes', label: 'Notes', type: 'input', component: 'input', meta: {} }));

        await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('input').exists('the input branch still renders');
        assert.dom('canvas.signature-pad-canvas').doesNotExist();
    });

    maybeTest('it renders a signature pad for the signature-pad field type', async function (assert) {
        this.set('customField', signatureField());

        await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('canvas.signature-pad-canvas').exists('the signature pad is rendered');
        assert.dom('.input-group').includesText('Signature', 'the field label is rendered');
    });

    maybeTest('it honours meta.height', async function (assert) {
        this.set('customField', signatureField({ meta: { height: 320 } }));

        await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('canvas.signature-pad-canvas').hasStyle({ height: '320px' });
    });

    maybeTest('it uploads the signature and emits the file sentinel', async function (assert) {
        const changes = [];
        this.set('customField', signatureField());
        this.set('onChange', (value, customField) => changes.push([value, customField]));

        await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} @uploadDelay={{0}} @onChange={{this.onChange}} />`);
        await drawStroke(document.querySelector('canvas.signature-pad-canvas'));
        await waitUntil(() => uploads.length > 0);
        await settled();

        assert.strictEqual(uploads.length, 1, 'the signature was uploaded once');
        assert.strictEqual(uploads[0].file.name, 'signature-signature.png', 'the upload is given a meaningful filename');
        assert.strictEqual(uploads[0].file.type, 'image/png', 'the upload is a png');
        assert.ok(uploads[0].file.queue, 'the upload is attached to a queue');
        assert.deepEqual(uploads[0].params, { path: 'uploads/fleet-ops/cf_signature', type: 'custom_field_file' }, 'the upload is scoped to the custom field');

        assert.strictEqual(changes.length, 1, 'onChange fired once');
        assert.strictEqual(changes[0][0], 'file:file_1', 'the file sentinel was emitted');
        assert.strictEqual(changes[0][1], this.customField, 'the custom field was passed through');
    });

    maybeTest('it debounces several strokes into a single upload', async function (assert) {
        this.set('customField', signatureField());

        await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} @uploadDelay={{50}} />`);

        const canvas = document.querySelector('canvas.signature-pad-canvas');
        await drawStroke(canvas, HORIZONTAL);
        await drawStroke(canvas, [
            [0.2, 0.2],
            [0.5, 0.4],
            [0.8, 0.3],
        ]);
        await waitUntil(() => uploads.length > 0);
        await settled();

        assert.strictEqual(uploads.length, 1, 'two strokes produced one upload');
    });

    maybeTest('it renders the uploaded file after a successful upload', async function (assert) {
        this.set('customField', signatureField());

        await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} @uploadDelay={{0}} />`);
        await drawStroke(document.querySelector('canvas.signature-pad-canvas'));
        await waitUntil(() => uploads.length > 0);
        await settled();

        assert.dom('.custom-field-file').exists('the uploaded signature is shown');
    });

    maybeTest('it clears the value when the signature is cleared', async function (assert) {
        const changes = [];
        this.set('customField', signatureField());
        this.set('onChange', (value) => changes.push(value));

        await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} @uploadDelay={{0}} @onChange={{this.onChange}} />`);
        await drawStroke(document.querySelector('canvas.signature-pad-canvas'));
        await waitUntil(() => uploads.length > 0);
        await settled();

        await click('.signature-pad-clear-button');

        assert.strictEqual(changes[changes.length - 1], undefined, 'the value was cleared');
        assert.dom('.custom-field-file').doesNotExist('the uploaded signature was removed');
        assert.strictEqual(uploads.length, 1, 'clearing does not trigger another upload');
    });

    maybeTest('it rehydrates an existing signature from the stored file json', async function (assert) {
        this.subject = EmberObject.create({
            custom_field_values: [{ custom_field_uuid: 'cf_signature', value: JSON.stringify({ uuid: 'file_9', url: 'https://files.test/existing.png' }) }],
        });
        this.set('customField', signatureField());

        await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('canvas.signature-pad-canvas').exists('the pad is rendered for an existing value');
        assert.strictEqual(uploads.length, 0, 'rendering an existing value does not upload anything');
    });

    maybeTest('it does not rehydrate from an unexpanded file sentinel', async function (assert) {
        this.subject = EmberObject.create({
            custom_field_values: [{ custom_field_uuid: 'cf_signature', value: 'file:file_9' }],
        });
        this.set('customField', signatureField());

        await render(hbs`<CustomField::Input @customField={{this.customField}} @subject={{this.subject}} />`);

        assert.dom('canvas.signature-pad-canvas').exists('the pad still renders');
        assert.dom('.signature-pad-placeholder').exists('the pad is empty because the sentinel carries no url');
    });
});
