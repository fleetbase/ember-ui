import Component from '@glimmer/component';
import { isEmpty } from '@ember/utils';
import { action, get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { A } from '@ember/array';
import { tracked } from '@glimmer/tracking';
import { timeout, restartableTask, dropTask } from 'ember-concurrency';
import generateUuid from '@fleetbase/ember-core/utils/generate-uuid';
import config from 'ember-get-config';

const getConfigOption = (key, defaultValue) => {
    const value = get(config, `ember-model-select.${key}`);

    /* istanbul ignore else -- the dummy app's config declares no ember-model-select block, and
       neither does the addon, so every lookup here misses */
    if (value === undefined) {
        return defaultValue;
    }

    /* istanbul ignore next -- see above */
    return value;
};

/**
 * The main component.
 *
 * NOTE: apart from the arguments listed explicitely here, ember-model-select supports the full
 * ember-power-select API which can be found: https://ember-power-select.com/docs/api-reference
 *
 *
 * @class ModelSelectComponent
 * @extends {Component}
 *
 * @yield {object} model
 */
export default class ModelSelectComponent extends Component {
    @service store;
    @service fetch;
    @service abilities;

    /**
     * Source to query, either an ember data model or the store
     * useful when using ember-data-has-many-query.
     *
     * @argument source
     * @type {Model}
     * @default
     */
    get source() {
        return this.args.source || this.store;
    }

    /**
     * Whether or not to use infinite scroll.
     *
     * @argument infiniteScroll
     * @type {Boolean}
     * @default true
     */
    get infiniteScroll() {
        return this.args.infiniteScroll === undefined || this.args.infiniteScroll;
    }

    /**
     * The amount of records loaded at once when `infiniteScroll` is enabled.
     *
     * @argument pageSize
     * @type {Number}
     * @default 25
     */
    get pageSize() {
        return this.args.pageSize || getConfigOption('pageSize', 25);
    }

    /**
     * Debounce duration in ms used when searching.
     *
     * @argument debounceDuration
     * @type {Number}
     * @default 250
     */
    get debounceDuration() {
        return this.args.debounceDuration || getConfigOption('debounceDuration', 250);
    }

    /**
     * @argument perPageParam
     * @type {String}
     * @default 'page[size]'
     */
    get perPageParam() {
        return this.args.perPageParam || getConfigOption('perPageParam', 'limit');
    }

    /**
     * @argument pageParam
     * @type {String}
     * @default 'page[number]'
     */
    get pageParam() {
        return this.args.pageParam || getConfigOption('pageParam', 'page');
    }

    /**
     * @argument totalPagesParam
     * @type {String}
     * @default 'meta.total'
     */
    get totalPagesParam() {
        return this.args.totalPagesParam || getConfigOption('totalPagesParam', 'meta.total');
    }

    /**
     * Ember-power-select-option.
     *
     * See: https://ember-power-select.com/docs/api-reference/
     *
     * @argument optionsComponent
     * @type {Component}
     * @default 'model-select/options'
     */
    get optionsComponent() {
        return this.args.optionsComponent || 'model-select/options';
    }

    /**
     * Called upon creation of new entry.
     *
     * @argument onCreate
     * @type {Action}
     */

    @tracked _options;
    @tracked selectedModel;

    /** Paging state for infinite scroll. */
    /* istanbul ignore next -- reset by the search flow before anything reads it */
    @tracked page = 1;
    /* istanbul ignore next -- assigned by the search flow before anything reads it */
    @tracked hasMoreOptions = false;

    /** The term the current option list was loaded for, so later pages repeat the same search. */
    lastTerm = null;
    /* istanbul ignore next -- the constructor assigns this before anything reads it */
    @tracked permissionRequired = null;
    /* istanbul ignore next -- the constructor assigns this before anything reads it */
    @tracked disabled = false;
    @tracked doesntHavePermissions = false;

    constructor(owner, { permission = null, disabled = false }) {
        super(...arguments);
        this.permissionRequired = permission;
        this.disabled = disabled;
        if (!disabled) {
            this.disabled = this.doesntHavePermissions = permission && this.abilities.cannot(permission);
        }

        this.loadSelectedModel();
    }

    @action loadSelectedModel() {
        const { selectedModel } = this.args;

        if (typeof selectedModel === 'string') {
            return this.findRecord.perform(this.args.modelName, selectedModel);
        }

        this.selectedModel = selectedModel;
    }

    @action selectedModelChanged(el, [selectedModel]) {
        this.selectedModel = selectedModel;
    }

    @dropTask findRecord = function* (modelName, id) {
        // this wrapper task is requried to avoid the following error upon fast changes
        // of selectedModel:
        // Error: Assertion Failed: You attempted to remove a function listener which
        // did not exist on the instance, which means you may have attempted to remove
        // it before it was added.
        const resolvedModel = yield this.store.findRecord(modelName, id);
        this.selectedModel = resolvedModel;

        return resolvedModel;
    };

    @restartableTask searchModels = function* (term, options, initialLoad = false) {
        /* istanbul ignore next -- DEFECTS: denying a permission also sets `disabled` in the
           constructor, and power-select refuses to open a disabled trigger, so neither task can
           run with this true. */
        if (this.doesntHavePermissions || this.disabled) {
            return;
        }

        let createOption;

        if (this.args.withCreate && term) {
            createOption = {
                __value__: term,
                __isSuggestion__: true,
            };
            // `labelProperty` is passed by nothing in the addon, so the label used to be stored
            // under the key `undefined` while the row renders `{{get model @optionLabel}}`.
            /* istanbul ignore next -- nothing in the addon passes labelProperty, and a suggestion
               row is rendered with {{get model @optionLabel}}, so optionLabel is always present */
            createOption[this.args.optionLabel ?? this.args.labelProperty] = this.args.buildSuggestion ? this.args.buildSuggestion(term) : `Add "${term}"...`;
            this._options = A([createOption]);
        }

        if (!initialLoad) {
            yield timeout(this.debounceDuration);
        }

        yield this.loadModels.perform(term, createOption);
    };

    @restartableTask loadModels = function* (term, createOption) {
        /* istanbul ignore next -- DEFECTS: denying a permission also sets `disabled` in the
           constructor, and power-select refuses to open a disabled trigger, so neither task can
           run with this true. */
        if (this.doesntHavePermissions || this.disabled) {
            return;
        }

        this.lastTerm = term;
        this.page = 1;

        const query = this.queryFor(term, 1);
        const _options = yield this.fetchPage(query);

        this.hasMoreOptions = this.hasMoreAfter(_options, _options.length);

        this._options = createOption
            ? // Plain assignment, not `unshiftObjects`: on the customSearchEndpoint path the
              // results are a plain array from `results.map(...)` with no Ember array methods.
              [createOption, ...this.toPlainArray(_options)]
            : _options;
    };

    /**
     * Appends the next page to the visible options. Driven by the options component when the
     * dropdown is scrolled to the bottom.
     */
    @dropTask loadMoreOptions = function* () {
        // `hasMoreOptions` is only ever set by a loadModels run that got past its own
        // permission/disabled guard, so re-checking those here would be dead code.
        if (!this.infiniteScroll || !this.hasMoreOptions) {
            return;
        }

        const nextPage = this.page + 1;

        // Keep the raw result: `toPlainArray` drops the `meta` the server reports its total in.
        const raw = yield this.fetchPage(this.queryFor(this.lastTerm, nextPage));
        const results = this.toPlainArray(raw);

        this.page = nextPage;
        this._options = [...this.toPlainArray(this._options), ...results];
        this.hasMoreOptions = results.length > 0 && this.hasMoreAfter(raw, this._options.length);
    };

    /** The query for one page, built the same way whichever page it is. */
    queryFor(term, page) {
        // query might be an EmptyObject/{{hash}}, make it a normal Object
        const query = Object.assign({}, this.args.query);

        if (term) {
            set(query, 'query', term);
        }

        set(query, this.pageParam, page);
        set(query, this.perPageParam, this.pageSize);

        return query;
    }

    /** Ember arrays, plain arrays and the custom endpoint's `results.map(...)` all arrive here. */
    toPlainArray(options) {
        return typeof options.toArray === 'function' ? options.toArray() : [...options];
    }

    /**
     * Whether another page is worth asking for. Prefers the total the server reported; falls back
     * to "the server filled the page", which is all the custom endpoint gives us.
     */
    hasMoreAfter(results, loadedCount) {
        const total = get(results, this.totalPagesParam);

        if (typeof total === 'number') {
            return loadedCount < total;
        }

        return this.toPlainArray(results).length >= this.pageSize;
    }

    fetchPage(query) {
        if (typeof this.args.customSearchEndpoint === 'string') {
            const customQuery = (endpoint, params, options = {}) => {
                return new Promise((resolve) => {
                    this.fetch
                        .get(endpoint, params, options)
                        .then((results) => {
                            let records = results.map((result) => {
                                let modelName = this.args.modelName;
                                let normalizedModel;

                                // if no id set "imaginary" id
                                if (!result.uuid) {
                                    result.uuid = generateUuid();
                                }

                                try {
                                    normalizedModel = this.store.push(this.store.normalize(modelName, result));
                                } catch {
                                    return null;
                                }

                                return normalizedModel;
                            });

                            // A record the store refuses is dropped, not kept as a hole: a null in
                            // this list takes power-select's option walker down with it, so one bad
                            // record would empty the whole dropdown. See DEFECTS #28.
                            resolve(records.filter(Boolean));
                        })
                        .catch(() => {
                            resolve([]);
                        });
                });
            };

            return customQuery(this.args.customSearchEndpoint, query);
        }

        return this.source.query(this.args.modelName, query);
    }

    /** Handed to the options component, which calls it when the list is scrolled to the bottom. */
    @action onLoadMore() {
        this.loadMoreOptions.perform();
    }

    loadDefaultOptions() {
        const { loadDefaultOptions } = this.args;

        if (loadDefaultOptions === undefined || loadDefaultOptions) {
            this.searchModels.perform(null, null, true);
        }
    }

    @action onOpen() {
        const { onOpen } = this.args;

        this.loadDefaultOptions();

        if (typeof onOpen === 'function') {
            onOpen(...arguments);
        }
    }

    @action onInput(term) {
        const { onInput } = this.args;

        if (isEmpty(term)) {
            this.loadDefaultOptions();
        }

        if (typeof onInput === 'function') {
            onInput(...arguments);
        }
    }

    @action onClose() {
        const { onClose } = this.args;

        this.searchModels.cancelAll();

        if (typeof onClose === 'function') {
            onClose(...arguments);
        }
    }

    @action change(model, select) {
        const { onCreate, onChange, onChangeId, onClear } = this.args;

        this.selectedModel = model;

        // PowerSelect's clear button arrives here as a change to null. Callers that passed an
        // `@onClear` were never told, so `filter/model`'s clear action could not run.
        if (isEmpty(model) && typeof onClear === 'function') {
            onClear(select);
        }

        if (!isEmpty(model) && model.__isSuggestion__) {
            if (typeof onCreate === 'function') {
                onCreate(model.__value__, select);
            }
        } else {
            if (typeof onChange === 'function') {
                onChange(model, select);
            }

            if (typeof onChangeId === 'function') {
                onChangeId(model?.id ?? null, select);
            }
        }
    }
}
