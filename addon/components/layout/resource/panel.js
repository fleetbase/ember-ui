import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';

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

    get width() {
        return this.args.width ?? '600px';
    }

    get isResizable() {
        return this.args.isResizable ?? true;
    }

    get authSchema() {
        return this.args.authSchema ?? 'fleet-ops';
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

    @action onPressCancel() {
        return contextComponentCallback(this, 'onPressCancel', this.resource);
    }

    @action onOpen() {
        return contextComponentCallback(this, 'onOpen', { resource: this.resource, panel: this.context });
    }

    @action onToggle() {
        return contextComponentCallback(this, 'onToggle', { resource: this.resource, panel: this.context });
    }

    @action onClose() {
        return contextComponentCallback(this, 'onClose', { resource: this.resource, panel: this.context });
    }
}
