import Component from '@glimmer/component';
import Service from '@ember/service';
import Evented from '@ember/object/evented';
import { getOwner } from '@ember/application';
import { setComponentTemplate } from '@ember/component';
import { hbs } from 'ember-cli-htmlbars';

/**
 * Host-application dependencies the console layout components expect, registered on demand.
 *
 * `<LinkToExternal>` comes from ember-engines and only resolves inside a mounted engine; `media`
 * comes from the host application. Neither exists in a bare dummy app, and without them
 * `Layout::Header` and `Layout::MobileNavbar` throw while rendering.
 *
 * These are registered from the adapters that need them rather than added as dummy-app files, so
 * the blast radius is the playground only — the existing component integration tests continue to
 * register their own stubs and are completely unaffected.
 */

class LinkToExternalStub extends Component {}

setComponentTemplate(hbs`<a href="javascript:;" data-test-route={{@route}} ...attributes>{{yield}}</a>`, LinkToExternalStub);

class DesktopMediaStub extends Service.extend(Evented) {
    isMobile = false;
}

class MobileMediaStub extends Service.extend(Evented) {
    isMobile = true;
}

/**
 * Replace an existing registration.
 *
 * `media` is already registered by ember-responsive, whose real service reports the *test
 * browser's* viewport. `Layout::MobileNavbar` renders nothing at all unless `(media "isMobile")`
 * is true, so the preview has to decide the answer rather than inherit it. Unregistering first
 * also clears any cached instance.
 */
function replaceRegistration(owner, fullName, factory) {
    if (owner.hasRegistration(fullName)) {
        owner.unregister(fullName);
    }

    owner.register(fullName, factory);
}

/**
 * Prepare the owner for a console-layout preview.
 *
 * @param {object} context a component instance, used to reach the owner
 * @param {{mobile?: boolean}} options
 */
export function setupConsoleLayout(context, { mobile = false } = {}) {
    const owner = getOwner(context);

    // Replaced rather than registered-if-absent: `hasRegistration()` also answers true for
    // anything the resolver can find, and ember-engines' real <LinkToExternal> throws outside a
    // mounted engine.
    replaceRegistration(owner, 'component:link-to-external', LinkToExternalStub);
    replaceRegistration(owner, 'service:media', mobile ? MobileMediaStub : DesktopMediaStub);

    // `hasExtension()` reads the application's extension registry; an unset one throws.
    const application = owner.application;

    if (application && !Array.isArray(application.extensions)) {
        application.extensions = [];
    }

    // The sidebar's `isVisible` is a derived getter — drive it through the service's own API.
    const sidebar = owner.lookup('service:sidebar');

    if (sidebar && typeof sidebar.setVisualState === 'function') {
        sidebar.setVisualState('visible');
    }

    return owner;
}
