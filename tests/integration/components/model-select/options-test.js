import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find, settled, waitFor } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { A } from '@ember/array';

const DRIVERS = [
    { id: 'drv_1', name: 'Alex Driver' },
    { id: 'drv_2', name: 'Blair Hauler' },
];

const TRIGGER = '.ember-power-select-trigger';

// <ModelSelect::Options> is only ever reached as PowerSelect's @optionsComponent, so it is
// exercised through a real <ModelSelect> rather than by hand-stubbing PowerSelect's @select.
module('Integration | Component | model-select/options', function (hooks) {
    setupRenderingTest(hooks);

    let respondWith;

    hooks.beforeEach(function () {
        respondWith = () => A(DRIVERS.slice());

        this.owner.unregister('service:store');
        this.owner.register(
            'service:store',
            class extends Service {
                query(modelName, query) {
                    return Promise.resolve(respondWith(modelName, query));
                }
                findRecord() {
                    return Promise.resolve(null);
                }
            }
        );
    });

    test('it renders the option list as a listbox', async function (assert) {
        await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" />`);
        await click(TRIGGER);

        const listbox = find('ul[role="listbox"]');
        assert.ok(listbox, 'the options are wrapped in a listbox');
        // PowerSelect's splattributes land on this component's own <ul>, so it IS the
        // power-select options list rather than containing one.
        assert.dom(listbox).hasClass('ember-power-select-options');
        assert.true(listbox.id.startsWith('ember-power-select-options-'), `${listbox.id} is power-select's generated id`);
        assert.strictEqual(findAll('.ember-power-select-option').length, 2, 'the options render inside it');
    });

    test('it yields each option through to the caller block', async function (assert) {
        await render(hbs`
            <ModelSelect @modelName="driver" @optionLabel="name" as |driver|>
                <span class="driver-name">{{driver.name}}</span>
            </ModelSelect>
        `);
        await click(TRIGGER);

        assert.deepEqual(
            findAll('ul[role="listbox"] .driver-name').map((node) => node.textContent.trim()),
            ['Alex Driver', 'Blair Hauler']
        );
    });

    // #105 used to live here: this component rendered ember-infinity's <InfinityLoader> against an
    // @infiniteModel that was never assigned (and ember-infinity was not a dependency), so the loader
    // was unreachable and paging was inert. Paging is native now, so these assert the real thing.
    test('nothing is loading when the list first opens', async function (assert) {
        await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" />`);
        await click(TRIGGER);

        const items = findAll('ul[role="listbox"] > li');
        assert.strictEqual(items.length, 1, 'only the options list item is rendered');
        assert.dom('.ember-model-select__loading-more').doesNotExist('no spinner while the list sits idle');
    });

    test('no loading row is rendered when infinite scroll is off', async function (assert) {
        await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" @infiniteScroll={{false}} />`);
        await click(TRIGGER);

        const items = findAll('ul[role="listbox"] > li');
        assert.strictEqual(items.length, 1, 'only the options list item is rendered');
        assert.dom('.ember-model-select__loading-more').doesNotExist();
    });

    test('an empty result still renders the listbox', async function (assert) {
        respondWith = () => A([]);

        await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" />`);
        await click(TRIGGER);

        assert.ok(find('ul[role="listbox"]'), 'the listbox is rendered');
        assert.dom('ul[role="listbox"]').doesNotContainText('Alex Driver', 'no records are listed');
        assert.dom('ul[role="listbox"]').doesNotContainText('Blair Hauler');
    });

    test('choosing an option closes the list and reports the record', async function (assert) {
        const changes = [];
        this.set('onChange', (model) => changes.push(model));

        await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" @onChange={{this.onChange}} />`);
        await click(TRIGGER);
        await click(findAll('.ember-power-select-option')[1]);

        assert.strictEqual(changes.length, 1);
        assert.strictEqual(changes[0].id, 'drv_2');
        assert.notOk(find('ul[role="listbox"]'), 'the list closed itself');
    });
    // The list is scrolled by ember-basic-dropdown's content element, which is what the component
    // attaches its listener to. These drive that element directly.
    module('scrolling the dropdown', function (hooks) {
        let pages;

        // A short page tells <ModelSelect> there is nothing more to fetch, which would make every
        // assertion below unfailable. These serve a full page so paging stays live.
        const FULL_PAGE = Array.from({ length: 25 }, (unused, index) => ({ id: `drv_${index}`, name: `Driver ${index}` }));

        hooks.beforeEach(function () {
            pages = [];
            respondWith = (modelName, query) => {
                pages.push(query.page);
                return A(FULL_PAGE.slice());
            };
        });

        function scrollContent({ top, clientHeight, scrollHeight }) {
            const content = find('.ember-basic-dropdown-content');
            Object.defineProperty(content, 'scrollTop', { value: top, configurable: true });
            Object.defineProperty(content, 'clientHeight', { value: clientHeight, configurable: true });
            Object.defineProperty(content, 'scrollHeight', { value: scrollHeight, configurable: true });
            content.dispatchEvent(new Event('scroll'));
            return settled();
        }

        test('a scroll short of the bottom asks for nothing', async function (assert) {
            await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" />`);
            await click(TRIGGER);
            const afterOpen = pages.length;

            await scrollContent({ top: 0, clientHeight: 100, scrollHeight: 1000 });

            assert.strictEqual(pages.length, afterOpen, 'still 900px from the end, so no further page is fetched');
            assert.strictEqual(pages.at(-1), 1, 'only the first page has been asked for');
        });

        test('a scroll within the threshold of the bottom fetches the next page', async function (assert) {
            await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" />`);
            await click(TRIGGER);
            const afterOpen = pages.length;

            await scrollContent({ top: 880, clientHeight: 100, scrollHeight: 1000 });

            assert.strictEqual(pages.length, afterOpen + 1, '20px from the end is close enough');
            assert.strictEqual(pages.at(-1), 2, 'and it is the second page that is asked for');
        });

        test('reaching the bottom of a complete list asks for nothing', async function (assert) {
            // A short first page means the server has already sent everything, so hitting the end
            // of it must not start a second request.
            respondWith = (modelName, query) => {
                pages.push(query.page);
                return A(DRIVERS.slice());
            };

            await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" />`);
            await click(TRIGGER);
            const afterOpen = pages.length;

            await scrollContent({ top: 900, clientHeight: 100, scrollHeight: 1000 });

            assert.strictEqual(pages.length, afterOpen, 'the list is already complete');
        });

        test('the spinner shows while the next page is in flight, then goes away', async function (assert) {
            // Hold the second page open so the loading state can be observed rather than raced past.
            let releaseSecondPage;
            respondWith = (modelName, query) => {
                pages.push(query.page);

                if (query.page === 1) {
                    return A(FULL_PAGE.slice());
                }

                return new Promise((resolve) => {
                    releaseSecondPage = () => resolve(A(DRIVERS.slice()));
                });
            };

            await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" />`);
            await click(TRIGGER);
            assert.dom('.ember-model-select__loading-more').doesNotExist('nothing in flight yet');

            const scrolled = scrollContent({ top: 880, clientHeight: 100, scrollHeight: 1000 });
            await waitFor('.ember-model-select__loading-more');
            assert.dom('.ember-model-select__loading-more .ember-model-select__spinner').exists('the spinner marks the page being fetched');

            releaseSecondPage();
            await scrolled;

            assert.dom('.ember-model-select__loading-more').doesNotExist('and it goes once the page has landed');
        });

        test('with infinite scroll off, reaching the bottom fetches nothing', async function (assert) {
            await render(hbs`<ModelSelect @modelName="driver" @optionLabel="name" @infiniteScroll={{false}} />`);
            await click(TRIGGER);
            const afterOpen = pages.length;

            await scrollContent({ top: 900, clientHeight: 100, scrollHeight: 1000 });

            assert.strictEqual(pages.length, afterOpen, 'paging is off entirely');
        });
    });
});
