import Service, { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { guidFor } from '@ember/object/internals';
import { isPresent } from '@ember/utils';

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
     * Opens a new overlay panel with the given definition.
     *
     * @method open
     * @param {OverlayDefinition} definition - The overlay definition
     * @returns {String} The overlay ID
     */
    @action open(definition) {
        // Generate ID if not provided
        if (!definition.id) {
            definition.id = this._generateId();
        }

        // Default size to medium
        if (!definition.size) {
            definition.size = 'sm';
        }

        // Validate definition
        this._validateDefinition(definition);

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
            this._syncToRoute(definition);
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
        this._validateDefinition(updatedOverlay);

        this.overlays = [...this.overlays.slice(0, overlayIndex), updatedOverlay, ...this.overlays.slice(overlayIndex + 1)];

        // Sync with route if enabled
        if (updatedOverlay.routeSync) {
            this._syncToRoute(updatedOverlay);
        }
    }

    /**
     * Closes an overlay panel.
     *
     * @method close
     * @param {String} [id] - The overlay ID. If not provided, closes the active overlay.
     * @returns {Promise<void>}
     */
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

        // Clear route sync if enabled
        if (overlayToClose.routeSync) {
            this._clearFromRoute(overlayToClose);
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
                            this._setActiveTabInternal(id, tabKey, overlay);
                        }
                    });
                    return;
                } else if (!canLeave) {
                    return; // Guard prevented tab change
                }
            }
        }

        this._setActiveTabInternal(id, tabKey, overlay);
    }

    /**
     * Internal method to set active tab without guards.
     *
     * @private
     * @method _setActiveTabInternal
     * @param {String} id - The overlay ID
     * @param {String} tabKey - The tab key to activate
     * @param {OverlayDefinition} overlay - The overlay definition
     */
    _setActiveTabInternal(id, tabKey, overlay) {
        this.activeTabs = {
            ...this.activeTabs,
            [id]: tabKey,
        };

        // Sync with route if enabled
        if (overlay.routeSync) {
            this._syncTabToRoute(overlay, tabKey);
        }
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
     * @method _generateId
     * @returns {String}
     */
    _generateId() {
        return `overlay-${guidFor({})}`;
    }

    /**
     * Validates an overlay definition.
     *
     * @private
     * @method _validateDefinition
     * @param {OverlayDefinition} definition
     * @throws {Error} If the definition is invalid
     */
    _validateDefinition(definition) {
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
     * @method _syncToRoute
     * @param {OverlayDefinition} overlay
     */
    _syncToRoute(overlay) {
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
     * @method _syncTabToRoute
     * @param {OverlayDefinition} overlay
     * @param {String} tabKey
     */
    _syncTabToRoute(overlay, tabKey) {
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
     * @method _clearFromRoute
     * @param {OverlayDefinition} overlay
     */
    _clearFromRoute(overlay) {
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
