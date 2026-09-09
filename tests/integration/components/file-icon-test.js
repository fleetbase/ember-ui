import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Model from '@ember-data/model';
import { UploadFile } from 'ember-file-upload';

// isModel() only accepts a real ember-data Model instance, and the dummy app ships a
// plain-object store stub — so build the record straight off Model.prototype instead.
function fileRecord(properties) {
    return Object.assign(Object.create(Model.prototype), properties);
}

function uploadFile(name) {
    return new UploadFile(new File(['data'], name, { type: 'text/plain' }));
}

module('Integration | Component | file-icon', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the extension and a matching icon', async function (assert) {
        this.set('file', fileRecord({ original_filename: 'quarterly.xlsx' }));

        await render(hbs`<FileIcon @file={{this.file}} />`);

        assert.dom('.file-icon').hasClass('file-icon-xlsx');
        assert.dom('.file-extension').hasText('xlsx');
        assert.dom('svg').hasClass('fa-file-excel');
    });

    test('each known extension maps to its own icon', async function (assert) {
        const expected = {
            'a.xls': 'fa-file-excel',
            'a.xlsb': 'fa-file-excel',
            'a.xlsm': 'fa-file-excel',
            'a.docx': 'fa-file-word',
            'a.docm': 'fa-file-word',
            'a.pdf': 'fa-file-pdf',
            'a.ppt': 'fa-file-powerpoint',
            'a.pptx': 'fa-file-powerpoint',
        };

        for (const [filename, icon] of Object.entries(expected)) {
            this.set('file', fileRecord({ original_filename: filename }));
            await render(hbs`<FileIcon @file={{this.file}} />`);

            assert.dom('svg').hasClass(icon, `${filename} uses ${icon}`);
        }
    });

    test('csv and tsv render the spreadsheet icon from the free set', async function (assert) {
        for (const [filename, icon] of [
            ['a.csv', 'fa-file-csv'],
            ['a.tsv', 'fa-file-csv'],
        ]) {
            this.set('file', fileRecord({ original_filename: filename }));
            await render(hbs`<FileIcon @file={{this.file}} />`);

            assert.dom('svg').hasClass(icon, `${filename} uses ${icon}`);
            assert.dom('.file-extension').hasText(filename.split('.')[1]);
        }
    });

    test('a record without a filename falls back to its url, then its path', async function (assert) {
        this.set('file', fileRecord({ url: '/uploads/manifest.pdf' }));
        await render(hbs`<FileIcon @file={{this.file}} />`);
        assert.dom('svg').hasClass('fa-file-pdf', 'the url supplies the extension');

        this.set('file', fileRecord({ path: 'uploads/manifest.docx' }));
        await render(hbs`<FileIcon @file={{this.file}} />`);
        assert.dom('svg').hasClass('fa-file-word', 'the path supplies the extension');
    });

    test('an absolute url on a dotted host keeps its real extension', async function (assert) {
        this.set('file', fileRecord({ url: 'https://example.test/uploads/manifest.pdf' }));

        await render(hbs`<FileIcon @file={{this.file}} />`);

        assert.dom('svg').hasClass('fa-file-pdf', 'the dotted host no longer swallows the extension');
        assert.dom('.file-extension').hasText('pdf');
    });

    test('a url with a query string or fragment still resolves its extension', async function (assert) {
        this.set('file', fileRecord({ url: 'https://cdn.example.test/uploads/manifest.pdf?v=2' }));
        await render(hbs`<FileIcon @file={{this.file}} />`);
        assert.dom('.file-extension').hasText('pdf', 'a query string is ignored');

        this.set('file', fileRecord({ url: 'https://cdn.example.test/uploads/manifest.docx#page=2' }));
        await render(hbs`<FileIcon @file={{this.file}} />`);
        assert.dom('.file-extension').hasText('docx', 'a fragment is ignored');
    });

    test('a dotted directory in the path does not become the extension', async function (assert) {
        this.set('file', fileRecord({ path: 'uploads/v1.2/manifest.pdf' }));

        await render(hbs`<FileIcon @file={{this.file}} />`);

        assert.dom('.file-extension').hasText('pdf');
    });

    test('a record with no name, url or path renders the generic icon and no extension', async function (assert) {
        this.set('file', fileRecord({ filename: 'quarterly.xlsx' }));

        await render(hbs`<FileIcon @file={{this.file}} />`);

        assert.dom('svg').hasClass('fa-file-lines');
        assert.dom('.file-extension').hasText('');
        assert.dom('.file-icon').doesNotHaveClass('file-icon-null');
    });

    test('an in-flight upload is named from the browser file', async function (assert) {
        this.set('file', uploadFile('receipt.pdf'));

        await render(hbs`<FileIcon @file={{this.file}} />`);

        assert.dom('.file-extension').hasText('pdf');
        assert.dom('svg').hasClass('fa-file-pdf');
    });

    test('no file at all renders the generic icon', async function (assert) {
        await render(hbs`<FileIcon />`);

        assert.dom('svg').hasClass('fa-file-lines');
        assert.dom('.file-extension').hasText('');
    });

    test('the extension label can be hidden', async function (assert) {
        this.set('file', fileRecord({ original_filename: 'quarterly.xlsx' }));

        await render(hbs`<FileIcon @file={{this.file}} @hideExtension={{true}} />`);

        assert.dom('.file-extension').doesNotExist();
        assert.dom('svg').exists('the icon is still rendered');
    });

    test('it yields a block and applies its class hooks', async function (assert) {
        this.set('file', fileRecord({ original_filename: 'quarterly.xlsx' }));

        await render(
            hbs`<FileIcon @file={{this.file}} @iconClass="my-icon" @iconSize="lg" @fileExtensionClass="my-extension" data-test-icon="yes"><span class="inside">caption</span></FileIcon>`
        );

        assert.dom('.file-icon').hasAttribute('data-test-icon', 'yes');
        assert.dom('svg').hasClass('my-icon');
        assert.dom('svg').hasClass('fa-lg');
        assert.dom('.file-extension').hasClass('my-extension');
        assert.dom('.file-icon .inside').hasText('caption');
    });
    // Both arms of the extension lookup have a null fallback, and the fixtures above always carry
    // a well-formed name.
    module('when no extension can be read', function () {
        test('an upload file with no underlying file falls back to the generic icon', async function (assert) {
            // `isUploadFile` is an instanceof check, and the guard exists for exactly this state.
            this.set('file', Object.create(UploadFile.prototype));

            await render(hbs`<FileIcon @file={{this.file}} />`);

            assert.dom('.file-extension').hasText('', 'nothing to read an extension from');
            assert.dom('svg').exists('the generic icon still renders');
        });

        test('a filename with no extension at all falls back to the generic icon', async function (assert) {
            this.set('file', uploadFile('README'));

            await render(hbs`<FileIcon @file={{this.file}} />`);

            assert.dom('.file-extension').hasText('');
            assert.dom('svg').exists();
        });

        test('a record whose filename has no extension does too', async function (assert) {
            this.set('file', fileRecord({ original_filename: 'LICENSE' }));

            await render(hbs`<FileIcon @file={{this.file}} />`);

            assert.dom('.file-extension').hasText('');
            assert.dom('svg').exists();
        });
    });
});
