import Service from '@ember/service';

/**
 * Stub of the host console's `fetch` service. Never performs network requests.
 *
 * Responses can be primed per-path for assertions: `this.owner.lookup('service:fetch').responses['geocoder/query'] = { ... };`
 * Every call is recorded on `calls` as `{ method, args }`.
 */
export default class FetchService extends Service {
    calls = [];

    /** Map of path -> canned response used by `get` and `post`. */
    responses = {};

    get(path, params = {}, options = {}) {
        this.calls.push({ method: 'get', args: [path, params, options] });
        return Promise.resolve(this.responses[path] ?? []);
    }

    post(path, body = {}, options = {}) {
        this.calls.push({ method: 'post', args: [path, body, options] });
        return Promise.resolve(this.responses[path] ?? {});
    }

    download(path, params = {}, options = {}) {
        this.calls.push({ method: 'download', args: [path, params, options] });
        return Promise.resolve();
    }

    /** Pseudo ember-concurrency task: `this.fetch.uploadFile.perform(file, params, onSuccess, onError)`. */
    uploadFile = {
        isRunning: false,
        isIdle: true,
        perform: (file, params = {}, onSuccess, onError) => {
            this.calls.push({ method: 'uploadFile.perform', args: [file, params, onSuccess, onError] });

            const uploadedFile = {
                id: 'test-file-1',
                filename: file?.name ?? 'test-file.txt',
                content_type: file?.type ?? 'text/plain',
                url: 'https://example.test/uploads/test-file.txt',
                save: () => Promise.resolve(uploadedFile),
                destroyRecord: () => Promise.resolve(uploadedFile),
            };

            if (typeof onSuccess === 'function') {
                onSuccess(uploadedFile);
            }

            return Promise.resolve(uploadedFile);
        },
    };
}
