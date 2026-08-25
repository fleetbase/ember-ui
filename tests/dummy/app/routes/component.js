import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { findBySlug } from 'dummy/playground/registry';

export default class ComponentRoute extends Route {
    @service router;

    /**
     * Only documented slugs resolve. An existing-but-undocumented public component falls through
     * to the playground's not-found page rather than being exposed automatically.
     */
    model({ slug }) {
        const entry = findBySlug(slug);

        if (!entry) {
            return this.router.replaceWith('not-found', slug);
        }

        return entry;
    }
}
