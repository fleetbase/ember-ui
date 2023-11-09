import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { later } from '@ember/runloop';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';

export default class DrawerComponent extends Component {
    @tracked drawerNode;
    @tracked drawerContainerNode;
    @tracked drawerPanelNode;
    @tracked gutterNode;
    @tracked noBackdrop = true;
    @tracked isOpen = true;
    @tracked isResizable = true;
    @tracked isResizing = false;
    @tracked isMinimized = false;
    @tracked mouseX = 0;
    @tracked mouseY = 0;
    @tracked height = 300;
    @tracked _rendered = false;

    context = {
        toggle: this.toggle,
        open: this.open,
        close: this.close,
        toggleMinimize: this.toggleMinimize,
        minimize: this.minimize,
        maximize: this.maximize,
        isOpen: this.isOpen,
    };

    @action setupComponent(element) {
        this.drawerNode = element;
        this.height = getWithDefault(this.args, 'height', this.height);
        this.isMinimized = getWithDefault(this.args, 'isMinimized', this.isMinimized);

        later(
            this,
            () => {
                this.isOpen = getWithDefault(this.args, 'isOpen', this.isOpen);
                this.isResizable = getWithDefault(this.args, 'isResizable', this.isResizable);
                this.noBackdrop = getWithDefault(this.args, 'noBackdrop', this.noBackdrop);

                if (typeof this.args.onLoad === 'function') {
                    this.args.onLoad(this.context);
                }

                this._rendered = true;
            },
            300
        );
    }

    @action setupNode(property, node) {
        this[`${property}Node`] = node;
    }

    @action toggle() {
        this.isOpen = !this.isOpen;
    }

    @action open() {
        this.isOpen = true;
    }

    @action close() {
        this.isOpen = false;
    }

    @action toggleMinimize() {
        this.isMinimized = !this.isMinimized;
    }

    @action minimize() {
        this.isMinimized = true;
    }

    @action maximize() {
        this.isMinimized = false;
    }

    @action startResize(event) {
        const disableResize = getWithDefault(this.args, 'disableResize', false);
        const onResizeStart = getWithDefault(this.args, 'onResizeStart', null);
        const { drawerPanelNode, isResizable } = this;

        if (disableResize === true || !isResizable || !drawerPanelNode) {
            return;
        }

        // if minimized undo
        if (this.isMinimized) {
            return this.maximize();
        }

        const bounds = drawerPanelNode.getBoundingClientRect();

        // Set the overlay width/height
        this.overlayWidth = bounds.width;
        this.overlayHeight = bounds.height;

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
            onResizeStart({ event, drawerPanelNode });
        }
    }

    @action resize(event) {
        const disableResize = getWithDefault(this.args, 'disableResize', false);
        const onResize = getWithDefault(this.args, 'onResize', null);
        const { drawerPanelNode, isResizable } = this;

        if (disableResize === true || !isResizable || !drawerPanelNode) {
            return;
        }

        const dx = event.clientX - this.mouseX;
        const dy = event.clientY - this.mouseY;
        const multiplier = -1;
        const width = dx * multiplier + this.overlayWidth;
        const height = dy * multiplier + this.overlayHeight;
        const minResizeHeight = getWithDefault(this.args, 'minResizeHeight', 0);
        const maxResizeHeight = getWithDefault(this.args, 'maxResizeHeight', 600);

        // Min resize width
        if (height <= minResizeHeight) {
            drawerPanelNode.style.height = `${minResizeHeight}px`;
            return;
        }

        // Max resize width
        if (height >= maxResizeHeight) {
            drawerPanelNode.style.height = `${maxResizeHeight}px`;
            return;
        }

        // Style changes
        drawerPanelNode.style.userSelect = 'none';
        drawerPanelNode.style.height = `${height}px`;
        document.body.style.cursor = 'row-resize';

        // Send callback
        if (typeof onResize === 'function') {
            onResize({ event, drawerPanelNode });
        }
    }

    @action stopResize(event) {
        const onResizeEnd = getWithDefault(this.args, 'onResizeEnd', null);
        const { drawerPanelNode } = this;

        // End resizing
        this.isResizing = false;

        // Remove style changes
        document.body.style.removeProperty('cursor');
        drawerPanelNode.style.userSelect = 'auto';

        // Remove the handlers of `mousemove` and `mouseup`
        document.removeEventListener('mousemove', this.resize);
        document.removeEventListener('mouseup', this.stopResize);

        if (typeof onResizeEnd === 'function') {
            onResizeEnd({ event, drawerPanelNode });
        }
    }
}
