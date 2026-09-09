import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

const TITLE = 'h5.modal-title';

module('Integration | Component | modal/title-with-buttons', function (hooks) {
    setupRenderingTest(hooks);

    let pressed;

    hooks.beforeEach(function () {
        pressed = [];
    });

    test('it renders the modal title', async function (assert) {
        this.set('options', { title: 'Delete order' });

        await render(hbs`<Modal::TitleWithButtons @options={{this.options}} />`);

        assert.dom(TITLE).hasText('Delete order');
    });

    test('it renders with no options at all', async function (assert) {
        await render(hbs`<Modal::TitleWithButtons />`);

        assert.dom(TITLE).hasText('');
        assert.dom(this.element).doesNotContainText('undefined');
    });

    test('a header status renders a badge', async function (assert) {
        this.set('options', { title: 'Order 123', headerStatus: 'dispatched' });

        await render(hbs`<Modal::TitleWithButtons @options={{this.options}} />`);

        assert.dom(this.element).containsText('Dispatched');
    });

    test('no header status renders no badge', async function (assert) {
        this.set('options', { title: 'Order 123' });

        await render(hbs`<Modal::TitleWithButtons @options={{this.options}} />`);

        assert.dom('.ml-2\\.5').doesNotExist();
    });

    test('it forwards splattributes and yields its block', async function (assert) {
        this.set('options', { title: 'Order 123' });

        await render(hbs`<Modal::TitleWithButtons @options={{this.options}} data-test-title="yes"><span class="inside">extra</span></Modal::TitleWithButtons>`);

        assert.dom('[data-test-title="yes"]').exists();
        assert.dom('.inside').hasText('extra');
    });

    module('plain header buttons', function () {
        test('a button is rendered and clickable', async function (assert) {
            this.set('options', {
                title: 'Order 123',
                headerButtons: [{ title: 'Save', type: 'primary', icon: 'floppy-disk', onClick: () => pressed.push('save') }],
            });

            await render(hbs`<Modal::TitleWithButtons @options={{this.options}} />`);
            await click('button.btn');

            assert.dom('button.btn').containsText('Save');
            assert.dom('button.btn').hasClass('btn-primary');
            assert.deepEqual(pressed, ['save']);
        });

        test('an fn callback is used when there is no onClick', async function (assert) {
            this.set('options', { title: 'Order 123', headerButtons: [{ title: 'Save', fn: () => pressed.push('fn') }] });

            await render(hbs`<Modal::TitleWithButtons @options={{this.options}} />`);
            await click('button.btn');

            assert.deepEqual(pressed, ['fn']);
        });

        test('an action callback is the last fallback', async function (assert) {
            this.set('options', { title: 'Order 123', headerButtons: [{ title: 'Save', action: () => pressed.push('action') }] });

            await render(hbs`<Modal::TitleWithButtons @options={{this.options}} />`);
            await click('button.btn');

            assert.deepEqual(pressed, ['action']);
        });

        test('no header buttons renders no buttons', async function (assert) {
            this.set('options', { title: 'Order 123' });

            await render(hbs`<Modal::TitleWithButtons @options={{this.options}} />`);

            assert.deepEqual(findAll('button.btn'), []);
        });
    });

    module('dropdown header buttons', function (hooks) {
        hooks.beforeEach(function () {
            this.set('options', {
                title: 'Order 123',
                headerButtons: [
                    {
                        title: 'More',
                        ddMenuLabel: 'Order actions',
                        options: [
                            { title: 'Duplicate', icon: 'copy', action: () => pressed.push('duplicate') },
                            { separator: true },
                            { title: 'Archive', action: () => pressed.push('archive') },
                        ],
                    },
                ],
            });
        });

        test('a button carrying options becomes a dropdown', async function (assert) {
            await render(hbs`<Modal::TitleWithButtons @options={{this.options}} />`);
            await click('.ember-basic-dropdown-trigger');

            assert.deepEqual(
                findAll('.next-dd-item').map((item) => item.textContent.trim()),
                ['Duplicate', 'Archive']
            );
            assert.dom('.next-dd-menu').containsText('Order actions', 'the menu label is rendered');
            assert.dom('.next-dd-menu-seperator').exists();
        });

        test('choosing an option runs its action and closes the dropdown', async function (assert) {
            await render(hbs`<Modal::TitleWithButtons @options={{this.options}} />`);
            await click('.ember-basic-dropdown-trigger');
            await click(findAll('.next-dd-item')[0]);

            assert.deepEqual(pressed, ['duplicate']);
            assert.dom('.next-dd-item').doesNotExist('the dropdown closed itself');
        });

        test('an option without an action still closes the dropdown', async function (assert) {
            this.set('options', { title: 'Order 123', options: undefined, headerButtons: [{ title: 'More', options: [{ title: 'Nothing' }] }] });

            await render(hbs`<Modal::TitleWithButtons @options={{this.options}} />`);
            await click('.ember-basic-dropdown-trigger');
            await click('.next-dd-item');

            assert.dom('.next-dd-item').doesNotExist();
        });

        test('a dropdown with no menu label renders no label row', async function (assert) {
            this.set('options', { title: 'Order 123', headerButtons: [{ title: 'More', options: [{ title: 'Duplicate' }] }] });

            await render(hbs`<Modal::TitleWithButtons @options={{this.options}} />`);
            await click('.ember-basic-dropdown-trigger');

            assert.dom('.next-dd-menu-seperator').doesNotExist();
            assert.deepEqual(
                findAll('.next-dd-item').map((item) => item.textContent.trim()),
                ['Duplicate']
            );
        });
    });
});
