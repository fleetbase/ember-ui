import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { getOwner } from '@ember/application';
import contextComponentCallback from '@fleetbase/ember-core/utils/context-component-callback';
import applyContextComponentArguments from '@fleetbase/ember-core/utils/apply-context-component-arguments';
import { shellState } from '../../../services/shell';
import lookupResourceView, { mergeHeaderButtons } from '../../../utils/resource-view';

export default class LayoutResourcePanelComponent extends Component {
    @service store;
    @service fetch;
    @service intl;
    @service currentUser;
    @service notifications;
    @service hostRouter;
    @service contextPanel;
    @tracked overlayContext;

    /**
     * In the canvas layout the panel renders as a `Sheet`; in classic as the
     * right-hand `Overlay` it always was. `@layout` (`canvas` | `classic`)
     * overrides the shell layout (`shellState`, which engines can read too).
     */
    get isCanvas() {
        if (this.args.layout) {
            return this.args.layout === 'canvas';
        }
        return shellState.isCanvas;
    }

    get sheetTitle() {
        return this.args.headerTitle ?? this.resource?.name ?? this.resource?.displayName;
    }

    /**
     * `@sheetWidth` (a Sheet preset or length) wins; otherwise `@width`, which in
     * the classic layout is an Overlay width such as `600px`.
     */
    get sheetWidth() {
        return this.args.sheetWidth ?? this.args.width ?? 'md';
    }

    get sheetMinWidth() {
        return parseInt(this.args.minResizeWidth, 10) || undefined;
    }

    get sheetMaxWidth() {
        return parseInt(this.args.maxResizeWidth, 10) || undefined;
    }

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

    /**
     * `@actionButtons` with what extensions registered under `@registry`
     * (a details prefix such as `ledger:invoice:details`) merged in: header
     * buttons from its `actions` slot and dropdown items from its `menu` slot.
     */
    get actionButtons() {
        const component = this;
        const context = {
            resource: this.resource,
            get panel() {
                return component.context;
            },
        };

        return mergeHeaderButtons(lookupResourceView(getOwner(this)), this.args.registry, this.args.actionButtons, context, { withMenu: true });
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

    /**
     * The canvas counterpart of `setOverlayContext`: the sheet's API stands in
     * for the overlay context, and the panel's onLoad/onOpen callbacks fire as
     * the sheet mounts.
     */
    @action setSheetContext(sheet) {
        this.context = sheet;
        contextComponentCallback(this, 'onLoad', sheet);
        contextComponentCallback(this, 'onOverlayReady', sheet);
        contextComponentCallback(this, 'onOpen', { resource: this.resource, panel: sheet });
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
