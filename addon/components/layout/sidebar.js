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
    resizeFrame = null;
    pendingResizeWidth = null;
    activeResizeContainer = null;
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
        this.pendingResizeWidth = width;
        this.scheduleResizeFrame();

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
        sidebarNode.classList.add('sidebar-is-resizing');
        this.setResizeContainerActive(sidebarNode, true);

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
        const minResizeWidth = this.args.minResizeWidth ?? 200;
        const rawWidth = event.clientX - this.mouseX + this.sidebarWidth;

        // End resizing
        this.isResizing = false;

        // Remove style changes
        document.body.style.removeProperty('cursor');
        sidebarNode.style.userSelect = 'auto';
        this.pendingResizeWidth = rawWidth;
        this.flushResizeFrame();
        sidebarNode.classList.remove('sidebar-is-resizing');
        this.setResizeContainerActive(sidebarNode, false);
        const currentWidth = sidebarNode?.getBoundingClientRect?.().width ?? 0;

        if (rawWidth <= collapseBelowWidth) {
            this.hide(sidebarNode, false, { restoreWidthAfterHide: true });
        } else {
            this.clearResizeCollapseState(sidebarNode);

            const visibleWidth = Math.max(currentWidth, minResizeWidth);
            sidebarNode.style.width = `${visibleWidth}px`;

            if (visibleWidth >= minResizeWidth) {
                this.lastVisibleWidth = visibleWidth;
            }

            this.syncTransitionWidth(sidebarNode);
        }

        // Remove the handlers of `mousemove` and `mouseup`
        document.removeEventListener('mousemove', this.resize);
        document.removeEventListener('mouseup', this.stopResize);

        if (typeof onResizeEnd === 'function') {
            onResizeEnd({ event, sidebarNode });
        }
    }

    scheduleResizeFrame() {
        if (this.resizeFrame) {
            return;
        }

        this.resizeFrame = requestAnimationFrame(() => {
            this.resizeFrame = null;
            this.applyResizeWidth(this.pendingResizeWidth);
        });
    }

    flushResizeFrame() {
        if (this.resizeFrame) {
            cancelAnimationFrame(this.resizeFrame);
            this.resizeFrame = null;
        }

        this.applyResizeWidth(this.pendingResizeWidth);
    }

    setResizeContainerActive(sidebarNode = this.sidebarNode, isActive = false) {
        const container = sidebarNode?.closest?.('.next-view-container');

        if (isActive && container) {
            this.activeResizeContainer = container;
            container.classList.add('sidebar-is-resizing');
            document.body.classList.add('next-sidebar-is-resizing');
            this.resetHorizontalScroll();
            return;
        }

        this.activeResizeContainer?.classList.remove('sidebar-is-resizing');
        this.activeResizeContainer = null;
        document.body.classList.remove('next-sidebar-is-resizing');
        this.resetHorizontalScroll();
    }

    applyResizeWidth(width) {
        const { sidebarNode } = this;

        if (!sidebarNode || !Number.isFinite(width)) {
            return;
        }

        const minResizeWidth = this.args.minResizeWidth ?? 200;
        const maxResizeWidth = this.args.maxResizeWidth ?? 330;
        const activeResizeFloor = this.isResizing ? 1 : 0;
        const fadeEndWidth = 50;
        const isCollapsing = width < minResizeWidth;
        const resizeWidth = isCollapsing ? Math.max(width, activeResizeFloor) : Math.max(minResizeWidth, Math.min(width, maxResizeWidth));
        const collapseOffset = isCollapsing ? minResizeWidth - resizeWidth : 0;
        const fadeDistance = Math.max(1, minResizeWidth - fadeEndWidth);
        const collapseProgress = Math.min(collapseOffset / fadeDistance, 1);

        sidebarNode.style.width = `${resizeWidth}px`;
        sidebarNode.style.userSelect = 'none';
        sidebarNode.classList.toggle('sidebar-resizing-to-collapse', collapseOffset > 0);
        sidebarNode.style.setProperty('--sidebar-drawer-width', `${minResizeWidth}px`);
        sidebarNode.style.setProperty('--sidebar-collapse-offset', `-${collapseOffset}px`);
        sidebarNode.style.setProperty('--sidebar-collapse-progress', collapseProgress);
        this.resetHorizontalScroll();
    }

    resetHorizontalScroll() {
        document.documentElement.scrollLeft = 0;
        document.body.scrollLeft = 0;

        if (this.activeResizeContainer) {
            this.activeResizeContainer.scrollLeft = 0;
        }
    }

    syncState(state) {
        this.sidebar.setVisualState(state);
        this.hidden = state === 'hidden';
        this.minimized = state === 'minimized';
    }

    clearResizeCollapseState(sidebarNode = this.sidebarNode) {
        if (!sidebarNode) return;

        sidebarNode.classList.remove('sidebar-resizing-to-collapse');
        sidebarNode.style.removeProperty('--sidebar-drawer-width');
        sidebarNode.style.removeProperty('--sidebar-collapse-offset');
        sidebarNode.style.removeProperty('--sidebar-collapse-progress');
        this.pendingResizeWidth = null;
        this.setResizeContainerActive(sidebarNode, false);
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

    restoreVisibleWidthWithoutTransition(sidebarNode = this.sidebarNode) {
        if (!sidebarNode) return;

        const transition = sidebarNode.style.transition;

        sidebarNode.style.transition = 'none';
        this.restoreVisibleWidth(sidebarNode);
        sidebarNode.getBoundingClientRect();

        if (transition) {
            sidebarNode.style.transition = transition;
        } else {
            sidebarNode.style.removeProperty('transition');
        }
    }

    @action hideNow(sidebarNode) {
        sidebarNode = sidebarNode ?? this.sidebarNode;
        return this.hide(sidebarNode, true);
    }

    @action hide(sidebarNode, now = false, options = {}) {
        sidebarNode = sidebarNode ?? this.sidebarNode;
        const restoreWidthAfterHide = options.restoreWidthAfterHide === true;

        this.cancelHideTimer();
        this.syncTransitionWidth(sidebarNode);
        this.syncState('hidden');

        if (now === true) {
            sidebarNode.classList.add('sidebar-hidden');
            sidebarNode.classList.remove('sidebar-hide', 'sidebar-minimized');
            this.clearResizeCollapseState(sidebarNode);

            return;
        }

        sidebarNode.classList.remove('sidebar-minimized');
        sidebarNode.classList.add('sidebar-hide');

        this.hideTimer = later(
            this,
            () => {
                sidebarNode.classList.add('sidebar-hidden');
                sidebarNode.classList.remove('sidebar-hide');

                if (restoreWidthAfterHide) {
                    this.restoreVisibleWidthWithoutTransition(sidebarNode);
                }

                this.clearResizeCollapseState(sidebarNode);
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
        this.clearResizeCollapseState(sidebarNode);
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
        if (this.resizeFrame) {
            cancelAnimationFrame(this.resizeFrame);
            this.resizeFrame = null;
        }
        this.setResizeContainerActive(this.sidebarNode, false);
        document.removeEventListener('mousemove', this.resize);
        document.removeEventListener('mouseup', this.stopResize);
        this.sidebar.clearContext(this.context);
    }
}
