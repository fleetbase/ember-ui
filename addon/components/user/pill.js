import Component from '@glimmer/component';

export default class UserPillComponent extends Component {
    get resource() {
        return this.args.user ?? this.args.resource;
    }
}
