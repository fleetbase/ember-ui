import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, settled, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function releases() {
    return [
        {
            name: 'v0.3.41',
            created_at: '2026-03-12',
            body: '- Fixed the pager\n* Added a column picker\n\n   - Tidied up imports   ',
        },
        {
            name: 'v0.3.40',
            created_at: '2026-02-28',
            body: '- Initial release',
        },
    ];
}

function releaseHeadings() {
    return findAll('h2').map((heading) => heading.textContent.trim());
}

function changeLines() {
    return findAll('li').map((item) => item.textContent.trim());
}

module('Integration | Component | modals/changelog', function (hooks) {
    setupRenderingTest(hooks);

    let requestedUrls;
    let respondWith;
    let originalFetch;

    hooks.beforeEach(function () {
        requestedUrls = [];
        respondWith = () => Promise.resolve(releases());

        // The component calls the GLOBAL fetch directly, so stub that rather than a service.
        originalFetch = window.fetch;
        window.fetch = (url) => {
            requestedUrls.push(url);
            return Promise.resolve({ json: () => respondWith() });
        };

        this.set('options', {});
    });

    hooks.afterEach(function () {
        window.fetch = originalFetch;
    });

    const TEMPLATE = hbs`<Modals::Changelog @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    test('it asks github for the fleetbase releases', async function (assert) {
        await render(TEMPLATE);

        assert.deepEqual(requestedUrls, ['https://api.github.com/repos/fleetbase/fleetbase/releases']);
    });

    test('it shows a spinner while the releases are loading', async function (assert) {
        let resolve;
        respondWith = () => new Promise((r) => (resolve = r));

        render(TEMPLATE);
        await settled();

        assert.ok(find('.fleetbase-loader'), 'a spinner is shown');
        assert.deepEqual(releaseHeadings(), [], 'nothing is listed yet');

        resolve(releases());
        await settled();

        assert.strictEqual(find('.fleetbase-loader'), null, 'the spinner is dismissed');
    });

    test('it lists every release with its name and date', async function (assert) {
        await render(TEMPLATE);

        assert.deepEqual(releaseHeadings(), ['v0.3.41', 'v0.3.40']);
        assert.dom('.modal-body-container, .px-5').containsText('2026-03-12');
        assert.dom('.px-5').containsText('2026-02-28');
    });

    test('each release body is split into bullet points', async function (assert) {
        await render(TEMPLATE);

        assert.deepEqual(changeLines(), ['Fixed the pager', 'Added a column picker', 'Tidied up imports', 'Initial release']);
    });

    test('leading dashes and asterisks are stripped and lines are trimmed', async function (assert) {
        respondWith = () => Promise.resolve([{ name: 'v1', created_at: 'today', body: '   *   Starred change   ' }]);

        await render(TEMPLATE);

        assert.deepEqual(changeLines(), ['Starred change']);
    });

    test('blank lines are skipped', async function (assert) {
        respondWith = () => Promise.resolve([{ name: 'v1', created_at: 'today', body: '- One\n\n\n- Two' }]);

        await render(TEMPLATE);

        assert.deepEqual(changeLines(), ['One', 'Two']);
    });

    test('a bulleted line keeps hyphens inside its words', async function (assert) {
        respondWith = () => Promise.resolve([{ name: 'v1', created_at: 'today', body: '- Fixed drag-and-drop' }]);

        await render(TEMPLATE);

        assert.deepEqual(changeLines(), ['Fixed drag-and-drop'], 'the leading bullet is the first dash, so the rest survives');
    });

    test('an unbulleted line is left intact', async function (assert) {
        respondWith = () => Promise.resolve([{ name: 'v1', created_at: 'today', body: 'Fixed drag-and-drop' }]);

        await render(TEMPLATE);

        assert.deepEqual(changeLines(), ['Fixed drag-and-drop'], 'only a LEADING bullet is stripped');
    });

    test('an asterisk bullet is stripped without touching later asterisks', async function (assert) {
        respondWith = () => Promise.resolve([{ name: 'v1', created_at: 'today', body: '  * Renamed a*b to c' }]);

        await render(TEMPLATE);

        assert.deepEqual(changeLines(), ['Renamed a*b to c']);
    });

    test('an empty release list renders nothing', async function (assert) {
        respondWith = () => Promise.resolve([]);

        await render(TEMPLATE);

        assert.deepEqual(releaseHeadings(), []);
        assert.strictEqual(find('.fleetbase-loader'), null, 'and no spinner is left running');
    });

    test('a release with no description renders no change lines', async function (assert) {
        respondWith = () => Promise.resolve([{ name: 'v1', created_at: 'today', body: null }]);

        await render(TEMPLATE);

        assert.deepEqual(releaseHeadings(), ['v1'], 'the release is still listed');
        assert.deepEqual(changeLines(), [], 'and it contributes no notes');
    });

    test('a failed request reports the problem instead of hanging', async function (assert) {
        respondWith = () => Promise.reject(new Error('API rate limit exceeded'));

        await render(TEMPLATE);

        assert.dom(this.element).containsText('API rate limit exceeded');
        assert.deepEqual(releaseHeadings(), [], 'nothing is listed');
        assert.strictEqual(find('.fleetbase-loader'), null, 'and no spinner is left running');
    });

    test('a request that never reaches github is reported too', async function (assert) {
        window.fetch = () => Promise.reject(new Error('Failed to fetch'));

        await render(TEMPLATE);

        assert.dom(this.element).containsText('Failed to fetch');
    });

    test('a failure with no message of its own still says something', async function (assert) {
        respondWith = () => Promise.reject({});

        await render(TEMPLATE);

        assert.dom(this.element).containsText('Unable to load the changelog.');
    });

    test('a response body of null is treated as no releases', async function (assert) {
        respondWith = () => Promise.resolve(null);

        await render(TEMPLATE);

        assert.deepEqual(releaseHeadings(), [], 'nothing is listed');
        assert.strictEqual(find('.fleetbase-loader'), null, 'and no spinner is left running');
    });
});
