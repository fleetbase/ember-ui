/**
 * Keeps track of the open `Sheet`s so that exactly one of them — the top one —
 * traps Tab and answers Escape.
 *
 * One stack per page, at module level: sheets render in the host and inside
 * engines (every engine's record panels), and an engine's owner has no
 * ember-ui services, so a service would split the stack in two.
 *
 * Sheets register as they mount and unregister as they unmount. The top sheet
 * is the one with the lowest stack depth (0 is the front of a
 * resource-context-panel stack); among equals the most recently mounted wins.
 *
 * Escape is handled on `window` in the bubble phase, after `document`
 * listeners, and is ignored when something else already handled it
 * (`defaultPrevented`). The top sheet's `escape()` decides whether it closes
 * (it declines while a modal is open over it).
 *
 * Bookkeeping is untracked on purpose: it changes while sheets render and
 * nothing renders from it.
 */
export class SheetStack {
    #sheets = [];
    #listening = false;

    /** Sheets currently mounted, in mount order. */
    get sheets() {
        return [...this.#sheets];
    }

    /** The sheet that owns the keyboard, or null. */
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

    /** @param {Object} sheet Anything with a `depth` and an `escape()` method */
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

    /** Drops every sheet and the listener. */
    reset() {
        this.#sheets = [];
        this.#stopListening();
    }

    handleKeydown = (event) => {
        if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing) {
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

export const sheetStack = new SheetStack();

export default sheetStack;
