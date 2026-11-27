import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { schedule } from '@ember/runloop';

export const LAYOUTS = ['classic', 'canvas'];

/**
 * The layout state itself, one per page. It lives at module level, not on the
 * service, because components that read it (`Layout::Resource::Panel`, `Sheet`)
 * also render inside engines, whose owners do not have this service: they
 * import `shellState` instead of injecting it, and see the same value as the
 * host.
 */
class ShellState {
    // No initializers: @tracked initializers run lazily on first read, and reset() always writes
    // first, so they would never execute. The constructor sets the starting values instead.
    @tracked explicitLayout;
    @tracked mountedCanvases;

    constructor() {
        this.reset();
    }

    get layout() {
        return this.mountedCanvases > 0 ? 'canvas' : this.explicitLayout;
    }

    get isCanvas() {
        return this.layout === 'canvas';
    }

    reset() {
        this.explicitLayout = 'classic';
        this.mountedCanvases = 0;
    }
}

export const shellState = new ShellState();

/**
 * Which application shell is on screen: `classic` (sidebar and header) or
 * `canvas` (Map-Canvas+ floating chrome).
 *
 * The console sets the layout with `setLayout()` when it picks a shell;
 * `Layout::Canvas` also marks the canvas layout while it is mounted, so a
 * canvas rendered without the console (tests, the playground) behaves the
 * same. Components read `shellState` (exported above), which works in engines
 * too.
 *
 * @class ShellService
 * @extends Service
 */
export default class ShellService extends Service {
    state = shellState;

    get explicitLayout() {
        return shellState.explicitLayout;
    }

    get mountedCanvases() {
        return shellState.mountedCanvases;
    }

    /** `canvas` while a canvas is mounted or the console chose it, else `classic`. */
    get layout() {
        return shellState.layout;
    }

    get isCanvas() {
        return shellState.isCanvas;
    }

    get isClassic() {
        return !shellState.isCanvas;
    }

    /**
     * Set the layout the console renders. Unknown values fall back to `classic`.
     *
     * @param {String} layout `classic` or `canvas`
     */
    setLayout(layout) {
        shellState.explicitLayout = LAYOUTS.includes(layout) ? layout : 'classic';
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
        shellState.mountedCanvases = Math.max(0, shellState.mountedCanvases + step);
    }
}
