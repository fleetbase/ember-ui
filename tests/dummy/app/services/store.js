import Service from '@ember/service';

/**
 * Minimal in-memory stub of the ember-data store. Records are plain objects with
 * `save()` and `destroyRecord()` resolving to themselves. Prime `queryResults` (path: modelName)
 * to control what `query`/`findAll` return. All calls recorded on `calls`.
 */
export default class StoreService extends Service {
    calls = [];
    records = new Map();
    nextId = 1;

    /** Map of modelName -> array returned by `query`, `queryRecord` (first item) and `findAll`. */
    queryResults = {};

    _key(modelName, id) {
        return `${modelName}:${id}`;
    }

    _makeRecord(modelName, data = {}) {
        const id = data.id ?? `test-${modelName}-${this.nextId++}`;
        const record = {
            id,
            ...data,
            save: () => Promise.resolve(record),
            destroyRecord: () => {
                this.records.delete(this._key(modelName, id));
                return Promise.resolve(record);
            },
            deleteRecord: () => {
                this.records.delete(this._key(modelName, id));
            },
            unloadRecord: () => {
                this.records.delete(this._key(modelName, id));
            },
        };

        return record;
    }

    createRecord(modelName, data = {}) {
        this.calls.push({ method: 'createRecord', args: [modelName, data] });

        if (data.id !== undefined && this.records.has(this._key(modelName, data.id))) {
            // Mirror Ember Data's identity-map assertion.
            throw new Error(`The id ${data.id} has already been used with another '${modelName}' record.`);
        }

        const record = this._makeRecord(modelName, data);
        this.records.set(this._key(modelName, record.id), record);
        return record;
    }

    peekRecord(modelName, id) {
        this.calls.push({ method: 'peekRecord', args: [modelName, id] });
        return this.records.get(this._key(modelName, id)) ?? null;
    }

    peekAll(modelName) {
        this.calls.push({ method: 'peekAll', args: [modelName] });
        const prefix = `${modelName}:`;
        return [...this.records.entries()].filter(([key]) => key.startsWith(prefix)).map(([, record]) => record);
    }

    findRecord(modelName, id, options = {}) {
        this.calls.push({ method: 'findRecord', args: [modelName, id, options] });
        const existing = this.records.get(this._key(modelName, id));
        if (existing) {
            return Promise.resolve(existing);
        }

        const record = this._makeRecord(modelName, { id });
        this.records.set(this._key(modelName, id), record);
        return Promise.resolve(record);
    }

    findAll(modelName, options = {}) {
        this.calls.push({ method: 'findAll', args: [modelName, options] });
        return Promise.resolve(this.queryResults[modelName] ?? []);
    }

    query(modelName, params = {}, options = {}) {
        this.calls.push({ method: 'query', args: [modelName, params, options] });
        return Promise.resolve(this.queryResults[modelName] ?? []);
    }

    queryRecord(modelName, params = {}, options = {}) {
        this.calls.push({ method: 'queryRecord', args: [modelName, params, options] });
        const results = this.queryResults[modelName] ?? [];
        return Promise.resolve(results[0] ?? null);
    }

    normalize(modelName, payload = {}) {
        this.calls.push({ method: 'normalize', args: [modelName, payload] });
        return { modelName, data: payload };
    }

    push(normalized = {}) {
        this.calls.push({ method: 'push', args: [normalized] });
        const { modelName = 'record', data = {} } = normalized;
        const key = data.id !== undefined ? this._key(modelName, data.id) : null;
        if (key && this.records.has(key)) {
            return this.records.get(key);
        }

        const record = this._makeRecord(modelName, data);
        this.records.set(this._key(modelName, record.id), record);
        return record;
    }

    unloadAll(modelName) {
        this.calls.push({ method: 'unloadAll', args: [modelName] });
        if (!modelName) {
            this.records.clear();
            return;
        }

        const prefix = `${modelName}:`;
        for (const key of [...this.records.keys()]) {
            if (key.startsWith(prefix)) {
                this.records.delete(key);
            }
        }
    }
}
