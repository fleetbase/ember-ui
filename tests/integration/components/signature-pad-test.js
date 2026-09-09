import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { click, clearRender, render, rerender, settled, waitUntil } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// An 8x8 opaque red png, used to exercise @value rehydration.
const RED_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAEklEQVR4nGP4z8DwHx9mGBkKAMLXf4EvceABAAAAAElFTkSuQmCC';

const DIAGONAL = [
    [0.1, 0.2],
    [0.3, 0.45],
    [0.5, 0.6],
    [0.7, 0.75],
    [0.9, 0.85],
];

const HORIZONTAL = [
    [0.1, 0.5],
    [0.35, 0.5],
    [0.6, 0.5],
    [0.9, 0.5],
];

/**
 * signature_pad v5 drives drawing off PointerEvents in Chrome, and is picky about
 * the init dict:
 *   pointerdown -> (buttons & 1) === 1
 *   pointermove -> buttons === 1, strictly
 *   pointerup   -> buttons must be falsy, otherwise the handler bails and the
 *                  `endStroke` event is never dispatched
 * It also captures `pointerId` on pointerdown and ignores later events carrying a
 * different one, so every event in a stroke shares an id.
 */
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

/**
 * Draws a stroke across the canvas. Points are fractions of the canvas box so the
 * helper stays correct under the `transform: scale()` applied to `#ember-testing` —
 * getBoundingClientRect() reports the post transform box, which is the same space
 * signature_pad reads clientX/clientY in.
 *
 * pointerdown has to go to the canvas (the only element with that listener), while
 * pointermove/pointerup go to the window, where signature_pad binds them for the
 * duration of a stroke.
 */
async function drawStroke(canvas, points = DIAGONAL) {
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

function getCanvas() {
    return document.querySelector('canvas.signature-pad-canvas');
}

function imageData(canvas) {
    return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
}

/** True when every channel of every pixel is zero, ie. nothing was painted. */
function canvasIsBlank(canvas) {
    return !imageData(canvas).some((channel) => channel !== 0);
}

/** True when the canvas contains at least one pixel close to the given rgb triplet. */
function canvasHasColor(canvas, [r, g, b], tolerance = 60) {
    const data = imageData(canvas);

    for (let index = 0; index < data.length; index += 4) {
        if (data[index + 3] < 200) {
            continue;
        }

        if (Math.abs(data[index] - r) <= tolerance && Math.abs(data[index + 1] - g) <= tolerance && Math.abs(data[index + 2] - b) <= tolerance) {
            return true;
        }
    }

    return false;
}

module('Integration | Component | signature-pad', function (hooks) {
    setupRenderingTest(hooks);

    let OriginalResizeObserver;
    let resizeCallbacks;

    hooks.beforeEach(function () {
        resizeCallbacks = [];
        OriginalResizeObserver = window.ResizeObserver;

        window.ResizeObserver = class ResizeObserver {
            constructor(callback) {
                this.callback = callback;
                resizeCallbacks.push(callback);
            }
            observe() {}
            disconnect() {
                resizeCallbacks = resizeCallbacks.filter((callback) => callback !== this.callback);
            }
        };
    });

    hooks.afterEach(function () {
        window.ResizeObserver = OriginalResizeObserver;
        resizeCallbacks = [];
    });

    /** Captures the imperative api and waits for the pad to finish mounting. */
    function trackReady(context) {
        const state = {};
        context.set('onReady', (api) => (state.api = api));
        return state;
    }

    module('rendering', function () {
        test('it renders a canvas, the placeholder and the toolbar', async function (assert) {
            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} />`);

            assert.dom('.signature-pad').exists();
            assert.dom('canvas.signature-pad-canvas').exists();
            assert.dom('.signature-pad-placeholder').hasText('Sign here');
            assert.dom('.signature-pad-clear-button').isDisabled('clear is disabled while empty');
            assert.dom('.signature-pad-undo-button').isDisabled('undo is disabled while empty');
        });

        test('it applies @height to the surface', async function (assert) {
            await render(hbs`<SignaturePad @height={{240}} @throttle={{0}} @minDistance={{0}} />`);

            assert.dom('canvas.signature-pad-canvas').hasStyle({ height: '240px' });
        });

        test('it sizes the canvas backing store for the device pixel ratio', async function (assert) {
            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} />`);

            const canvas = getCanvas();
            const ratio = Math.max(window.devicePixelRatio || 1, 1);

            assert.ok(canvas.offsetWidth > 0, 'the canvas has a rendered width');
            assert.strictEqual(canvas.width, Math.round(canvas.offsetWidth * ratio), 'backing store width matches the pixel ratio');
            assert.strictEqual(canvas.height, Math.round(canvas.offsetHeight * ratio), 'backing store height matches the pixel ratio');
        });

        test('it splats attributes onto the canvas', async function (assert) {
            await render(hbs`<SignaturePad @throttle={{0}} @minDistance={{0}} data-signature="delivery" />`);

            assert.dom('canvas.signature-pad-canvas').hasAttribute('data-signature', 'delivery');
        });

        test('it applies @wrapperClass, @canvasClass and @toolbarClass', async function (assert) {
            await render(hbs`<SignaturePad @throttle={{0}} @minDistance={{0}} @wrapperClass="w" @canvasClass="c" @toolbarClass="t" />`);

            assert.dom('.signature-pad').hasClass('w');
            assert.dom('canvas.signature-pad-canvas').hasClass('c');
            assert.dom('.signature-pad-toolbar').hasClass('t');
        });

        test('it hides the toolbar with @showActions={{false}}', async function (assert) {
            await render(hbs`<SignaturePad @throttle={{0}} @minDistance={{0}} @showActions={{false}} />`);

            assert.dom('.signature-pad-toolbar').doesNotExist();
        });

        test('it uses the supplied labels', async function (assert) {
            await render(hbs`<SignaturePad @throttle={{0}} @minDistance={{0}} @placeholder="Firma aquí" @clearLabel="Borrar" @undoLabel="Deshacer" />`);

            assert.dom('.signature-pad-placeholder').hasText('Firma aquí');
            assert.dom('.signature-pad-clear-button').hasText('Borrar');
            assert.dom('.signature-pad-undo-button').hasText('Deshacer');
        });
    });

    module('drawing', function () {
        test('a stroke paints the canvas and records a point group', async function (assert) {
            const state = trackReady(this);
            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @onReady={{this.onReady}} />`);
            await waitUntil(() => state.api);

            const canvas = getCanvas();
            assert.true(canvasIsBlank(canvas), 'the canvas starts blank');

            await drawStroke(canvas);

            assert.false(canvasIsBlank(canvas), 'ink reached the bitmap');
            assert.false(state.api.isEmpty(), 'the pad reports itself as signed');
            assert.strictEqual(state.api.toData().length, 1, 'one point group was recorded');
        });

        test('it hides the placeholder and enables the toolbar once signed', async function (assert) {
            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} />`);

            assert.dom('.signature-pad-placeholder').exists();

            await drawStroke(getCanvas());

            assert.dom('.signature-pad-placeholder').doesNotExist();
            assert.dom('.signature-pad-clear-button').isNotDisabled();
            assert.dom('.signature-pad-undo-button').isNotDisabled();
        });

        test('it records one point group per stroke', async function (assert) {
            const state = trackReady(this);
            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @onReady={{this.onReady}} />`);
            await waitUntil(() => state.api);

            const canvas = getCanvas();
            await drawStroke(canvas, DIAGONAL);
            await drawStroke(canvas, HORIZONTAL);

            assert.strictEqual(state.api.toData().length, 2, 'two point groups were recorded');
        });
    });

    module('callbacks', function () {
        test('it calls @onChange once per stroke with a png data url', async function (assert) {
            const changes = [];
            this.set('onChange', (dataUrl) => changes.push(dataUrl));

            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @onChange={{this.onChange}} />`);
            await drawStroke(getCanvas());

            assert.strictEqual(changes.length, 1, 'onChange fired exactly once');
            assert.ok(changes[0].startsWith('data:image/png;base64,'), 'a png data url was emitted');
        });

        test('it calls @onBegin and @onEnd around a stroke', async function (assert) {
            assert.expect(5);

            this.set('onBegin', (detail) => {
                assert.step('begin');
                assert.strictEqual(detail.type, 'pointerdown', 'onBegin receives the raw signature event detail');
            });
            this.set('onEnd', (dataUrl) => {
                assert.step('end');
                assert.ok(dataUrl.startsWith('data:image/png'), 'onEnd receives the exported signature');
            });

            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @onBegin={{this.onBegin}} @onEnd={{this.onEnd}} />`);
            await drawStroke(getCanvas());

            assert.verifySteps(['begin', 'end']);
        });

        test('it calls @onReady with a working imperative api', async function (assert) {
            const state = trackReady(this);
            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @onReady={{this.onReady}} />`);
            await waitUntil(() => state.api);

            for (const method of ['clear', 'undo', 'resize', 'isEmpty', 'toData', 'toDataURL', 'fromDataURL', 'instance']) {
                assert.strictEqual(typeof state.api[method], 'function', `api.${method} is callable`);
            }

            assert.true(state.api.isEmpty(), 'api reports an empty pad');
            assert.strictEqual(state.api.toDataURL(), null, 'api returns null while empty');

            await drawStroke(getCanvas());

            assert.ok(state.api.toDataURL().startsWith('data:image/png'), 'api exports the signature');
        });

        test('it yields the api to the block', async function (assert) {
            await render(hbs`
                <SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} as |pad|>
                    <button type="button" class="custom-reset" {{on "click" pad.clear}}>Reset</button>
                </SignaturePad>
            `);

            const canvas = getCanvas();
            await drawStroke(canvas);
            assert.false(canvasIsBlank(canvas), 'the pad is signed');

            await click('.custom-reset');

            assert.true(canvasIsBlank(canvas), 'the yielded clear action cleared the pad');
        });
    });

    module('clear and undo', function () {
        test('it clears the pad and emits null', async function (assert) {
            const state = trackReady(this);
            const changes = [];
            this.set('onChange', (dataUrl) => changes.push(dataUrl));

            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @onReady={{this.onReady}} @onChange={{this.onChange}} />`);
            await waitUntil(() => state.api);

            const canvas = getCanvas();
            await drawStroke(canvas);
            await click('.signature-pad-clear-button');

            assert.true(canvasIsBlank(canvas), 'the bitmap was wiped');
            assert.true(state.api.isEmpty(), 'the pad reports itself as empty');
            assert.strictEqual(state.api.toData().length, 0, 'the point groups were dropped');
            assert.strictEqual(changes[changes.length - 1], null, 'onChange emitted null');
            assert.dom('.signature-pad-placeholder').exists('the placeholder came back');
        });

        test('it calls @onClear', async function (assert) {
            assert.expect(1);
            this.set('onClear', () => assert.ok(true, 'onClear fired'));

            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @onClear={{this.onClear}} />`);
            await drawStroke(getCanvas());
            await click('.signature-pad-clear-button');
        });

        test('it undoes only the last stroke', async function (assert) {
            const state = trackReady(this);
            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @onReady={{this.onReady}} />`);
            await waitUntil(() => state.api);

            const canvas = getCanvas();
            await drawStroke(canvas, DIAGONAL);
            await drawStroke(canvas, HORIZONTAL);

            await click('.signature-pad-undo-button');

            assert.strictEqual(state.api.toData().length, 1, 'one point group survived');
            assert.false(state.api.isEmpty(), 'the pad is still signed');
            assert.false(canvasIsBlank(canvas), 'the remaining stroke is still painted');

            await click('.signature-pad-undo-button');

            assert.strictEqual(state.api.toData().length, 0, 'the last point group was removed');
            assert.true(state.api.isEmpty(), 'the pad is empty again');
        });

        test('it keeps a hydrated signature when undoing a stroke drawn on top of it', async function (assert) {
            const state = trackReady(this);
            this.set('value', RED_PNG);

            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @value={{this.value}} @onReady={{this.onReady}} />`);
            await waitUntil(() => state.api);

            const canvas = getCanvas();
            await waitUntil(() => !canvasIsBlank(canvas));

            await drawStroke(canvas, HORIZONTAL);
            assert.strictEqual(state.api.toData().length, 1, 'the new stroke was recorded');

            await click('.signature-pad-undo-button');
            await waitUntil(() => state.api.toData().length === 0);

            assert.false(canvasIsBlank(canvas), 'the hydrated signature survived the undo');
            assert.true(canvasHasColor(canvas, [255, 0, 0]), 'the hydrated signature is still red');
        });

        test('undo falls back to clear when the only ink is a hydrated signature', async function (assert) {
            const state = trackReady(this);
            const changes = [];
            this.set('value', RED_PNG);
            this.set('onChange', (dataUrl) => changes.push(dataUrl));

            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @value={{this.value}} @onReady={{this.onReady}} @onChange={{this.onChange}} />`);
            await waitUntil(() => state.api);

            const canvas = getCanvas();
            await waitUntil(() => !canvasIsBlank(canvas));

            await click('.signature-pad-undo-button');

            assert.true(canvasIsBlank(canvas), 'the pad was cleared');
            assert.strictEqual(changes[changes.length - 1], null, 'onChange emitted null');
        });
    });

    module('@value rehydration', function () {
        test('it renders an existing signature', async function (assert) {
            const state = trackReady(this);
            this.set('value', RED_PNG);

            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @value={{this.value}} @onReady={{this.onReady}} />`);
            await waitUntil(() => state.api);

            const canvas = getCanvas();
            await waitUntil(() => !canvasIsBlank(canvas));

            assert.true(canvasHasColor(canvas, [255, 0, 0]), 'the hydrated image was painted');
            assert.false(state.api.isEmpty(), 'the pad reports itself as signed');
            assert.dom('.signature-pad-placeholder').doesNotExist('the placeholder is hidden');
        });

        test('it rehydrates when @value changes', async function (assert) {
            this.set('value', null);
            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @value={{this.value}} />`);

            const canvas = getCanvas();
            assert.true(canvasIsBlank(canvas), 'nothing is painted without a value');

            this.set('value', RED_PNG);
            await waitUntil(() => !canvasIsBlank(canvas));

            assert.true(canvasHasColor(canvas, [255, 0, 0]), 'the new value was painted');
        });

        test('it clears when @value is set to null', async function (assert) {
            this.set('value', RED_PNG);
            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @value={{this.value}} />`);

            const canvas = getCanvas();
            await waitUntil(() => !canvasIsBlank(canvas));

            this.set('value', null);
            await settled();

            assert.true(canvasIsBlank(canvas), 'the pad was cleared');
        });

        test('it ignores the echo of its own @onChange output', async function (assert) {
            const state = trackReady(this);
            let changeCount = 0;
            this.set('value', null);
            this.set('onChange', (dataUrl) => {
                changeCount += 1;
                this.set('value', dataUrl);
            });

            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @value={{this.value}} @onChange={{this.onChange}} @onReady={{this.onReady}} />`);
            await waitUntil(() => state.api);
            await drawStroke(getCanvas());

            assert.strictEqual(changeCount, 1, 'a two way bound @value does not re-trigger onChange');
            assert.strictEqual(state.api.toData().length, 1, 'the drawn stroke was not flattened into a raster');
        });

        test('it survives an unloadable @value', async function (assert) {
            const state = trackReady(this);
            this.set('value', 'data:image/png;base64,not-a-real-image');

            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @value={{this.value}} @onReady={{this.onReady}} />`);
            await waitUntil(() => state.api);

            const canvas = getCanvas();
            await drawStroke(canvas);

            assert.false(canvasIsBlank(canvas), 'the pad is still usable after a bad value');
            assert.strictEqual(state.api.toData().length, 1, 'the stroke was recorded');
        });
    });

    module('disabled and readonly', function () {
        test('@disabled ignores pointer input', async function (assert) {
            const changes = [];
            this.set('onChange', (dataUrl) => changes.push(dataUrl));

            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @disabled={{true}} @onChange={{this.onChange}} />`);

            const canvas = getCanvas();
            await drawStroke(canvas);

            assert.true(canvasIsBlank(canvas), 'nothing was drawn');
            assert.strictEqual(changes.length, 0, 'onChange never fired');
            assert.dom('.signature-pad').hasClass('signature-pad-is-disabled');
            assert.dom('.signature-pad-clear-button').isDisabled();
            assert.dom('.signature-pad-undo-button').isDisabled();
        });

        test('it re-enables drawing when @disabled flips to false', async function (assert) {
            this.set('disabled', true);
            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @disabled={{this.disabled}} />`);

            const canvas = getCanvas();
            await drawStroke(canvas);
            assert.true(canvasIsBlank(canvas), 'drawing is blocked while disabled');

            this.set('disabled', false);
            await settled();
            await drawStroke(canvas);

            assert.false(canvasIsBlank(canvas), 'drawing works once re-enabled');
        });

        test('@readonly renders a static image instead of a canvas', async function (assert) {
            this.set('value', RED_PNG);
            await render(hbs`<SignaturePad @readonly={{true}} @value={{this.value}} @alt="Driver signature" />`);

            assert.dom('canvas.signature-pad-canvas').doesNotExist('no canvas is mounted');
            assert.dom('img.signature-pad-image').hasAttribute('src', RED_PNG);
            assert.dom('img.signature-pad-image').hasAttribute('alt', 'Driver signature');
            assert.dom('.signature-pad-toolbar').doesNotExist('no toolbar in readonly mode');
        });

        test('@readonly without a value renders the empty text', async function (assert) {
            await render(hbs`<SignaturePad @readonly={{true}} @emptyText="Not signed" />`);

            assert.dom('.signature-pad-empty').hasText('Not signed');
            assert.dom('img.signature-pad-image').doesNotExist();
        });
    });

    module('resizing', function () {
        test('it preserves strokes across a resize', async function (assert) {
            const state = trackReady(this);
            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @onReady={{this.onReady}} />`);
            await waitUntil(() => state.api);

            const canvas = getCanvas();
            await drawStroke(canvas);

            const widthBefore = canvas.width;
            Object.defineProperty(canvas, 'offsetWidth', { configurable: true, value: 480 });

            assert.strictEqual(resizeCallbacks.length, 1, 'the canvas is observed');
            resizeCallbacks[0]();
            await settled();

            assert.notStrictEqual(canvas.width, widthBefore, 'the backing store was resized');
            assert.strictEqual(state.api.toData().length, 1, 'the stroke data survived');
            assert.false(canvasIsBlank(canvas), 'the stroke was repainted');
        });

        test('it re-applies a hydrated signature across a resize', async function (assert) {
            const state = trackReady(this);
            this.set('value', RED_PNG);

            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @value={{this.value}} @onReady={{this.onReady}} />`);
            await waitUntil(() => state.api);

            const canvas = getCanvas();
            await waitUntil(() => !canvasIsBlank(canvas));

            Object.defineProperty(canvas, 'offsetWidth', { configurable: true, value: 480 });
            resizeCallbacks[0]();
            await waitUntil(() => canvas.width === Math.round(480 * Math.max(window.devicePixelRatio || 1, 1)));
            await waitUntil(() => !canvasIsBlank(canvas));

            assert.true(canvasHasColor(canvas, [255, 0, 0]), 'the hydrated signature was repainted');
        });

        test('it does not resize to a zero sized box', async function (assert) {
            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} />`);

            const canvas = getCanvas();
            await drawStroke(canvas);

            const widthBefore = canvas.width;
            for (const element of [canvas, canvas.parentElement]) {
                Object.defineProperty(element, 'offsetWidth', { configurable: true, value: 0 });
                Object.defineProperty(element, 'offsetHeight', { configurable: true, value: 0 });
            }

            resizeCallbacks[0]();
            await settled();

            assert.strictEqual(canvas.width, widthBefore, 'the backing store was left alone');
            assert.false(canvasIsBlank(canvas), 'the ink survived');
        });

        test('it does not observe when @autoResize={{false}}', async function (assert) {
            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @autoResize={{false}} />`);

            assert.strictEqual(resizeCallbacks.length, 0, 'no ResizeObserver was created');
        });
    });

    module('drawing options', function () {
        test('it honours @penColor and stroke widths', async function (assert) {
            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @penColor="#ff0000" @minWidth={{4}} @maxWidth={{4}} />`);

            const canvas = getCanvas();
            await drawStroke(canvas, HORIZONTAL);

            assert.true(canvasHasColor(canvas, [255, 0, 0]), 'the stroke was drawn in the requested colour');
        });

        test('it applies a new @penColor to later strokes', async function (assert) {
            this.set('penColor', '#ff0000');
            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @penColor={{this.penColor}} @minWidth={{4}} @maxWidth={{4}} />`);

            const canvas = getCanvas();
            await drawStroke(canvas, HORIZONTAL);

            this.set('penColor', '#0000ff');
            await settled();
            await drawStroke(canvas, DIAGONAL);

            assert.true(canvasHasColor(canvas, [255, 0, 0]), 'the first stroke is still red');
            assert.true(canvasHasColor(canvas, [0, 0, 255]), 'the second stroke is blue');
        });

        test('it applies @backgroundColor', async function (assert) {
            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @backgroundColor="#ffffff" />`);

            const canvas = getCanvas();

            assert.false(canvasIsBlank(canvas), 'the background was filled');
            assert.true(canvasHasColor(canvas, [255, 255, 255]), 'the background is white');
        });

        test('it honours @format', async function (assert) {
            const changes = [];
            this.set('onChange', (dataUrl) => changes.push(dataUrl));

            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @format="image/jpeg" @backgroundColor="#ffffff" @onChange={{this.onChange}} />`);
            await drawStroke(getCanvas());

            assert.ok(changes[0].startsWith('data:image/jpeg;base64,'), 'a jpeg data url was emitted');
        });

        test('it honours @encoderOptions for lossy formats', async function (assert) {
            const state = trackReady(this);
            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @backgroundColor="#ffffff" @onReady={{this.onReady}} />`);
            await waitUntil(() => state.api);
            await drawStroke(getCanvas(), DIAGONAL);

            const low = state.api.toDataURL('image/jpeg', 0.1);
            const high = state.api.toDataURL('image/jpeg', 1);

            assert.ok(low.length < high.length, 'a lower quality export is smaller');
        });
    });

    module('teardown', function () {
        test('it disconnects the observer and detaches listeners', async function (assert) {
            const changes = [];
            this.set('onChange', (dataUrl) => changes.push(dataUrl));

            await render(hbs`<SignaturePad @height={{200}} @throttle={{0}} @minDistance={{0}} @onChange={{this.onChange}} />`);

            const canvas = getCanvas();
            await drawStroke(canvas);
            assert.strictEqual(changes.length, 1, 'the pad was live before teardown');

            await render(hbs`<div class="after-teardown"></div>`);

            assert.strictEqual(resizeCallbacks.length, 0, 'the ResizeObserver was disconnected');

            await drawStroke(canvas);

            assert.strictEqual(changes.length, 1, 'the detached canvas no longer reports changes');
        });

        // Flipping @readonly true tears the canvas down while the component stays alive, which
        // is the one state where the yielded api outlives its pad.
        test('the api degrades gracefully once the canvas is torn down', async function (assert) {
            const state = trackReady(this);
            this.set('readonly', false);

            await render(hbs`<SignaturePad @readonly={{this.readonly}} @onReady={{this.onReady}} />`);
            await waitUntil(() => state.api);

            this.set('readonly', true);
            await settled();

            assert.true(state.api.isEmpty(), 'isEmpty answers empty with no pad');
            assert.deepEqual(state.api.toData(), [], 'toData answers no strokes');
            assert.strictEqual(state.api.instance(), null, 'instance is gone');
            assert.strictEqual(state.api.toDataURL(), null, 'there is nothing to export');

            state.api.clear();
            await state.api.undo();
            await state.api.resize();
            await state.api.fromDataURL(RED_PNG);

            assert.dom('.signature-pad-empty').hasText('No signature', 'every call is a no-op, and the default empty text shows');
        });

        // undo() awaits redraw(), which awaits fromDataURL() when a raster is hydrated — tear the
        // component down inside that window and both destroyed-guards have to hold.
        test('an undo in flight when the pad is destroyed emits nothing', async function (assert) {
            const changes = [];
            const state = trackReady(this);
            this.set('value', RED_PNG);
            this.set('onChange', (dataUrl) => changes.push(dataUrl));

            await render(hbs`<SignaturePad @value={{this.value}} @throttle={{0}} @minDistance={{0}} @onReady={{this.onReady}} @onChange={{this.onChange}} />`);
            await waitUntil(() => state.api);
            await drawStroke(getCanvas());
            assert.strictEqual(changes.length, 1, 'the stroke reported once before the teardown');

            const pending = state.api.undo();
            await clearRender();
            await pending;

            assert.strictEqual(changes.length, 1, 'the destroyed pad emitted nothing more');
        });

        // trackValue() awaits the image load; resolve it after the canvas is gone but while the
        // component is alive, and syncState() runs against a missing pad.
        test('a value applied while the pad is being replaced is dropped cleanly', async function (assert) {
            const state = trackReady(this);
            this.set('readonly', false);
            this.set('value', null);

            await render(hbs`<SignaturePad @readonly={{this.readonly}} @value={{this.value}} @onReady={{this.onReady}} />`);
            await waitUntil(() => state.api);

            this.set('value', RED_PNG);
            await rerender();
            this.set('readonly', true);
            await rerender();

            await new Promise((resolve) => setTimeout(resolve, 100));
            await settled();

            assert.dom('.signature-pad-surface-readonly').exists('the readonly surface took over without an error');
        });

        // The same window, but the whole component goes away instead of just the canvas.
        test('a value applied while the pad is being destroyed is dropped cleanly', async function (assert) {
            const state = trackReady(this);
            this.set('value', null);

            await render(hbs`<SignaturePad @value={{this.value}} @onReady={{this.onReady}} />`);
            await waitUntil(() => state.api);

            this.set('value', RED_PNG);
            await rerender();
            await clearRender();

            await new Promise((resolve) => setTimeout(resolve, 100));
            await settled();

            assert.ok(true, 'the late value application returned before touching destroyed state');
        });
    });

    module('sizing edge cases', function () {
        test('a string @height is applied as-is', async function (assert) {
            await render(hbs`<SignaturePad @height="12rem" />`);

            assert.strictEqual(getCanvas().style.height, '12rem', 'non-numeric heights pass straight through');
        });

        test('changing @height refits the canvas', async function (assert) {
            const state = trackReady(this);
            this.set('height', 200);

            await render(hbs`<SignaturePad @height={{this.height}} @onReady={{this.onReady}} />`);
            await waitUntil(() => state.api);

            this.set('height', 260);
            await settled();

            const canvas = getCanvas();
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            assert.strictEqual(canvas.style.height, '260px', 'the surface takes the new height');
            assert.strictEqual(canvas.height, Math.round(canvas.offsetHeight * ratio), 'the backing store is refit to it');
        });

        test('a browser reporting no devicePixelRatio falls back to 1', async function (assert) {
            const original = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
            Object.defineProperty(window, 'devicePixelRatio', { value: 0, configurable: true });

            try {
                const state = trackReady(this);
                await render(hbs`<SignaturePad @height={{200}} @onReady={{this.onReady}} />`);
                await waitUntil(() => state.api);

                const canvas = getCanvas();
                assert.strictEqual(canvas.width, canvas.offsetWidth, 'the backing store is sized at ratio 1');
            } finally {
                if (original) {
                    Object.defineProperty(window, 'devicePixelRatio', original);
                } else {
                    delete window.devicePixelRatio;
                }
            }
        });
    });
});
