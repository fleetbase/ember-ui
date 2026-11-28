import Component from '@glimmer/component';
import { inject as service } from '@ember/service';

/**
 * `Layout::Canvas` — the canvas shell root: backdrop, content and chrome layers.
 *
 * Without a `<:backdrop>` block the backdrop layer renders
 * `Layout::Canvas::BackdropHost`, which shows the route's registered backdrop
 * (a live map) or the dot grid. While mounted it marks the `shell` service's
 * layout as `canvas`, so record panels render as sheets.
 */
export default class LayoutCanvasComponent extends Component {
    @service shell;

    constructor() {
        super(...arguments);
        this.shell.canvasDidMount();
    }

    willDestroy() {
        super.willDestroy(...arguments);
        this.shell.canvasWillUnmount();
    }
}
