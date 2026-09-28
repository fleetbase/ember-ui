import fetchFileAsDataUrl, { blobToDataUrl } from 'dummy/utils/fetch-file-as-data-url';
import { module, test } from 'qunit';

module('Unit | Utility | fetch-file-as-data-url', function (hooks) {
    let originalFetch;
    let requests;
    const fetchService = { host: 'https://api.test', namespace: 'int/v1', credentials: 'include', getHeaders: () => ({ Authorization: 'Bearer token' }) };

    hooks.beforeEach(function () {
        originalFetch = window.fetch;
        requests = [];
    });

    hooks.afterEach(function () {
        window.fetch = originalFetch;
    });

    test('it downloads the file through the API with the console credentials and returns a data url', async function (assert) {
        window.fetch = (url, options) => {
            requests.push({ url, options });
            return Promise.resolve(new Response(new Blob(['png-bytes'], { type: 'image/png' }), { status: 200 }));
        };

        const dataUrl = await fetchFileAsDataUrl(fetchService, 'file_9');

        assert.strictEqual(requests[0].url, 'https://api.test/int/v1/files/download?file=file_9');
        assert.strictEqual(requests[0].options.credentials, 'include');
        assert.strictEqual(requests[0].options.mode, 'cors');
        assert.deepEqual(requests[0].options.headers, { Authorization: 'Bearer token' });
        assert.strictEqual(dataUrl, `data:image/png;base64,${btoa('png-bytes')}`);
    });

    test('a service without a namespace or credentials still builds a request', async function (assert) {
        window.fetch = (url, options) => {
            requests.push({ url, options });
            return Promise.resolve(new Response(new Blob(['x']), { status: 200 }));
        };

        await fetchFileAsDataUrl({ host: 'https://api.test', getHeaders: () => ({}) }, 'file_1');

        assert.strictEqual(requests[0].url, 'https://api.test/files/download?file=file_1');
        assert.strictEqual(requests[0].options.credentials, 'include', 'credentials default to include');
    });

    test('a failed download rejects with the status', async function (assert) {
        window.fetch = () => Promise.resolve(new Response('nope', { status: 404 }));

        await assert.rejects(fetchFileAsDataUrl(fetchService, 'file_9'), /file_9 \(404\)/);
    });

    test('blobToDataUrl encodes a blob', async function (assert) {
        assert.strictEqual(await blobToDataUrl(new Blob(['hi'], { type: 'text/plain' })), 'data:text/plain;base64,aGk=');
    });
});
