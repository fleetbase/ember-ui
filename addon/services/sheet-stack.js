import Service, { inject as service } from '@ember/service';

/**
 * Keeps track of the open `Sheet`s so that exactly one of them — the top one —
 * traps Tab and answers Escape.
 *
 * Sheets register as they mount and unregister as they unmount. The top sheet
 * is the one with the lowest stack depth (0 is the front of a
 * resource-context-panel stack); among equals the most recently mounted wins.
 *
 * Escape is handled on `window` in the bubble phase, after `document` listeners,
 * and is ignored when something else already handled it (`defaultPrevented`)
 * or while a modal is open over the sheets.
 *
 * Bookkeeping is untracked on purpose: it changes while sheets render and
 * nothing renders from it.
 *
 * @class SheetStackService
 * @extends Service
 */
export default class SheetStackService extends Service {
    @service modalsManager;

    #sheets = [];
    #listening = false;

    /**
     * Sheets currently mounted, in mount order.
     * @type {Array<Object>}
     */
    get sheets() {
        return [...this.#sheets];
    }

    /**
     * The sheet that owns the keyboard, or null.
     * @type {Object|null}
     */
    get top() {
        let top = null;
        for (const sheet of this.#sheets) {
            if (top === null || sheet.depth <= top.depth) {
                top = sheet;
            }
        }
        return top;
    }

    isTop(sheet) {
        return this.top === sheet;
    }

    /**
     * @param {Object} sheet Anything with a `depth` and an `escape()` method
     */
    register(sheet) {
        if (!this.#sheets.includes(sheet)) {
            this.#sheets.push(sheet);
        }
        this.#listen();
    }

    unregister(sheet) {
        this.#sheets = this.#sheets.filter((registered) => registered !== sheet);
        if (this.#sheets.length === 0) {
            this.#stopListening();
        }
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.#sheets = [];
        this.#stopListening();
    }

    handleKeydown = (event) => {
        if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) {
            return;
        }

        if (this.modalsManager?.modalIsOpened) {
            return;
        }

        const top = this.top;
        if (top && top.escape()) {
            event.preventDefault();
        }
    };

    #listen() {
        if (!this.#listening) {
            window.addEventListener('keydown', this.handleKeydown);
            this.#listening = true;
        }
    }

    #stopListening() {
        if (this.#listening) {
            window.removeEventListener('keydown', this.handleKeydown);
            this.#listening = false;
        }
    }
}
