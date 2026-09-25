import Route from '@ember/routing/route';
import { inject as service } from '@ember/service';

export default class ApplicationRoute extends Route {
    @service router;

    /**
     * The playground's front door is the catalog; `/` itself renders nothing of its own.
     */
    redirect(model, transition) {
        if (transition.to.name === 'index') {
            this.router.replaceWith('components');
        }
    }
}
