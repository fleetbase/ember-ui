import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';

export default class ChatContainerComponent extends Component {
    @service chat;
    constructor(owner) {
        super(...arguments);
    }
}
