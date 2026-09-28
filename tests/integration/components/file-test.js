import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// A 1x1 transparent gif — never 404s, so <Image>'s error handler stays out of the way.
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function documentFile(overrides = {}) {
    return {
        id: 'file_1',
        original_filename: 'contract.pdf',
        content_type: 'application/pdf',
        extension: 'pdf',
        // Not a data:image URL — isImageFile() sniffs the url as well as the mime type.
        url: 'https://files.example.com/contract.pdf',
        ...overrides,
    };
}

function imageFile(overrides = {}) {
    return documentFile({ id: 'file_2', original_filename: 'photo.png', content_type: 'image/png', extension: 'png', url: PIXEL, ...overrides });
}

const TRIGGER = '.ember-basic-dropdown-trigger';

function menuItems() {
    return findAll('[role="menuitem"]');
}

function menuItem(className) {
    return menuItems().find((item) => item.className.includes(className));
}

module('Integration | Component | file', function (hooks) {
    setupRenderingTest(hooks);

    let deleted;
    let downloaded;
    let previewed;

    hooks.beforeEach(function () {
        deleted = [];
        downloaded = [];
        previewed = [];
        this.set('file', documentFile());
    });

    const TEMPLATE = hbs`
        <File
            @file={{this.file}}
            @onDelete={{this.onDelete}}
            @onDownload={{this.onDownload}}
            @onPreview={{this.onPreview}}
            @dropdownIcon={{this.dropdownIcon}}
        />
    `;

    module('the preview', function () {
        test('a document renders its file icon', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find('img'), null, 'no image preview is attempted');
            assert.ok(find('svg'), 'a file-type icon is rendered instead');
        });

        test('an image renders a thumbnail', async function (assert) {
            this.set('file', imageFile());

            await render(TEMPLATE);

            assert.dom('img').hasAttribute('src', PIXEL);
            assert.dom('img').hasAttribute('alt', 'photo.png');
        });

        test('it renders with no file at all', async function (assert) {
            await render(hbs`<File />`);

            assert.ok(find('svg'), 'a fallback icon is rendered');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<File @file={{this.file}} data-test-file="yes" />`);

            assert.dom('[data-test-file="yes"]').exists();
        });
    });

    module('the actions menu', function () {
        test('no menu is offered when the file has no actions', async function (assert) {
            await render(hbs`<File @file={{this.file}} />`);

            assert.strictEqual(find(TRIGGER), null);
        });

        test('a menu appears as soon as one action is supplied', async function (assert) {
            this.set('onDelete', () => {});

            await render(TEMPLATE);

            assert.ok(find(TRIGGER), 'the actions trigger renders');
            assert.dom(`${TRIGGER} svg`).hasClass('fa-ellipsis-vertical', 'the default icon');
        });

        test('the trigger icon can be replaced', async function (assert) {
            this.setProperties({ onDelete: () => {}, dropdownIcon: 'gear' });

            await render(TEMPLATE);

            assert.dom(`${TRIGGER} svg`).hasClass('fa-gear');
        });

        test('the menu is addressable per file', async function (assert) {
            this.set('onDelete', () => {});

            await render(TEMPLATE);

            assert.dom('#file-actions-file_1').exists('the dropdown is keyed by the file id');
        });

        test('only the supplied actions are listed', async function (assert) {
            this.set('onDelete', () => deleted.push('delete'));

            await render(TEMPLATE);
            await click(TRIGGER);

            assert.strictEqual(menuItems().length, 1, 'just the one action');
            assert.ok(menuItem('text-red-600'), 'and it is the delete action');
        });

        test('all three actions can be offered together', async function (assert) {
            this.setProperties({ onDelete: () => {}, onDownload: () => {}, onPreview: () => {} });

            await render(TEMPLATE);
            await click(TRIGGER);

            assert.strictEqual(menuItems().length, 3);
            assert.strictEqual(findAll('[role="menuitem"] svg.fa-trash').length, 1);
            assert.strictEqual(findAll('[role="menuitem"] svg.fa-download').length, 1);
            assert.strictEqual(findAll('[role="menuitem"] svg.fa-magnifying-glass').length, 1);
        });
    });

    module('running an action', function () {
        test('deleting hands back the file and closes the menu', async function (assert) {
            this.set('onDelete', (file) => deleted.push(file));

            await render(TEMPLATE);
            await click(TRIGGER);
            await click(menuItem('text-red-600'));

            assert.deepEqual(deleted, [this.file]);
            assert.strictEqual(find('[role="menu"]'), null, 'the menu closes');
        });

        test('downloading hands back the file', async function (assert) {
            this.set('onDownload', (file) => downloaded.push(file));

            await render(TEMPLATE);
            await click(TRIGGER);
            await click(menuItems()[0]);

            assert.deepEqual(downloaded, [this.file]);
        });

        test('previewing hands back the file', async function (assert) {
            this.set('onPreview', (file) => previewed.push(file));

            await render(TEMPLATE);
            await click(TRIGGER);
            await click(menuItems()[0]);

            assert.deepEqual(previewed, [this.file]);
        });

        test('each action is wired to its own handler', async function (assert) {
            this.setProperties({
                onDelete: (file) => deleted.push(file),
                onDownload: (file) => downloaded.push(file),
                onPreview: (file) => previewed.push(file),
            });

            await render(TEMPLATE);
            await click(TRIGGER);
            await click(menuItem('text-red-600'));

            assert.strictEqual(deleted.length, 1, 'only the delete handler ran');
            assert.deepEqual(downloaded, []);
            assert.deepEqual(previewed, []);
        });
    });
});
