import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import { dasherize } from '@ember/string';
import isModel from '@fleetbase/ember-core/utils/is-model';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';
import titleize from 'ember-cli-string-helpers/utils/titleize';

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
     * Checks if there are any overlays open.
     * @type {Boolean}
     */
    get hasOverlays() {
        return this.resourceContextPanel.overlays.length > 0;
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

    getResourceType(resource) {
        return titleize(getModelName(resource)) ?? 'Resource';
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
     * Closes the active overlay.
     *
     * @method closeActiveOverlay
     * @action
     */
    @action closeActiveOverlay() {
        this.resourceContextPanel.close();
    }

    /**
     * Sets the active tab for an overlay.
     *
     * @method setActiveTab
     * @param {String} overlayId - The overlay ID
     * @param {String} tabKey - The tab key
     * @action
     */
    @action setActiveTab(overlayId, tabKey) {
        this.resourceContextPanel.setActiveTab(overlayId, tabKey);
    }

    /**
     * Task for saving a resource.
     *
     * @task saveTask
     * @param {Object} resource - The resource to save
     */
    @task *saveTask(resource, opts = {}) {
        const overlayId = opts?.overlay?.id ?? opts?.overlayId;
        const isNew = resource?.isNew;

        try {
            const result = yield resource.save();
            this.notifications.success(`${this.getResourceName(resource)} ${isNew ? 'created' : 'updated'} successfully.`);

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
        if (event.key === 'Escape') {
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
        if (typeof document !== 'undefined') {
            document.addEventListener('keydown', this.handleKeydown);
        }
    }

    /**
     * Cleans up event listeners when the component is destroyed.
     */
    willDestroy() {
        super.willDestroy();

        if (typeof document !== 'undefined') {
            document.removeEventListener('keydown', this.handleKeydown);
        }
    }
}
