import Component from '@glimmer/component';
import { getOwner } from '@ember/application';
import { optionalService } from '../../../utils/shell';

/**
 * `Layout::Canvas::BackdropHost` — renders the canvas backdrop from ember-core's
 * `backdrop` service.
 *
 * Every registration in `backdrop.mounted` renders once, keyed by name, inside
 * its own slot. Only the `active` one is visible; the others are hidden with
 * `visibility: hidden` and `inert`, never torn down, so a keep-alive live map
 * survives a visit to a page without one. With no active backdrop (or no
 * `backdrop` service at all) the dot grid shows.
 *
 * A registration is `{ name, component, routes, priority, keepAlive }`. Its
 * component receives:
 * - `@registration` the registration itself
 * - `@isActive` whether it is the visible backdrop
 * - `@state` the service's merged `state` (`{ layers, fitBounds, focus, mode }`)
 * - `@backdrop` the service, for `setInstance(map)` and `onReady()`
 *
 * While a backdrop is active, the canvas content layer stops taking the pointer
 * in its gaps (see `layout/canvas.css`), so the map stays draggable around the
 * floating cards.
 */
export default class LayoutCanvasBackdropHostComponent extends Component {
    get backdrop() {
        return optionalService(getOwner(this), 'backdrop');
    }

    get active() {
        return this.backdrop?.active ?? null;
    }

    get state() {
        return this.backdrop?.state ?? null;
    }

    /**
     * The registrations to render. Falls back to just the active one when the
     * service has no `mounted` list.
     */
    get entries() {
        const backdrop = this.backdrop;
        if (!backdrop) {
            return [];
        }

        const active = this.active;
        const mounted = Array.isArray(backdrop.mounted) ? backdrop.mounted : [];
        const registrations = mounted.length || !active ? mounted : [active];

        return registrations
            .filter((registration) => registration && registration.name && registration.component)
            .map((registration) => {
                const isActive = Boolean(active) && registration.name === active.name;
                return { name: registration.name, component: registration.component, registration, isActive, inert: isActive ? undefined : true };
            });
    }

    get hasActive() {
        return this.entries.some((entry) => entry.isActive);
    }
}
