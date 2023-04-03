import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { isBlank } from '@ember/utils';
import { action, computed } from '@ember/object';

export default class FetchSelectComponent extends Component {
    @service fetch;
    @tracked options = [];
    @tracked isLoading = true;

    @computed('args.placeholder', 'isLoading') get palceholder() {
        const { placeholder } = this.args;

        if (placeholder) {
            return placeholder;
        }

        if (this.isLoading) {
            return 'Loading options...';
        }

        return null;
    }

    @action fetchOptions() {
        const { path } = this.args;

        if (isBlank(path)) {
            return;
        }

        this.fetch
            .get(path)
            .then((options) => {
                this.options = options;
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
