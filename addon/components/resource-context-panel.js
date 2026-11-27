import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import { dasherize } from '@ember/string';
import isModel from '@fleetbase/ember-core/utils/is-model';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';

/**
 * Component that integrates with the resource-context-panel service
 * and renders overlays using the Layout::Resource::Panel component.
 *
 * @class ResourceContextPanelComponent
 * @extends Component
 */
export default class ResourceContextPanelComponent extends Component {
    @service resourceContextPanel;
    @service notifications;
    @service shell;

    /**
     * Map of overlay sizes to actual widths.
     * @type {Object}
     */
    sizeMap = {
        xxs: '400px',
        xs: '500px',
        sm: '550px',
        md: '600px',
        lg: '800px',
        xl: '1000px',
        fullscreen: '100vw',
    };

    /**
     * Map of overlay sizes to Sheet width presets, for the canvas layout.
     * @type {Object}
     */
    sheetSizeMap = {
        xxs: 'sm',
        xs: 'md',
        sm: 'md',
        md: 'md',
        lg: 'lg',
        xl: 'lg',
        fullscreen: 'lg',
    };

    /**
     * `canvas` or `classic`: `@layout` when given, else the shell service's.
     * In the canvas layout each overlay renders as a Sheet stacked with spines,
     * Escape is left to the sheets, and no click-catching backdrop is drawn (a
     * sheet floats over the live map without blocking it).
     * @type {String}
     */
    get layout() {
        return this.args.layout ?? this.shell.layout;
    }

    get isCanvas() {
        return this.layout === 'canvas';
    }

    get eachKey() {
        return this.isCanvas ? 'id' : '@identity';
    }

    get showDismissBackdrop() {
        return !this.isCanvas && Boolean(this.activeOverlay?.dismissible);
    }

    /**
     * Map of overlay sizes to resizable settings.
     * @type {Object}
     */
    resizableMap = {
        xs: true,
        sm: true,
        md: true,
        lg: true,
        xl: true,
        fullscreen: false,
    };

    /**
     * The top-most overlay, or null. Read here rather than calling the service method from the
     * template: a method invoked as a template helper runs without its `this`.
     * @type {OverlayDefinition|null}
     */
    get activeOverlay() {
        return this.resourceContextPanel.getActive();
    }

    /**
     * Returns overlays with computed properties for width, resizable, and tabs.
     * @type {Array}
     */
    get computedOverlays() {
        return this.resourceContextPanel.overlays.map((overlay) => {
            const resource = this.findResource(overlay);
            return {
                ...overlay,
                resource,
                model: resource,
                title: overlay.title ?? resource?.name ?? resource?.displayName,
                computedWidth: overlay.width ?? this.sizeMap[overlay.size] ?? this.sizeMap.sm,
                computedSheetWidth: overlay.width ?? this.sheetSizeMap[overlay.size] ?? this.sheetSizeMap.sm,
                canPark: this.resourceContextPanel.canPark(overlay),
                computedResizable: this.resizableMap[overlay.size] !== undefined ? this.resizableMap[overlay.size] : true,
                saveOptions: {
                    ...(overlay.saveOptions ?? {}),
                    overlay,
                },
                saveTask: overlay.saveTask ?? (overlay.useDefaultSaveTask ? this.saveTask : null),
                computedTabs: overlay.tabs
                    ? overlay.tabs.map((tab) => ({
                          ...tab,
                          resource,
                          component: tab.component ?? tab.render,
                          model: resource,
                          key: tab.key ?? tab.id ?? dasherize(tab.label ?? tab.title),
                          id: tab.id ?? tab.key ?? dasherize(tab.label ?? tab.title),
                          label: tab.label ?? tab.title,
                          icon: tab.icon,
                          disabled: tab.disabled || false,
                          badge: tab.badge,
                          closable: false,
                      }))
                    : [],
            };
        });
    }

    /**
     * Finds the resource model from a overlay definition
     */
    /* eslint-disable no-unused-vars */
    findResource(overlay) {
        if (!overlay || typeof overlay !== 'object') return null;

        if (overlay.resource && isModel(overlay.resource)) return overlay.resource;
        if (overlay.model && isModel(overlay.model)) return overlay.model;

        for (let [k, v] of Object.entries(overlay)) {
            if (isModel(v)) return v;
        }
        return overlay.resource ?? overlay.model ?? null;
    }

    getResourceName(resource) {
        let resourceName = resource?.name ?? resource?.displayName ?? resource?.display_name;
        return resourceName ?? getModelName(resource) ?? 'Resource';
    }

    /**
     * Handles tab change events from TabNavigation component.
     *
     * @method handleTabChange
     * @param {String} overlayId - The overlay ID
     * @param {Object} tab - The selected tab object
     * @action
     */
    @action handleTabChange(overlayId, tab) {
        this.resourceContextPanel.setActiveTab(overlayId, tab.id);
    }

    /**
     * Closes a specific overlay.
     *
     * @method closeOverlay
     * @param {String} id - The overlay ID
     * @action
     */
    @action closeOverlay(id) {
        this.resourceContextPanel.close(id);
    }

    /**
     * Brings a stacked overlay to the front (a sheet's spine was clicked).
     *
     * @method bringToFront
     * @param {String} id - The overlay ID
     * @action
     */
    @action bringToFront(id) {
        this.resourceContextPanel.bringToFront(id);
    }

    /**
     * Parks an overlay (see the service's `park()`).
     *
     * @method parkOverlay
     * @param {String} id - The overlay ID
     * @action
     */
    @action parkOverlay(id) {
        this.resourceContextPanel.park(id);
    }

    /**
     * Closes the active overlay.
     *
     * @method closeActiveOverlay
     * @action
     */
    @action closeActiveOverlay() {
        this.resourceContextPanel.close();
    }

    /**
     * Task for saving a resource.
     *
     * @task saveTask
     * @param {Object} resource - The resource to save
     */
    // computedOverlays always builds saveOptions as `{ ...overlay.saveOptions, overlay }`, and
    // that is the only thing ever handed to this task — so opts is always an object and always
    // names its overlay.
    @task *saveTask(resource, /* istanbul ignore next */ opts = {}) {
        /* istanbul ignore next -- see above */
        const overlayId = opts?.overlay?.id ?? opts?.overlayId;
        const isNew = resource?.isNew;

        try {
            const result = yield resource.save();
            this.notifications.success(`${this.getResourceName(resource)} ${isNew ? 'created' : 'updated'} successfully.`);

            /* istanbul ignore else -- see above: the overlay is always named */
            if (overlayId) {
                this.resourceContextPanel.close(overlayId);
            }

            if (typeof opts.callback === 'function') {
                opts.callback(result);
            }

            return result;
        } catch (error) {
            this.notifications.serverError(error);
            throw error;
        }
    }

    /**
     * Handles keyboard events for accessibility.
     *
     * @method handleKeydown
     * @param {KeyboardEvent} event
     * @action
     */
    @action handleKeydown(event) {
        // In the canvas layout the top Sheet handles Escape (see the sheet-stack service).
        if (event.key === 'Escape' && !this.isCanvas) {
            const activeOverlay = this.resourceContextPanel.getActive();
            if (activeOverlay && activeOverlay.dismissible) {
                this.closeActiveOverlay();
                event.preventDefault();
                event.stopPropagation();
            }
        }
    }

    /**
     * Sets up keyboard event listeners when the component is inserted.
     */
    constructor() {
        super(...arguments);

        // Add global keyboard event listener
        /* istanbul ignore else -- this addon only runs in a browser; the guard is for FastBoot */
        if (typeof document !== 'undefined') {
            document.addEventListener('keydown', this.handleKeydown);
        }
    }

    /**
     * Cleans up event listeners when the component is destroyed.
     */
    willDestroy() {
        super.willDestroy();

        /* istanbul ignore else -- this addon only runs in a browser; the guard is for FastBoot */
        if (typeof document !== 'undefined') {
            document.removeEventListener('keydown', this.handleKeydown);
        }
    }
}
