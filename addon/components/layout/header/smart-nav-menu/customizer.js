import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { A } from '@ember/array';

/**
 * `Layout::Header::SmartNavMenu::Customizer`
 *
 * A modal-style panel that allows users to:
 *   - Select which extensions are pinned to the header bar (up to `@maxVisible`).
 *   - Drag-and-drop to reorder pinned extensions.
 *   - Preview which items will appear in the bar vs. the overflow dropdown.
 *
 * The component is intentionally stateless with respect to persistence –
 * it delegates saving to the parent `SmartNavMenu` via `@onApply`.
 *
 * @class LayoutHeaderSmartNavMenuCustomizerComponent
 * @extends Component
 */
export default class LayoutHeaderSmartNavMenuCustomizerComponent extends Component {
    /**
     * Working copy of the pinned items list, mutated locally until the user
     * clicks "Apply".  Initialised from `@pinnedIds` (or all items if none
     * have been saved yet).
     *
     * @type {Array<Object>}
     */
    @tracked workingPinned = A([]);

    constructor(owner, args) {
        super(owner, args);
        this._initWorkingState();
    }

    // ─── Computed ─────────────────────────────────────────────────────────────

    /** Items that are NOT in the working pinned list. */
    get unpinnedItems() {
        const pinnedIds = this.workingPinned.map((i) => i.id);
        return (this.args.allItems ?? []).filter((i) => !pinnedIds.includes(i.id));
    }

    /** True when the user has reached the maximum allowed pinned items. */
    get atPinnedLimit() {
        return this.workingPinned.length >= (this.args.maxVisible ?? 5);
    }

    // ─── Setup ────────────────────────────────────────────────────────────────

    _initWorkingState() {
        const { allItems = [], pinnedIds } = this.args;

        if (pinnedIds && pinnedIds.length > 0) {
            // Restore saved order.
            const ordered = [];
            for (const id of pinnedIds) {
                const item = allItems.find((i) => i.id === id);
                if (item) ordered.push(item);
            }
            this.workingPinned = A(ordered);
        } else {
            // Default: first `maxVisible` items are pinned.
            const cap = this.args.maxVisible ?? 5;
            this.workingPinned = A(allItems.slice(0, cap));
        }
    }

    // ─── Actions ──────────────────────────────────────────────────────────────

    /**
     * Toggle an item's pinned state.
     *
     * @param {Object} item
     */
    @action togglePin(item) {
        const idx = this.workingPinned.findIndex((i) => i.id === item.id);
        if (idx >= 0) {
            // Unpin.
            this.workingPinned.removeAt(idx);
            // Trigger reactivity.
            this.workingPinned = A([...this.workingPinned]);
        } else if (!this.atPinnedLimit) {
            // Pin.
            this.workingPinned = A([...this.workingPinned, item]);
        }
    }

    /**
     * Whether a given item is currently in the working pinned list.
     * Decorated with @action so it can be called from the template.
     *
     * @param {Object} item
     * @returns {boolean}
     */
    @action isPinned(item) {
        return this.workingPinned.some((i) => i.id === item.id);
    }

    /**
     * Drag-sort reorder handler for the pinned items list.
     */
    @action reorderPinned({ sourceList, sourceIndex, targetList, targetIndex }) {
        if (sourceList === targetList && sourceIndex === targetIndex) return;
        const item = sourceList.objectAt(sourceIndex);
        sourceList.removeAt(sourceIndex);
        targetList.insertAt(targetIndex, item);
        this.workingPinned = A([...this.workingPinned]);
    }

    /**
     * Confirm and apply the customisation.
     */
    @action apply() {
        const orderedIds = this.workingPinned.map((i) => i.id);
        if (typeof this.args.onApply === 'function') {
            this.args.onApply(orderedIds);
        }
    }

    /** Discard changes and close the panel. */
    @action cancel() {
        if (typeof this.args.onClose === 'function') {
            this.args.onClose();
        }
    }

    /** Reset to default (first `maxVisible` items in universe order). */
    @action resetToDefault() {
        const cap = this.args.maxVisible ?? 5;
        this.workingPinned = A((this.args.allItems ?? []).slice(0, cap));
    }
}
