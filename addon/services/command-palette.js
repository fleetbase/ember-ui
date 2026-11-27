import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

/**
 * Open state of the global command palette, so the top bar's search trigger,
 * the ⌘K binding and any engine can open it without holding a reference to the
 * component.
 *
 * `hosts` counts mounted `<CommandPalette />` components. While one is mounted
 * it owns ⌘K, and `Layout::Sidebar::Navigator` leaves the shortcut alone; in the
 * classic layout no palette is mounted and the navigator keeps it.
 */
export default class CommandPaletteService extends Service {
    @tracked isOpen = false;
    @tracked scope = null;
    // Not tracked: a palette registers from its constructor, mid-render, and
    // nothing re-renders on the count; it is read only from event handlers.
    hosts = 0;

    get hasHost() {
        return this.hosts > 0;
    }

    /**
     * Records a mounted palette. Returns the function that unregisters it.
     */
    register() {
        this.hosts++;
        let registered = true;

        return () => {
            if (registered) {
                registered = false;
                this.hosts--;
            }
        };
    }

    /**
     * Opens the palette, optionally scoped to one search provider.
     *
     * @param {String|null} [scope] a provider id
     */
    open(scope = null) {
        this.scope = scope;
        this.isOpen = true;
    }

    close() {
        this.isOpen = false;
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
}
