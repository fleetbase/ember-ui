import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

export default class ModalsChangelogComponent extends Component {
    // loadRepositoryReleases() runs from the constructor and assigns all three before the
    // template that reads them is rendered.
    /* istanbul ignore next */
    @tracked releases = [];
    /* istanbul ignore next */
    @tracked isLoading = false;
    /* istanbul ignore next */
    @tracked loadError = null;

    constructor() {
        super(...arguments);
        this.loadRepositoryReleases();
    }

    @action loadRepositoryReleases() {
        this.isLoading = true;
        this.loadError = null;

        return fetch('https://api.github.com/repos/fleetbase/fleetbase/releases')
            .then((response) => response.json())
            .then((releases) => {
                this.releases = (releases ?? []).map((release) => {
                    // GitHub permits an empty release description, in which case `body` is
                    // null. And `String.replace` with a string pattern strips the FIRST match
                    // anywhere in the line, not a leading bullet — "Fixed drag-and-drop" used
                    // to render as "Fixed dragand-drop".
                    release.changes = (release.body ?? '').split('\n').map((line) => line.replace(/^\s*[-*]\s*/, '').trim());
                    return release;
                });
            })
            .catch((error) => {
                // Unauthenticated GitHub allows 60 requests/hour per IP and this modal fires
                // one on every open, so a rate-limit response is routine. Without this the
                // rejection is unhandled and the modal is left blank with no explanation.
                this.releases = [];
                this.loadError = error?.message ?? 'Unable to load the changelog.';
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
