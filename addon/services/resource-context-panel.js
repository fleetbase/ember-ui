import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { guidFor } from '@ember/object/internals';

/**
 * Service for managing the state and interactions of resource context panels.
 * This service provides a robust, composable, and reusable overlay panel system
 * that renders contextual panels for any Fleetbase model/resource across the app.
 *
 * @class ResourceContextPanelService
 * @memberof @fleetbase/ember-ui
 * @extends Service
 */
export default class ResourceContextPanelService extends Service {
    @service router;
    @service notifications;

    /**
     * Stack of open overlay definitions.
     * @type {Array<OverlayDefinition>}
     * @tracked
     */
    @tracked overlays = [];

    /**
     * The currently active tab for each overlay.
     * Maps overlay ID to active tab key.
     * @type {Object}
     * @tracked
     */
    @tracked activeTabs = {};

    /**
     * @private
     * Tracks registered route change listeners for overlays that should close on transition.
     * @type {Map<string, Function>}
     */
    #routeListeners = new Map();

    /**
     * Opens a new overlay panel with the given definition.
     *
     * @method open
     * @param {OverlayDefinition} definition - The overlay definition
     * @returns {String} The overlay ID
     */
    @action open(definition) {
        // Generate ID if not provided
        if (!definition.id) {
            definition.id = this.#generateId();
        }

        // Default size to medium
        if (!definition.size) {
            definition.size = 'sm';
        }

        // If should close on transition away
        if (definition.closeOnTransition === true) {
            this.#registerCloseOnTransition(definition);
        }

        // Validate definition
        this.#validateDefinition(definition);

        // Set initial active tab if tabs are provided
        if (definition.tabs && definition.tabs.length > 0) {
            const initialTab = definition.initialTab || definition.tabs[0].key;
            this.activeTabs = {
                ...this.activeTabs,
                [definition.id]: initialTab,
            };
        }

        // Add to overlay stack
        this.overlays = [...this.overlays, definition];

        // Sync with route if enabled
        if (definition.routeSync) {
            this.#syncToRoute(definition);
        }

        // Call onOpen hook
        if (definition.onOpen) {
            definition.onOpen({ resource: definition.resource ?? definition.model, model: definition.resource ?? definition.model, close: () => this.close(definition.id) });
        }

        return definition.id;
    }

    /**
     * Updates an existing overlay with new properties.
     *
     * @method update
     * @param {String} id - The overlay ID
     * @param {Partial<OverlayDefinition>} partial - Partial overlay definition to merge
     */
    @action update(id, partial) {
        const overlayIndex = this.overlays.findIndex((overlay) => overlay.id === id);
        if (overlayIndex === -1) {
            throw new Error(`Overlay with ID ${id} not found`);
        }

        const updatedOverlay = { ...this.overlays[overlayIndex], ...partial };
        this.#validateDefinition(updatedOverlay);

        this.overlays = [...this.overlays.slice(0, overlayIndex), updatedOverlay, ...this.overlays.slice(overlayIndex + 1)];

        // Sync with route if enabled
        if (updatedOverlay.routeSync) {
            this.#syncToRoute(updatedOverlay);
        }
    }

    /**
     * Closes an overlay panel.
     *
     * @method close
     * @param {String} [id] - The overlay ID. If not provided, closes the active overlay.
     * @returns {Promise<void>}
     */
    /* eslint-disable no-unused-vars */
    @action async close(id) {
        let overlayToClose;
        let overlayIndex;

        if (id) {
            overlayIndex = this.overlays.findIndex((overlay) => overlay.id === id);
            if (overlayIndex === -1) {
                return; // Overlay not found, nothing to close
            }
            overlayToClose = this.overlays[overlayIndex];
        } else {
            // Close the active (top-most) overlay
            if (this.overlays.length === 0) {
                return; // No overlays to close
            }
            overlayIndex = this.overlays.length - 1;
            overlayToClose = this.overlays[overlayIndex];
        }

        // Call onClose hook and wait for it if it returns a promise
        if (overlayToClose.onClose) {
            const result = overlayToClose.onClose({
                model: overlayToClose.model,
                close: () => this.close(overlayToClose.id),
            });
            if (result && typeof result.then === 'function') {
                await result;
            }
        }

        // Remove from overlay stack
        this.overlays = [...this.overlays.slice(0, overlayIndex), ...this.overlays.slice(overlayIndex + 1)];

        // Clean up active tab tracking
        const { [overlayToClose.id]: removedTab, ...remainingTabs } = this.activeTabs;
        this.activeTabs = remainingTabs;

        // Detach route listener if it was registered
        this.#unregisterCloseOnTransition(overlayToClose.id);

        // Clear route sync if enabled
        if (overlayToClose.routeSync) {
            this.#clearFromRoute(overlayToClose);
        }
    }

    /**
     * Closes all open overlay panels.
     *
     * @method closeAll
     * @returns {Promise<void>}
     */
    @action async closeAll() {
        // Close overlays in reverse order (top to bottom)
        const overlaysToClose = [...this.overlays].reverse();

        for (const overlay of overlaysToClose) {
            await this.close(overlay.id);
        }
    }

    /**
     * Sets the active tab for a tabbed overlay.
     *
     * @method setActiveTab
     * @param {String} id - The overlay ID
     * @param {String} tabKey - The tab key to activate
     */
    @action setActiveTab(id, tabKey) {
        const overlay = this.getById(id);
        if (!overlay) {
            throw new Error(`Overlay with ID ${id} not found`);
        }

        if (!overlay.tabs) {
            throw new Error(`Overlay with ID ${id} does not have tabs`);
        }

        const tab = overlay.tabs.find((t) => t.key === tabKey);
        if (!tab) {
            throw new Error(`Tab with key ${tabKey} not found in overlay ${id}`);
        }

        // Check beforeLeave guard on current tab
        const currentTabKey = this.activeTabs[id];
        if (currentTabKey && currentTabKey !== tabKey) {
            const currentTab = overlay.tabs.find((t) => t.key === currentTabKey);
            if (currentTab && currentTab.beforeLeave) {
                const canLeave = currentTab.beforeLeave({
                    model: overlay.model,
                    close: () => this.close(id),
                });

                // Handle async beforeLeave
                if (canLeave && typeof canLeave.then === 'function') {
                    canLeave.then((result) => {
                        if (result) {
                            this.#setActiveTabInternal(id, tabKey, overlay);
                        }
                    });
                    return;
                } else if (!canLeave) {
                    return; // Guard prevented tab change
                }
            }
        }

        this.#setActiveTabInternal(id, tabKey, overlay);
    }

    /**
     * Internal method to set active tab without guards.
     *
     * @private
     * @method #setActiveTabInternal
     * @param {String} id - The overlay ID
     * @param {String} tabKey - The tab key to activate
     * @param {OverlayDefinition} overlay - The overlay definition
     */
    #setActiveTabInternal(id, tabKey, overlay) {
        this.activeTabs = {
            ...this.activeTabs,
            [id]: tabKey,
        };

        // Sync with route if enabled
        if (overlay.routeSync) {
            this.#syncTabToRoute(overlay, tabKey);
        }
    }

    /**
     * Registers a router listener to automatically close an overlay when a route transition occurs.
     * This allows overlays to close cleanly when the user navigates away.
     *
     * @private
     * @method _registerCloseOnTransition
     * @param {OverlayDefinition} definition - The overlay definition object containing overlay metadata.
     * @example
     * if (definition.closeOnTransition) {
     *   this._registerCloseOnTransition(definition);
     * }
     */
    #registerCloseOnTransition(definition) {
        // Ensure any previous listener for this overlay is removed
        this.#unregisterCloseOnTransition(definition.id);

        /**
         * Handler for closing the overlay on route change.
         * Uses `routeWillChange` so the overlay closes immediately before navigation.
         */
        const handler = () => {
            this.close(definition.id);
            this.#unregisterCloseOnTransition(definition.id); // cleanup after first fire
        };

        // Attach listener
        this.router.on('routeWillChange', handler);

        // Track the listener for future cleanup
        this.#routeListeners.set(definition.id, handler);
    }

    /**
     * Unregisters a previously registered close-on-transition listener for the specified overlay.
     *
     * @private
     * @method _unregisterCloseOnTransition
     * @param {String} id - The overlay ID whose listener should be removed.
     */
    #unregisterCloseOnTransition(id) {
        const handler = this.#routeListeners.get(id);
        if (handler) {
            this.router.off('routeWillChange', handler);
            this.#routeListeners.delete(id);
        }
    }

    /**
     * Unregisters all active close-on-transition listeners.
     * Useful for cleaning up when the service is destroyed.
     *
     * @private
     * @method _unbindAllCloseOnTransition
     */
    #unbindAllCloseOnTransition() {
        for (const handler of this.#routeListeners.values()) {
            this.router.off('routeWillChange', handler);
        }
        this.#routeListeners.clear();
    }

    /**
     * Gets the currently active overlay (top-most in the stack).
     *
     * @method getActive
     * @returns {OverlayDefinition|null}
     */
    getActive() {
        return this.overlays.length > 0 ? this.overlays[this.overlays.length - 1] : null;
    }

    /**
     * Gets an overlay by its ID.
     *
     * @method getById
     * @param {String} id - The overlay ID
     * @returns {OverlayDefinition|null}
     */
    getById(id) {
        return this.overlays.find((overlay) => overlay.id === id) || null;
    }

    /**
     * Checks if an overlay is open.
     *
     * @method isOpen
     * @param {String} [id] - The overlay ID. If not provided, checks if any overlay is open.
     * @returns {Boolean}
     */
    isOpen(id) {
        if (id) {
            return this.overlays.some((overlay) => overlay.id === id);
        }
        return this.overlays.length > 0;
    }

    /**
     * Gets the current overlay stack.
     *
     * @method stack
     * @returns {Array<OverlayDefinition>}
     */
    stack() {
        return [...this.overlays];
    }

    /**
     * Brings an overlay to the front of the stack.
     *
     * @method bringToFront
     * @param {String} id - The overlay ID
     */
    @action bringToFront(id) {
        const overlayIndex = this.overlays.findIndex((overlay) => overlay.id === id);
        if (overlayIndex === -1) {
            throw new Error(`Overlay with ID ${id} not found`);
        }

        if (overlayIndex === this.overlays.length - 1) {
            return; // Already at the front
        }

        const overlay = this.overlays[overlayIndex];
        this.overlays = [...this.overlays.slice(0, overlayIndex), ...this.overlays.slice(overlayIndex + 1), overlay];
    }

    /**
     * Gets the active tab key for an overlay.
     *
     * @method getActiveTab
     * @param {String} id - The overlay ID
     * @returns {String|null}
     */
    getActiveTab(id) {
        return this.activeTabs[id] || null;
    }

    /**
     * Generates a unique ID for an overlay.
     *
     * @private
     * @method #generateId
     * @returns {String}
     */
    #generateId() {
        return `overlay-${guidFor({})}`;
    }

    /**
     * Validates an overlay definition.
     *
     * @private
     * @method #validateDefinition
     * @param {OverlayDefinition} definition
     * @throws {Error} If the definition is invalid
     */
    #validateDefinition(definition) {
        if (!definition) {
            throw new Error('Overlay definition is required');
        }

        if (definition.tabs && definition.content) {
            throw new Error('Overlay definition cannot have both tabs and content');
        }

        if (!definition.tabs && !definition.content) {
            throw new Error('Overlay definition must have either tabs or content');
        }

        if (definition.tabs) {
            if (!Array.isArray(definition.tabs) || definition.tabs.length === 0) {
                throw new Error('Tabs must be a non-empty array');
            }

            for (const tab of definition.tabs) {
                if (!(tab.title || tab.label) || !(tab.component || tab.render)) {
                    throw new Error('Each tab must have (label or title), and (component or render) properties');
                }
            }
        }
    }

    /**
     * Syncs overlay state to route query parameters.
     *
     * @private
     * @method #syncToRoute
     * @param {OverlayDefinition} overlay
     */
    #syncToRoute(overlay) {
        if (!this.router) {
            return;
        }

        const queryParams = {
            panel_id: overlay.id,
        };

        if (overlay.tabs && this.activeTabs[overlay.id]) {
            queryParams.panel_tab = this.activeTabs[overlay.id];
        }

        this.router.transitionTo({ queryParams });
    }

    /**
     * Syncs active tab to route query parameters.
     *
     * @private
     * @method #syncTabToRoute
     * @param {OverlayDefinition} overlay
     * @param {String} tabKey
     */
    #syncTabToRoute(overlay, tabKey) {
        if (!this.router) {
            return;
        }

        this.router.transitionTo({
            queryParams: {
                panel_id: overlay.id,
                panel_tab: tabKey,
            },
        });
    }

    /**
     * Clears overlay state from route query parameters.
     *
     * @private
     * @method #clearFromRoute
     * @param {OverlayDefinition} overlay
     */
    #clearFromRoute(overlay) {
        if (!this.router) {
            return;
        }

        this.router.transitionTo({
            queryParams: {
                panel_id: null,
                panel_tab: null,
            },
        });
    }
}
