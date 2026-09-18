import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import SignaturePad from 'signature_pad';

/**
 * SignaturePad component wrapping signature_pad v5 (MIT licensed, zero dependencies).
 *
 * Renders a fluid-width canvas the user can sign on with a mouse, stylus or
 * finger, and emits the drawing as an image data URL. The canvas backing store
 * is kept in sync with its rendered size and the device pixel ratio so
 * signatures stay crisp on retina displays and survive layout changes.
 *
 * @see https://github.com/szimek/signature_pad
 *
 * Usage:
 * ```hbs
 * <SignaturePad
 *   @value={{this.signature}}
 *   @height={{220}}
 *   @onChange={{this.onSignatureChanged}}
 *   @onReady={{this.onSignaturePadReady}}
 * />
 *
 * {{! custom toolbar via the yielded api }}
 * <SignaturePad @showActions={{false}} @onChange={{this.onSignatureChanged}} as |pad|>
 *     <Button @text="Reset" @onClick={{pad.clear}} />
 * </SignaturePad>
 * ```
 *
 * Arguments:
 *   @value             — image data URL to render into the pad; re-applied whenever it changes
 *   @height            — canvas height in CSS pixels (default 200); width is fluid
 *   @format            — export mime type passed to `toDataURL` (default 'image/png')
 *   @encoderOptions    — quality (0..1) for lossy formats such as image/jpeg
 *   @penColor          — stroke color (default '#111827')
 *   @backgroundColor   — canvas fill (default 'rgba(0,0,0,0)', ie. transparent)
 *   @minWidth @maxWidth @dotSize @minDistance @velocityFilterWeight @throttle @compositeOperation
 *                      — passed straight through to the SignaturePad constructor
 *   @disabled          — renders the pad but ignores all pointer input
 *   @readonly          — renders @value as a static image instead of a canvas
 *   @autoResize        — observe the canvas and refit it on resize (default true)
 *   @showActions       — show the Clear/Undo toolbar (default true)
 *   @clearLabel @undoLabel @placeholder @emptyText @alt
 *                      — user facing copy; plain strings so the addon carries no translation keys
 *   @wrapperClass @canvasClass @toolbarClass
 *                      — extra classes for the wrapper, canvas and toolbar
 *
 * Callback args:
 *   @onChange(dataUrl, api)   — after every stroke, clear and undo; `dataUrl` is null when empty
 *   @onBegin(detail, api)     — the signature_pad `beginStroke` detail
 *   @onEnd(dataUrl, api, detail) — the signature_pad `endStroke`, only for real strokes
 *   @onClear(api)             — after the pad is cleared
 *   @onReady(api)             — once the pad is mounted, sized and hydrated
 *
 * The `api` object keeps a stable identity for the lifetime of the component and is
 * also yielded to the block. It exposes:
 *   { clear, undo, resize, isEmpty, toDataURL, toData, fromDataURL, instance }
 */
export default class SignaturePadComponent extends Component {
    /**
     * The canvas element the pad is mounted on.
     * @type {HTMLCanvasElement}
     */
    /* istanbul ignore next -- tracked initializers are lazy, and setup() assigns this before any
       read: the api escapes only via @onReady (called after assignment) and the toolbar yield,
       whose actions cannot fire before {{did-insert}} has run */
    @tracked canvasEl = null;

    /**
     * The underlying SignaturePad instance.
     * @type {SignaturePad}
     */
    /* istanbul ignore next -- same as canvasEl: setup() assigns this synchronously before its
       first await, ahead of any possible read */
    @tracked signaturePad = null;

    /**
     * Whether the pad currently has no ink on it.
     * @type {boolean}
     */
    @tracked isEmpty = true;

    /**
     * Whether there is anything to undo — either a drawn stroke or a hydrated image.
     * @type {boolean}
     */
    @tracked canUndo = false;

    /**
     * Observes the canvas so the backing store can be refit when it resizes.
     * @type {ResizeObserver}
     */
    resizeObserver = null;

    /**
     * A raster applied through `fromDataURL`. `toData()` cannot round-trip a raster,
     * so any redraw has to re-apply it underneath the vector strokes.
     * @type {string}
     */
    hydratedDataUrl = null;

    /**
     * The last data URL emitted through `@onChange`. Lets `trackValue` ignore the
     * echo of our own output when `@value` is bound two-way. Starts as `undefined`
     * rather than `null` so a genuine `@value` of `null` is not mistaken for an echo.
     * @type {string}
     */
    lastEmittedValue = undefined;

    get height() {
        return this.args.height ?? 200;
    }

    get heightStyle() {
        const { height } = this;

        return typeof height === 'number' ? `${height}px` : height;
    }

    get format() {
        return this.args.format ?? 'image/png';
    }

    get showActions() {
        return this.args.showActions ?? true;
    }

    get isDisabled() {
        return this.args.disabled === true;
    }

    get isReadonly() {
        return this.args.readonly === true;
    }

    get clearLabel() {
        return this.args.clearLabel ?? 'Clear';
    }

    get undoLabel() {
        return this.args.undoLabel ?? 'Undo';
    }

    get placeholder() {
        return this.args.placeholder ?? 'Sign here';
    }

    get emptyText() {
        return this.args.emptyText ?? 'No signature';
    }

    get alt() {
        return this.args.alt ?? 'Signature';
    }

    get showPlaceholder() {
        return this.isEmpty && !this.isDisabled;
    }

    get hasActions() {
        return this.showActions && !this.isReadonly;
    }

    /**
     * The device pixel ratio the canvas backing store is sized against.
     * @type {number}
     */
    get pixelRatio() {
        return Math.max(window.devicePixelRatio || 1, 1);
    }

    constructor() {
        super(...arguments);

        // Built once so the identity handed to `@onReady` and yielded to the block is
        // stable — an unstable payload makes consumer `{{did-update}}` hooks loop.
        this.api = {
            clear: this.clear,
            undo: this.undo,
            resize: this.resizeCanvas,
            isEmpty: () => (this.signaturePad ? this.signaturePad.isEmpty() : true),
            toData: () => (this.signaturePad ? this.signaturePad.toData() : []),
            toDataURL: (format, encoderOptions) => this.currentDataURL(format, encoderOptions),
            fromDataURL: (dataUrl) => this.applyValue(dataUrl),
            instance: () => this.signaturePad,
        };
    }

    /**
     * Options handed to the SignaturePad constructor. Only keys the consumer actually
     * passed are included, so the library keeps its own defaults for the rest.
     * @type {Object}
     */
    get signaturePadOptions() {
        const { minWidth, maxWidth, dotSize, minDistance, velocityFilterWeight, throttle, compositeOperation } = this.args;
        const options = {
            penColor: this.args.penColor ?? '#111827',
            backgroundColor: this.args.backgroundColor ?? 'rgba(0,0,0,0)',
        };
        const passthrough = { minWidth, maxWidth, dotSize, minDistance, velocityFilterWeight, throttle, compositeOperation };

        for (const key in passthrough) {
            if (passthrough[key] !== undefined) {
                options[key] = passthrough[key];
            }
        }

        return options;
    }

    /**
     * Mounts the SignaturePad onto the canvas, sizes it, applies `@value` and starts
     * observing the element for resizes.
     * @param {HTMLCanvasElement} canvasEl
     * @action
     */
    @action async setup(canvasEl) {
        this.canvasEl = canvasEl;
        // Sized before the first measurement — the surface height is derived from the
        // canvas, so measuring first would read a collapsed box.
        canvasEl.style.height = this.heightStyle;

        const signaturePad = new SignaturePad(canvasEl, this.signaturePadOptions);
        signaturePad.addEventListener('beginStroke', this.handleBeginStroke);
        signaturePad.addEventListener('endStroke', this.handleEndStroke);
        this.signaturePad = signaturePad;

        await this.resizeCanvas();

        if (this.args.value) {
            await this.applyValue(this.args.value);
        }

        if (this.isDestroying || this.isDestroyed || !this.signaturePad) {
            return;
        }

        this.trackDisabled();
        this.observeResize(canvasEl);
        this.syncState();

        if (typeof this.args.onReady === 'function') {
            this.args.onReady(this.api);
        }
    }

    /**
     * Tears down the SignaturePad instance, its listeners and the ResizeObserver.
     * @action
     */
    @action teardown() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        /* istanbul ignore else -- teardown runs at most once per canvas insertion, and setup()
           assigns the pad synchronously before its first await, so it is always live here */
        if (this.signaturePad) {
            this.signaturePad.removeEventListener('beginStroke', this.handleBeginStroke);
            this.signaturePad.removeEventListener('endStroke', this.handleEndStroke);
            // off() removes the canvas pointerdown listener as well as the window level
            // move/up listeners signature_pad installs for the duration of a stroke.
            this.signaturePad.off();
            this.signaturePad = null;
        }

        this.canvasEl = null;
        this.hydratedDataUrl = null;
        this.lastEmittedValue = undefined;
    }

    /**
     * Refits the canvas backing store to its rendered size multiplied by the device
     * pixel ratio.
     *
     * Assigning `canvas.width`/`height` wipes the bitmap and resets the 2D context
     * transform, so the ink has to be repainted afterwards — that is what `redraw`
     * is for, and why the canonical signature_pad resize recipe round-trips through
     * `toData()`/`fromData()`.
     * @action
     */
    @action async resizeCanvas() {
        const { canvasEl, signaturePad } = this;
        if (!canvasEl || !signaturePad) {
            return;
        }

        const ratio = this.pixelRatio;
        const width = canvasEl.offsetWidth || canvasEl.parentElement?.offsetWidth || 0;
        const height = canvasEl.offsetHeight || canvasEl.parentElement?.offsetHeight || 0;

        // Never resize to zero — a hidden or detached pad would lose its ink.
        if (!width || !height) {
            return;
        }

        const nextWidth = Math.round(width * ratio);
        const nextHeight = Math.round(height * ratio);

        // Assigning the same value still wipes the bitmap, so bail when nothing changed.
        if (canvasEl.width === nextWidth && canvasEl.height === nextHeight) {
            return;
        }

        const pointGroups = signaturePad.toData();

        canvasEl.width = nextWidth;
        canvasEl.height = nextHeight;
        canvasEl.getContext('2d').scale(ratio, ratio);

        await this.redraw(pointGroups);
        this.syncState();
    }

    /**
     * Clears the pad and notifies the consumer.
     * @action
     */
    @action clear() {
        if (!this.signaturePad) {
            return;
        }

        this.signaturePad.clear();
        this.hydratedDataUrl = null;
        this.syncState();

        if (typeof this.args.onClear === 'function') {
            this.args.onClear(this.api);
        }

        this.emitChange();
    }

    /**
     * Removes the most recent stroke and notifies the consumer. When the only ink is
     * a hydrated image there is nothing vectorial to undo, so undo degrades to clear
     * rather than silently doing nothing.
     * @action
     */
    @action async undo() {
        if (!this.signaturePad) {
            return;
        }

        const pointGroups = this.signaturePad.toData();
        if (pointGroups.length === 0) {
            this.clear();
            return;
        }

        await this.redraw(pointGroups.slice(0, -1));

        if (this.isDestroying || this.isDestroyed) {
            return;
        }

        this.syncState();
        this.emitChange();
    }

    /**
     * Re-applies `@value` when it changes from the outside, ignoring the echo of our
     * own `@onChange` output so a two-way bound `@value` does not flatten the drawn
     * strokes into a raster after every stroke.
     * @action
     */
    @action async trackValue(el, [value]) {
        if (value === this.lastEmittedValue) {
            return;
        }

        await this.applyValue(value);

        if (this.isDestroying || this.isDestroyed) {
            return;
        }

        this.syncState();
    }

    /**
     * Resizes the canvas when `@height` changes.
     * @action
     */
    @action trackHeight() {
        /* istanbul ignore if -- {{did-update}} only fires while the canvas is inserted, and
           setup() stores the element from {{did-insert}} before any update can run */
        if (!this.canvasEl) {
            return;
        }

        this.canvasEl.style.height = this.heightStyle;
        this.resizeCanvas();
    }

    /**
     * Attaches or detaches the pad's pointer handlers when `@disabled` changes.
     * @action
     */
    @action trackDisabled() {
        /* istanbul ignore if -- called from setup() after the pad is assigned, and from
           {{did-update}}, which only fires while the canvas that setup() mounted is inserted */
        if (!this.signaturePad) {
            return;
        }

        if (this.isDisabled) {
            this.signaturePad.off();
        } else {
            this.signaturePad.on();
        }
    }

    /**
     * Re-applies the drawing options when the corresponding args change. These are
     * plain public properties read per stroke by signature_pad, so live mutation is
     * supported. `throttle` is only read in the constructor, so it is skipped.
     * @action
     */
    @action trackOptions() {
        /* istanbul ignore if -- {{did-update}} only fires while the canvas is inserted, and
           setup() assigns the pad synchronously before any update can run */
        if (!this.signaturePad) {
            return;
        }

        const options = this.signaturePadOptions;
        for (const key in options) {
            if (key !== 'throttle') {
                this.signaturePad[key] = options[key];
            }
        }
    }

    /**
     * Passes the `beginStroke` event through to `@onBegin`.
     * @action
     */
    @action handleBeginStroke(event) {
        if (typeof this.args.onBegin === 'function') {
            this.args.onBegin(event.detail, this.api);
        }
    }

    /**
     * Syncs state after a stroke and notifies `@onEnd` and `@onChange`.
     * @action
     */
    @action handleEndStroke(event) {
        this.syncState();

        const dataUrl = this.currentDataURL();
        this.lastEmittedValue = dataUrl;

        if (typeof this.args.onEnd === 'function') {
            this.args.onEnd(dataUrl, this.api, event.detail);
        }

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(dataUrl, this.api);
        }
    }

    /**
     * Repaints the canvas from scratch: background, then the hydrated raster, then the
     * vector stroke groups on top so the z-order is preserved.
     * @param {Array} pointGroups
     * @returns {Promise<void>}
     */
    async redraw(pointGroups) {
        /* istanbul ignore if -- both callers (resizeCanvas and undo) return unless the pad is
           set, and call this synchronously after their own guard */
        if (!this.signaturePad) {
            return;
        }

        this.signaturePad.clear();

        if (this.hydratedDataUrl) {
            try {
                await this.signaturePad.fromDataURL(this.hydratedDataUrl, { ratio: this.pixelRatio });
            } catch {
                // an unloadable image just leaves the raster off the canvas
            }
        }

        if (this.isDestroying || this.isDestroyed || !this.signaturePad) {
            return;
        }

        if (pointGroups.length > 0) {
            this.signaturePad.fromData(pointGroups, { clear: false });
        }
    }

    /**
     * Writes a data URL into the pad. Async because signature_pad resolves on the
     * underlying image's load event.
     * @param {string} value
     * @returns {Promise<void>}
     */
    async applyValue(value) {
        if (!this.signaturePad) {
            return;
        }

        if (!value) {
            this.signaturePad.clear();
            this.hydratedDataUrl = null;
            return;
        }

        this.hydratedDataUrl = value;

        try {
            await this.signaturePad.fromDataURL(value, { ratio: this.pixelRatio });
        } catch {
            this.hydratedDataUrl = null;
        }
    }

    /**
     * Exports the current signature as a data URL, or null when the pad is empty.
     * @param {string} [format]
     * @param {number} [encoderOptions]
     * @returns {string|null}
     */
    currentDataURL(format, encoderOptions) {
        if (!this.signaturePad || this.signaturePad.isEmpty()) {
            return null;
        }

        return this.signaturePad.toDataURL(format ?? this.format, encoderOptions ?? this.args.encoderOptions);
    }

    /**
     * Starts observing the canvas so the backing store is refit when it resizes.
     * @param {HTMLCanvasElement} canvasEl
     */
    observeResize(canvasEl) {
        if (this.args.autoResize === false || typeof window.ResizeObserver !== 'function') {
            return;
        }

        this.resizeObserver = new window.ResizeObserver(() => this.resizeCanvas());
        this.resizeObserver.observe(canvasEl);
    }

    /**
     * Mirrors the pad's internal state onto the tracked properties the template reads.
     */
    syncState() {
        if (!this.signaturePad) {
            this.isEmpty = true;
            this.canUndo = false;
            return;
        }

        this.isEmpty = this.signaturePad.isEmpty();
        this.canUndo = this.signaturePad.toData().length > 0 || Boolean(this.hydratedDataUrl);
    }

    /**
     * Emits the current signature to `@onChange`.
     */
    emitChange() {
        const dataUrl = this.currentDataURL();
        this.lastEmittedValue = dataUrl;

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(dataUrl, this.api);
        }
    }
}
