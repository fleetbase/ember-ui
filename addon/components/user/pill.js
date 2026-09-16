/* eslint-disable ember/no-get -- records and identity stubs are read by path, so `get` is the point */
import Component from '@glimmer/component';
import { get } from '@ember/object';

/**
 * The user family pill. Keeps the historic `@user` argument and "No user" /
 * email defaults, and is otherwise a `Resource::Pill` for the `user`
 * descriptor: it opens the user when an engine has registered an opener and
 * shows the user's summary on hover.
 */
export default class UserPillComponent extends Component {
    get resource() {
        return this.args.user ?? this.args.resource;
    }

    get subtitle() {
        if (this.args.subtitle !== undefined) {
            return this.args.subtitle;
        }

        const email = get(this.resource ?? {}, 'email');

        return email ?? (this.resource ? 'No email' : '-');
    }

    get showOnlineIndicator() {
        if (this.args.showOnlineIndicator !== undefined) {
            return Boolean(this.args.showOnlineIndicator);
        }

        // With an explicit path the dot is wanted; otherwise the descriptor decides.
        return typeof this.args.onlinePath === 'string' ? true : undefined;
    }

    get online() {
        if (typeof this.args.onlinePath === 'string' && this.resource) {
            return Boolean(get(this.resource, this.args.onlinePath));
        }

        return undefined;
    }
}
