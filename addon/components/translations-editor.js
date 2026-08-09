import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action, computed } from '@ember/object';
import { isArray } from '@ember/array';
import { isBlank } from '@ember/utils';
import { underscore } from '@ember/string';

export default class TranslationsEditorComponent extends Component {
    @tracked languages = [];
    @tracked language;
    @tracked translations = {};

    @computed('translations', 'language') get loadedTranslations() {
        return this.translations[this.language] ?? {};
    }

    constructor() {
        super(...arguments);

        // Derive the tabs from the SANITISED value: reading the raw argument gave an array
        // `@value` one language tab per numeric index ('0', '1', '2'), even though
        // `setDefaultKeys` correctly discards the array.
        this.translations = this.setDefaultKeys(this.args.value, this.args.defaultKeys);
        this.languages = Object.keys(this.translations ?? {});

        // load first languages
        if (this.languages.length) {
            this.loadLanguage(this.languages[0]);
        }
    }

    @action setDefaultKeys(value, defaultKeys = [], forceKeys = false) {
        if (!defaultKeys) {
            return value ?? {};
        }

        if (isBlank(value) || isArray(value) || typeof value !== 'object') {
            value = {};
        }

        if (forceKeys === true) {
            for (let i = 0; i < defaultKeys.length; i++) {
                const defaultKey = defaultKeys[i];

                if (!value[defaultKey]) {
                    value[defaultKey] = null;
                }
            }

            return value;
        }

        for (let lang in value) {
            for (let i = 0; i < defaultKeys.length; i++) {
                const defaultKey = defaultKeys[i];

                if (!value[lang][defaultKey]) {
                    value[lang][defaultKey] = null;
                }
            }
        }

        return value;
    }

    @action updateTranslations(translations) {
        this.translations = translations;

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(translations);
        }
    }

    @action setTranslationValue(key, event) {
        const { translations } = this;
        const { target } = event;
        const value = target.value?.trim();

        translations[this.language][key] = value;
        this.updateTranslations(translations);
    }

    @action setTranslationKey(key, event) {
        const { translations } = this;
        const { target } = event;
        const newKey = underscore(target.value);

        const currentValue = translations[this.language][key];
        delete translations[this.language][key];

        translations[this.language][newKey] = currentValue;
        this.updateTranslations(translations);
    }

    @action addTranslation() {
        const { translations } = this;

        // A count-based index is not a fresh index once anything has been removed — it collides
        // with a surviving key and silently overwrites it. Take one past the highest in use.
        const indexes = Object.keys(translations[this.language] ?? {})
            .map((key) => /^translation_(\d+)$/.exec(key))
            .filter(Boolean)
            .map((match) => Number(match[1]));
        const next = indexes.length ? Math.max(...indexes) + 1 : 0;

        translations[this.language][`translation_${next}`] = null;
        this.updateTranslations(translations);
    }

    @action removeTranslation(key) {
        const { translations } = this;

        delete translations[this.language][key];
        this.updateTranslations(translations);
    }

    @action loadLanguage(language) {
        this.language = language;
    }

    @action addLanguage(iso2) {
        const { translations } = this;
        const { defaultKeys } = this.args;
        const lang = iso2.toLowerCase();

        this.languages = [...this.languages, lang];
        this.language = lang;
        translations[lang] = this.setDefaultKeys({}, defaultKeys, true);
        this.updateTranslations(translations);
    }
}
