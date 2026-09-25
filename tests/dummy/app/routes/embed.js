import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';
import { findBySlug } from 'dummy/playground/registry';

export default class EmbedRoute extends Route {
    @service router;

    model({ slug }) {
        const entry = findBySlug(slug);

        if (!entry) {
            return this.router.replaceWith('not-found', slug);
        }

        return entry;
    }
}
