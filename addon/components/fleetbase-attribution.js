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
