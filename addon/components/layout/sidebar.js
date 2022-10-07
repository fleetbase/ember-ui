import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class LayoutSidebarComponent extends Component {
  @tracked siderbarNode;
  @tracked gutterNode;
  @tracked mouseX = 0;
  @tracked mouseY = 0;
  @tracked sidebarWidth = 0;
  @tracked isResizing = false;

  @action setupNode(property, node) {
    this[`${property}Node`] = node;
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

    // Min resize width
    if (width <= minResizeWidth) {
      sidebarNode.style.width = `${minResizeWidth}px`;
      return;
    }

    // Max resize width
    if (width >= maxResizeWidth) {
      sidebarNode.style.width = `${maxResizeWidth}px`;
      return;
    }

    // Style changes
    sidebarNode.style.width = `${width}px`;
    sidebarNode.style.userSelect = 'none';
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

    // End resizing
    this.isResizing = false;

    // Remove style changes
    document.body.style.removeProperty('cursor');
    sidebarNode.style.userSelect = 'auto';

    // Remove the handlers of `mousemove` and `mouseup`
    document.removeEventListener('mousemove', this.resize);
    document.removeEventListener('mouseup', this.stopResize);

    if (typeof onResizeEnd === 'function') {
      onResizeEnd({ event, sidebarNode });
    }
  }
}
