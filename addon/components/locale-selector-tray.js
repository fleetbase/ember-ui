import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { inject as service } from '@ember/service';
import { action } from '@ember/object';
import { task } from 'ember-concurrency';
import calculatePosition from 'ember-basic-dropdown/utils/calculate-position';

export default class LocaleSelectorTrayComponent extends Component {
    @service intl;
    @service fetch;
    @service media;
    @service language;
    @tracked locales = [];
    @tracked currentLocale;

    /**
     * Creates an instance of LocaleSelectorComponent.
     * @memberof LocaleSelectorComponent
     */
    constructor() {
        super(...arguments);

        this.locales = this.intl.locales;
        this.currentLocale = this.intl.primaryLocale;

        // Check for locale change
        this.intl.onLocaleChanged(() => {
            this.currentLocale = this.intl.primaryLocale;
        });
    }

    /**
     * Calculate dropdown content position.
     *
     * @param {HTMLElement} trigger
     * @param {HTMLElement} content
     * @return {Object}
     * @memberof LocaleSelectorTrayComponent
     */
    @action calculatePosition(trigger, content) {
        if (this.media.isMobile) {
            content.classList.add('is-mobile');
            const triggerRect = trigger.getBoundingClientRect();
            const top = triggerRect.height + triggerRect.top;

            return { style: { left: '0px', right: '0px', top, padding: '0 0.5rem', width: '100%' } };
        }

        return calculatePosition(...arguments);
    }

    /**
     * Handles the change of locale.
     * @param {string} selectedLocale - The selected locale.
     * @returns {void}
     * @memberof LocaleSelectorComponent
     * @method changeLocale
     * @instance
     * @action
     */
    @action changeLocale(selectedLocale) {
        this.currentLocale = selectedLocale;
        this.intl.setLocale(selectedLocale);
        // Persist to server
        this.saveUserLocale.perform(selectedLocale);
    }

    /**
     * Saves the user's selected locale to the server.
     * @param {string} locale - The user's selected locale.
     * @returns {void}
     * @memberof LocaleSelectorComponent
     * @method saveUserLocale
     * @instance
     * @task
     * @generator
     */
    @task *saveUserLocale(locale) {
        yield this.fetch.post('users/locale', { locale });
    }
}
