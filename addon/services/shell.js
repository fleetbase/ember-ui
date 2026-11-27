import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { schedule } from '@ember/runloop';

export const LAYOUTS = ['classic', 'canvas'];

/**
 * Which application shell is on screen: `classic` (sidebar and header) or
 * `canvas` (Map-Canvas+ floating chrome).
 *
 * Components that render differently in the two shells (`Layout::Resource::Panel`
 * becomes a `Sheet`, for one) read `isCanvas`. The console sets the layout with
 * `setLayout()` when it picks a shell; `Layout::Canvas` also marks the canvas
 * layout while it is mounted, so a canvas rendered without the console (tests,
 * the playground) behaves the same.
 *
 * @class ShellService
 * @extends Service
 */
export default class ShellService extends Service {
    /**
     * The layout set with `setLayout()`; `classic` until then.
     * @type {String}
     */
    @tracked explicitLayout = 'classic';

    /**
     * Number of `Layout::Canvas` roots mounted.
     * @type {Number}
     */
    @tracked mountedCanvases = 0;

    /**
     * `canvas` while a canvas is mounted or the console chose it, else `classic`.
     * @type {String}
     */
    get layout() {
        return this.mountedCanvases > 0 ? 'canvas' : this.explicitLayout;
    }

    get isCanvas() {
        return this.layout === 'canvas';
    }

    get isClassic() {
        return !this.isCanvas;
    }

    /**
     * Set the layout the console renders. Unknown values fall back to `classic`.
     *
     * @param {String} layout `classic` or `canvas`
     */
    setLayout(layout) {
        this.explicitLayout = LAYOUTS.includes(layout) ? layout : 'classic';
    }

    /**
     * Called by `Layout::Canvas` as it mounts and unmounts. The count changes in
     * the runloop's actions queue rather than mid-render: a panel that read the
     * layout earlier in the same render would otherwise trip Glimmer's
     * "updated a value already used in this render" assertion. The re-render it
     * causes happens before the browser paints.
     */
    canvasDidMount() {
        schedule('actions', this, this.#adjust, 1);
    }

    canvasWillUnmount() {
        schedule('actions', this, this.#adjust, -1);
    }

    #adjust(step) {
        if (this.isDestroying || this.isDestroyed) {
            return;
        }
        this.mountedCanvases = Math.max(0, this.mountedCanvases + step);
    }
}
