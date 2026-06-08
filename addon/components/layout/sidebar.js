import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { cancel, later } from '@ember/runloop';
import { capitalize } from '@ember/string';

class SidebarContext {
    constructor(component) {
        this.hide = (immediate = false) => component.hide(undefined, immediate);
        this.hideNow = () => component.hideNow();
        this.show = () => component.show();
        this.minimize = () => component.minimize();
        this.component = component;
    }
}

export default class LayoutSidebarComponent extends Component {
    @service sidebar;
    @tracked sidebarNode;
    @tracked gutterNode;
    @tracked mouseX = 0;
    @tracked mouseY = 0;
    @tracked sidebarWidth = 0;
    @tracked isResizing = false;
    @tracked hidden = false;
    @tracked minimized = false;
    @tracked lastVisibleWidth = 0;
    hideTimer = null;
    context = null;

    @action setupNode(property, node) {
        this[`${property}Node`] = node;

        const callbackName = `on${capitalize(property)}Setup`;

        if (typeof this[callbackName] === 'function') {
            this[callbackName](node);
        }

        if (typeof this.args[callbackName] === 'function') {
            this.args[callbackName](node);
        }
    }

    @action onSidebarSetup(sidebarNode) {
        const { hide, onSetup } = this.args;

        const context = new SidebarContext(this);
        this.context = context;
        this.sidebar.registerContext(context);
        this.syncTransitionWidth(sidebarNode);

        if (hide === true || this.sidebar.isDisabled) {
            this.hideNow(sidebarNode);
        } else if (this.sidebar.isHidden) {
            this.hideNow(sidebarNode);
        } else if (this.sidebar.isMinimized) {
            this.minimize(sidebarNode);
        } else {
            this.show(sidebarNode);
        }

        if (typeof onSetup === 'function') {
            onSetup(context);
        }
    }

    @action resize(event) {
        const { disableResize, onResize } = this.args;
        const { sidebarNode } = this;

        if (disableResize === true || !sidebarNode) {
            return;
        }

        const dx = event.clientX - this.mouseX;
        const multiplier = 1;
        const width = dx * multiplier + this.sidebarWidth;
        const minResizeWidth = this.args.minResizeWidth ?? 200;
        const maxResizeWidth = this.args.maxResizeWidth ?? 330;
        const collapseBelowWidth = this.args.collapseBelowWidth ?? 160;
        const resizeWidth = Math.max(collapseBelowWidth, Math.min(width, maxResizeWidth));

        // Style changes
        sidebarNode.style.width = `${resizeWidth}px`;
        sidebarNode.style.userSelect = 'none';
        sidebarNode.classList.toggle('sidebar-resizing-to-collapse', resizeWidth <= minResizeWidth);
        document.body.style.cursor = 'col-resize';

        if (typeof onResize === 'function') {
            onResize({ event, sidebarNode });
        }
    }

    @action startResize(event) {
        const { disableResize, onResizeStart } = this.args;
        const { sidebarNode } = this;

        if (disableResize === true || !sidebarNode) {
            return;
        }

        const bounds = sidebarNode.getBoundingClientRect();

        // Set the sidebar width
        this.sidebarWidth = bounds.width;
        this.lastVisibleWidth = bounds.width;

        // Start resizing
        this.isResizing = true;

        // Get the current mouse position
        this.mouseX = event.clientX;
        this.mouseY = event.clientY;

        // Attach the listeners
        document.addEventListener('mousemove', this.resize);
        document.addEventListener('mouseup', this.stopResize);

        // Send up event
        if (typeof onResizeStart === 'function') {
            onResizeStart({ event, sidebarNode });
        }
    }

    @action stopResize(event) {
        const { onResizeEnd } = this.args;
        const { sidebarNode } = this;
        const collapseBelowWidth = this.args.collapseBelowWidth ?? 160;
        const restoreWidth = this.args.restoreWidth ?? 220;
        const currentWidth = sidebarNode?.getBoundingClientRect?.().width ?? 0;

        // End resizing
        this.isResizing = false;

        // Remove style changes
        document.body.style.removeProperty('cursor');
        sidebarNode.style.userSelect = 'auto';
        sidebarNode.classList.remove('sidebar-resizing-to-collapse');

        if (currentWidth <= collapseBelowWidth) {
            sidebarNode.style.width = `${this.lastVisibleWidth || restoreWidth}px`;
            this.hide(sidebarNode);
        } else {
            this.lastVisibleWidth = currentWidth;
            this.syncTransitionWidth(sidebarNode);
        }

        // Remove the handlers of `mousemove` and `mouseup`
        document.removeEventListener('mousemove', this.resize);
        document.removeEventListener('mouseup', this.stopResize);

        if (typeof onResizeEnd === 'function') {
            onResizeEnd({ event, sidebarNode });
        }
    }

    syncState(state) {
        this.sidebar.setVisualState(state);
        this.hidden = state === 'hidden';
        this.minimized = state === 'minimized';
    }

    cancelHideTimer() {
        if (this.hideTimer) {
            cancel(this.hideTimer);
            this.hideTimer = null;
        }
    }

    syncTransitionWidth(sidebarNode = this.sidebarNode) {
        if (!sidebarNode) return;

        const width = sidebarNode.getBoundingClientRect?.().width;
        if (!Number.isFinite(width) || width <= 0) return;

        sidebarNode.style.setProperty('--sidebar-transition-width', `${width}px`);
    }

    restoreVisibleWidth(sidebarNode = this.sidebarNode) {
        if (!sidebarNode) return;

        const restoreWidth = this.args.restoreWidth ?? 220;
        const width = this.lastVisibleWidth || restoreWidth;

        sidebarNode.style.width = `${width}px`;
        this.syncTransitionWidth(sidebarNode);
    }

    @action hideNow(sidebarNode) {
        sidebarNode = sidebarNode ?? this.sidebarNode;
        return this.hide(sidebarNode, true);
    }

    @action hide(sidebarNode, now = false) {
        sidebarNode = sidebarNode ?? this.sidebarNode;
        this.cancelHideTimer();
        this.syncTransitionWidth(sidebarNode);
        this.syncState('hidden');

        if (now === true) {
            sidebarNode.classList.add('sidebar-hidden');
            sidebarNode.classList.remove('sidebar-hide', 'sidebar-minimized');

            return;
        }

        sidebarNode.classList.remove('sidebar-minimized');
        sidebarNode.classList.add('sidebar-hide');

        this.hideTimer = later(
            this,
            () => {
                sidebarNode.classList.add('sidebar-hidden');
                sidebarNode.classList.remove('sidebar-hide');
                this.hideTimer = null;
            },
            500
        );
    }

    @action show(sidebarNode) {
        sidebarNode = sidebarNode ?? this.sidebarNode;
        this.cancelHideTimer();
        this.restoreVisibleWidth(sidebarNode);
        this.syncTransitionWidth(sidebarNode);
        sidebarNode.classList.remove('sidebar-hidden', 'sidebar-hide', 'sidebar-minimized');
        this.syncState('visible');
    }

    @action minimize(sidebarNode) {
        sidebarNode = sidebarNode ?? this.sidebarNode;
        this.cancelHideTimer();
        this.syncTransitionWidth(sidebarNode);
        sidebarNode.classList.remove('sidebar-hidden', 'sidebar-hide');
        sidebarNode.classList.add('sidebar-minimized');
        this.syncState('minimized');
    }

    @action teardown() {
        this.cancelHideTimer();
        document.removeEventListener('mousemove', this.resize);
        document.removeEventListener('mouseup', this.stopResize);
        this.sidebar.clearContext(this.context);
    }
}
