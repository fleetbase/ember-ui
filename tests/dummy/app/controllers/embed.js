import Controller from '@ember/controller';

export default class EmbedController extends Controller {
    queryParams = ['state'];

    state = null;
}
