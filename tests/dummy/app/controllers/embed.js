import Controller from '@ember/controller';
import { inject as service } from '@ember/service';

export default class EmbedController extends Controller {
    @service('playground-theme') playgroundTheme;

    queryParams = ['state'];

    state = null;
}
