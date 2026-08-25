import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

export default class ApplicationController extends Controller {
    @service router;

    /**
     * The embed route is meant to sit inside someone else's page: no catalog navigation, no
     * application header. Everything else gets the playground shell.
     */
    get isEmbedded() {
        return (this.router.currentRouteName ?? '').startsWith('embed');
    }
}
