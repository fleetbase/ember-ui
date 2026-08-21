import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { isArray } from '@ember/array';
import { isBlank } from '@ember/utils';
import { underscore } from '@ember/string';

let ROW_SEQUENCE = 0;

/**
 * Edits translation key/value pairs, one set per language.
 *
 * The editor holds its state as ROWS — `{ id, key, value }` — rather than as the
 * `{ language: { key: value } }` object it reads and reports. Two reasons:
 *
 *   1. A row's identity survives renaming its key. Keying the `{{#each}}` on the translation key
 *      itself meant that typing in the key field destroyed the input and rebuilt it on the next
 *      render, mid-edit.
 *   2. Every edit builds a NEW structure and assigns it once. The previous version mutated
 *      `this.translations` in place and then reassigned the same reference, which wrote to a
 *      tracked property that the render was still consuming — the backtracking-rerender assertion
 *      recorded in DEFECTS.md #26.
 *
 * The public surface is unchanged: `@value` in, `@onChange(translations)` out, both in the
 * `{ language: { key: value } }` shape, plus `@defaultKeys` and `@label`/`@labelClass`.
 */
export default class TranslationsEditorComponent extends Component {
    /** The language whose rows are on screen. */
    @tracked language;

    /** `{ en: [{ id, key, value }, …] }` — replaced wholesale on every edit, never mutated. */
    @tracked rowsByLanguage = {};

    constructor() {
        super(...arguments);

        this.rowsByLanguage = this.#toRows(this.setDefaultKeys(this.args.value, this.args.defaultKeys));

        const [first] = this.languages;
        if (first) {
            this.language = first;
        }
    }

    get languages() {
        return Object.keys(this.rowsByLanguage);
    }

    /** The rows for the visible language. */
    get rows() {
        return this.rowsByLanguage[this.language] ?? [];
    }

    /**
     * Fills in any missing default keys. Returns a NEW object — the previous version wrote the
     * defaults into the caller's own `@value`.
     */
    @action setDefaultKeys(value, defaultKeys = [], forceKeys = false) {
        if (!defaultKeys) {
            return value ?? {};
        }

        const source = isBlank(value) || isArray(value) || typeof value !== 'object' ? {} : value;

        if (forceKeys === true) {
            const seeded = { ...source };
            for (const defaultKey of defaultKeys) {
                if (!seeded[defaultKey]) {
                    seeded[defaultKey] = null;
                }
            }

            return seeded;
        }

        const next = {};
        for (const language of Object.keys(source)) {
            const pairs = { ...(source[language] ?? {}) };
            for (const defaultKey of defaultKeys) {
                if (!pairs[defaultKey]) {
                    pairs[defaultKey] = null;
                }
            }
            next[language] = pairs;
        }

        return next;
    }

    @action setTranslationKey(id, event) {
        const key = underscore(event.target.value);

        this.#commit(this.#withRows(this.rows.map((row) => (row.id === id ? { ...row, key } : row))));
    }

    @action setTranslationValue(id, event) {
        const value = event.target.value?.trim();

        this.#commit(this.#withRows(this.rows.map((row) => (row.id === id ? { ...row, value } : row))));
    }

    @action addTranslation() {
        // One past the highest `translation_N` in use. A count-based index is not a fresh index
        // once anything has been removed — it collides with a key that is still in play.
        const indexes = this.rows
            .map((row) => /^translation_(\d+)$/.exec(row.key ?? ''))
            .filter(Boolean)
            .map((match) => Number(match[1]));
        const next = indexes.length ? Math.max(...indexes) + 1 : 0;

        this.#commit(this.#withRows([...this.rows, this.#row(`translation_${next}`, null)]));
    }

    @action removeTranslation(id) {
        this.#commit(this.#withRows(this.rows.filter((row) => row.id !== id)));
    }

    @action loadLanguage(language) {
        this.language = language;
    }

    @action addLanguage(iso2) {
        const language = iso2.toLowerCase();
        const seeded = this.setDefaultKeys({}, this.args.defaultKeys, true);

        this.language = language;
        this.#commit({
            ...this.rowsByLanguage,
            [language]: Object.entries(seeded).map(([key, value]) => this.#row(key, value)),
        });
    }

    #row(key, value) {
        ROW_SEQUENCE += 1;

        return { id: `translation-row-${ROW_SEQUENCE}`, key, value };
    }

    #toRows(translations) {
        const rowsByLanguage = {};

        for (const [language, pairs] of Object.entries(translations ?? {})) {
            rowsByLanguage[language] = Object.entries(pairs ?? {}).map(([key, value]) => this.#row(key, value));
        }

        return rowsByLanguage;
    }

    /** Back to the `{ language: { key: value } }` shape callers expect. */
    #toTranslations(rowsByLanguage) {
        const translations = {};

        for (const [language, rows] of Object.entries(rowsByLanguage)) {
            translations[language] = {};
            for (const row of rows) {
                translations[language][row.key] = row.value;
            }
        }

        return translations;
    }

    #withRows(rows) {
        return { ...this.rowsByLanguage, [this.language]: rows };
    }

    /** The single write. Replaces the state, then reports the plain object once. */
    #commit(rowsByLanguage) {
        this.rowsByLanguage = rowsByLanguage;

        if (typeof this.args.onChange === 'function') {
            this.args.onChange(this.#toTranslations(rowsByLanguage));
        }
    }
}
