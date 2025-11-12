import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { capitalize } from '@ember/string';
import { task } from 'ember-concurrency';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';
import getModelName from '@fleetbase/ember-core/utils/get-model-name';
import titleize from 'ember-cli-string-helpers/utils/titleize';

export default class LayoutResourcePanelComponent extends Component {
    @service store;
    @service fetch;
    @service intl;
    @service currentUser;
    @service notifications;
    @service hostRouter;
    @service contextPanel;
    @tracked overlayContext;

    // Mirror args (reactive)
    get resource() {
        return this.args.resource;
    }

    get controller() {
        return this.args.controller;
    }

    get width() {
        return this.args.width ?? '600px';
    }

    get isResizable() {
        return this.args.isResizable ?? true;
    }

    get authSchema() {
        return this.args.authSchema ?? 'fleet-ops';
    }

    get resourceName() {
        return this.resource?.name ?? this.resource?.displayName ?? this.resource?.display_name;
    }

    get resourceType() {
        const modelName = getModelName(this.resource);
        return titleize(modelName) ?? 'Resource';
    }

    get saveButtonText() {
        if (this.args.saveButtonText) {
            return this.args.saveButtonText;
        }

        if (this.resource.isNew) {
            return `Create new ${this.resourceType}`;
        }

        return 'Save Changes';
    }

    constructor() {
        super(...arguments);
        applyContextComponentArguments(this);
    }

    @action setOverlayContext(overlayContext) {
        this.context = overlayContext;
        contextComponentCallback(this, 'onLoad', ...arguments);
        contextComponentCallback(this, 'onOverlayReady', ...arguments);
    }

    @action onViewDetails() {
        const isActionOverrided = contextComponentCallback(this, 'onViewDetails', this.vendor);

        if (!isActionOverrided) {
            this.contextPanel.focus(this.vendor, 'viewing');
        }
    }

    @action onTabChange(tabName = 'Details') {
        const actionCallback = `onView${capitalize(tabName)}`;
        const isActionOverrided = contextComponentCallback(this, actionCallback, this.resource);

        if (!isActionOverrided) {
            this.contextPanel.focus(this.resource, tabName?.toLowerCase() || 'viewing');
        }
    }

    @action onPressCancel() {
        return contextComponentCallback(this, 'onPressCancel', this.resource);
    }

    @action onPressEdit() {
        return contextComponentCallback(this, 'onPressEdit', this.resource);
    }

    @action onOpen() {
        return contextComponentCallback(this, 'onOpen', { resource: this.resource, panel: this.context });
    }

    @action onClose() {
        return contextComponentCallback(this, 'onClose', { resource: this.resource, panel: this.context });
    }

    @task *save() {
        contextComponentCallback(this, 'onBeforeSave', this.resource);

        try {
            this.resource = yield this.resource.save();
        } catch (error) {
            this.notifications.serverError(error);
            return;
        }

        this.notifications.success(`${this.resourceType} ${this.resourceName ? `(${this.resourceName})` : ''} saved successfully.`);
        contextComponentCallback(this, 'onAfterSave', this.resource);
    }
}
