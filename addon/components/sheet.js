import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { guidFor } from '@ember/object/internals';
import { getOwner } from '@ember/application';
import { sheetStack } from '../utils/sheet-stack';
import { optionalService } from '../utils/shell';

/** Width presets in px. */
export const SHEET_WIDTHS = { sm: 360, md: 440, lg: 640 };

/** How far each sheet below the top one is pushed in, in px: the width of its spine. */
export const SPINE_WIDTH = 28;

/** Sheets deeper than this behind the top one are hidden (still mounted). */
export const MAX_SPINES = 3;

export const RESIZE_STEP = 20;

const FOCUSABLE = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'iframe',
    '[contenteditable]:not([contenteditable="false"])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * `Sheet` — the canvas shell's floating card for a record or a form, docked to
 * the right (default) or left of the content area.
 *
 * ```hbs
 * <Sheet @title="CEN-01" @width="md" @resizable={{true}} @onClose={{this.close}} @onPark={{this.park}}>
 *     <:header as |sheet|>…</:header>
 *     <:body>…</:body>
 *     <:footer>…</:footer>
 * </Sheet>
 * ```
 *
 * Arguments
 * - `@title` heading, spine label and accessible name (`@label` overrides the name)
 * - `@side` `right` | `left`
 * - `@width` `sm` (360) | `md` (440, default) | `lg` (640) | a number of px | any CSS length
 * - `@resizable` adds a drag/keyboard handle on the inner edge; `@minWidth` (320),
 *   `@maxWidth` (960) clamp it and `@onResize(px)` reports the new width
 * - `@onClose` shows × and is called by it and by Escape (when `@closeOnEscape`
 *   is not false); `@showClose={{false}}` hides × when the header has its own
 * - `@onPark` shows the park button and is called by it
 * - `@stackIndex` / `@stackSize` position this sheet in a stack (0 = bottom).
 *   Sheets behind the top one are pushed in by a spine each; clicking a spine
 *   calls `@onActivate`. Their content stays mounted but is `inert`; sheets more
 *   than three deep are hidden.
 * - `@onOpen(sheet)` is called once mounted with `{ element, close, park, activate }`
 * - `@autofocus` (default true) moves focus into the sheet when it mounts on
 *   top, and focus returns where it was when it closes.
 *
 * Blocks: `<:header>` (replaces the default title; yields `{ close, park, isTop }`),
 * `<:body>` or the default block, `<:footer>`.
 *
 * While it is the top sheet, Tab and Shift+Tab cycle inside it, and Escape (see
 * `utils/sheet-stack`) closes it unless a modal is open.
 */
export default class SheetComponent extends Component {
    sheetStack = sheetStack;
    @tracked customWidth = null;

    id = guidFor(this);
    element = null;
    #previousFocus = null;
    #drag = null;

    get titleId() {
        return `${this.id}-title`;
    }

    get side() {
        return this.args.side === 'left' ? 'left' : 'right';
    }

    get stackSize() {
        const size = Number(this.args.stackSize);
        return Number.isFinite(size) && size > 0 ? size : 1;
    }

    get stackIndex() {
        const index = Number(this.args.stackIndex);
        return Number.isFinite(index) ? Math.min(Math.max(index, 0), this.stackSize - 1) : this.stackSize - 1;
    }

    /** 0 for the top sheet, 1 for the one under it, … */
    get depth() {
        return this.stackSize - 1 - this.stackIndex;
    }

    get isTop() {
        return this.depth === 0;
    }

    get isSpine() {
        return this.depth > 0 && this.depth <= MAX_SPINES;
    }

    get isHidden() {
        return this.depth > MAX_SPINES;
    }

    get panelInert() {
        return this.isTop ? undefined : true;
    }

    get offset() {
        return `${Math.min(this.depth, MAX_SPINES) * SPINE_WIDTH}px`;
    }

    get minWidth() {
        return this.args.minWidth ?? 320;
    }

    get maxWidth() {
        return this.args.maxWidth ?? 960;
    }

    get presetWidth() {
        const width = this.args.width ?? 'md';
        if (typeof width === 'number') {
            return width;
        }
        if (SHEET_WIDTHS[width]) {
            return SHEET_WIDTHS[width];
        }
        const px = /^(\d+(?:\.\d+)?)(px)?$/.exec(String(width).trim());
        return px ? Number(px[1]) : null;
    }

    /** The width as a CSS value. */
    get width() {
        if (this.customWidth !== null) {
            return `${this.customWidth}px`;
        }
        const preset = this.presetWidth;
        return preset === null ? String(this.args.width) : `${preset}px`;
    }

    get widthValue() {
        return this.customWidth ?? this.presetWidth ?? this.element?.offsetWidth ?? this.minWidth;
    }

    get label() {
        return this.args.label ?? this.args.title;
    }

    get showClose() {
        return typeof this.args.onClose === 'function' && this.args.showClose !== false;
    }

    get showPark() {
        return typeof this.args.onPark === 'function';
    }

    get isResizable() {
        return Boolean(this.args.resizable) && this.isTop;
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────

    @action didInsert(element) {
        this.element = element;
        this.sheetStack.register(this);

        if (this.isTop && this.args.autofocus !== false) {
            this.#previousFocus = document.activeElement;
            element.focus({ preventScroll: true });
        }

        if (typeof this.args.onOpen === 'function') {
            this.args.onOpen({ element, close: this.close, park: this.park, activate: this.activate });
        }
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.sheetStack.unregister(this);
        this.#endDrag();

        // Focus goes back where it came from, unless the user has since moved it elsewhere.
        const previous = this.#previousFocus;
        const focusWasInside = this.element.contains(document.activeElement) || document.activeElement === document.body;
        if (previous && previous.isConnected && focusWasInside) {
            previous.focus({ preventScroll: true });
        }
        this.element = null;
    }

    // ── Actions ────────────────────────────────────────────────────────────

    @action close() {
        if (typeof this.args.onClose === 'function') {
            this.args.onClose();
        }
    }

    @action park() {
        if (typeof this.args.onPark === 'function') {
            this.args.onPark();
        }
    }

    @action activate() {
        if (typeof this.args.onActivate === 'function') {
            this.args.onActivate();
        }
    }

    /** Called by the sheet stack on Escape. Returns whether the sheet handled it. */
    escape() {
        if (this.args.closeOnEscape === false || typeof this.args.onClose !== 'function') {
            return false;
        }
        // A modal over the sheets gets Escape first. Looked up optionally: inside an engine the
        // owner may not have ember-ui's modals-manager.
        if (optionalService(getOwner(this), 'modals-manager')?.modalIsOpened) {
            return false;
        }
        this.close();
        return true;
    }

    @action trapFocus(event) {
        if (event.key !== 'Tab' || !this.sheetStack.isTop(this)) {
            return;
        }

        const focusables = [...this.element.querySelectorAll(FOCUSABLE)].filter((element) => !element.closest('[inert]') && element.getClientRects().length > 0);
        if (focusables.length === 0) {
            event.preventDefault();
            this.element.focus({ preventScroll: true });
            return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const current = document.activeElement;

        if (event.shiftKey && (current === first || current === this.element)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && current === last) {
            event.preventDefault();
            first.focus();
        }
    }

    // ── Resizing ───────────────────────────────────────────────────────────

    clamp(width) {
        return Math.round(Math.min(Math.max(width, this.minWidth), this.maxWidth));
    }

    setWidth(width) {
        const next = this.clamp(width);
        if (next !== this.customWidth) {
            this.customWidth = next;
            if (typeof this.args.onResize === 'function') {
                this.args.onResize(next);
            }
        }
    }

    /** +1 when moving the pointer right widens the sheet (left side), -1 otherwise. */
    get growDirection() {
        return this.side === 'left' ? 1 : -1;
    }

    @action startResize(event) {
        if (event.button !== undefined && event.button !== 0) {
            return;
        }
        event.preventDefault();
        this.#endDrag();
        this.#drag = { startX: event.clientX, startWidth: this.element.offsetWidth };
        window.addEventListener('pointermove', this.onPointerMove);
        window.addEventListener('pointerup', this.onPointerUp);
        window.addEventListener('pointercancel', this.onPointerUp);
    }

    onPointerMove = (event) => {
        // Only listening between pointerdown and pointerup, so a drag is always in progress here.
        const delta = (event.clientX - this.#drag.startX) * this.growDirection;
        this.setWidth(this.#drag.startWidth + delta);
    };

    onPointerUp = () => {
        this.#endDrag();
    };

    #endDrag() {
        this.#drag = null;
        window.removeEventListener('pointermove', this.onPointerMove);
        window.removeEventListener('pointerup', this.onPointerUp);
        window.removeEventListener('pointercancel', this.onPointerUp);
    }

    @action resizeWithKeyboard(event) {
        const grow = this.side === 'left' ? 'ArrowRight' : 'ArrowLeft';
        const shrink = this.side === 'left' ? 'ArrowLeft' : 'ArrowRight';
        const current = this.widthValue;
        const steps = { [grow]: current + RESIZE_STEP, [shrink]: current - RESIZE_STEP, Home: this.minWidth, End: this.maxWidth };

        if (event.key in steps) {
            event.preventDefault();
            this.setWidth(steps[event.key]);
        }
    }
}
