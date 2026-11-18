import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import config from 'ember-get-config';

export default class FleetbaseAttributionComponent extends Component {
    @service modalsManager;

    licensingUrl = 'https://www.fleetbase.io';

    get disabled() {
        return config.APP?.disableFleetbaseAttribution === true;
    }

    /**
     * An operator's own name for the credit line (`@poweredByName`), or null for the default.
     * The Legal notice is rendered either way.
     */
    get customName() {
        const name = typeof this.args.poweredByName === 'string' ? this.args.poweredByName.trim() : '';

        return name === '' ? null : name;
    }

    /**
     * `@poweredByUrl`, only when it is an absolute http(s) URL; anything else is ignored.
     */
    get customUrl() {
        const value = typeof this.args.poweredByUrl === 'string' ? this.args.poweredByUrl.trim() : '';

        try {
            const url = new URL(value);

            return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
        } catch {
            return null;
        }
    }

    get appVersion() {
        return config.version ? `v${config.version}` : null;
    }

    @action openLegalNotice() {
        this.modalsManager.show('modals/fleetbase-legal-notice', {
            title: 'Fleetbase Legal Notices',
            acceptButtonText: 'Done',
            acceptButtonIcon: 'check',
            hideDeclineButton: true,
            modalClass: 'modal-md fleetbase-legal-notice-modal',
        });
    }
}
