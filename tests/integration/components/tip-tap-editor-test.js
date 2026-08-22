import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled, triggerEvent, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

function controlButton(icon) {
    return findAll('.tip-tap-control-button').find((button) => button.querySelector(`[data-icon="${icon}"]`));
}

function dropdownTrigger(text) {
    return findAll('.tip-tap-editor-controls button').find((button) => button.textContent.trim().includes(text));
}

function menuItem(text) {
    return findAll('.next-dd-item').find((item) => item.textContent.trim() === text);
}

function youtubeButton() {
    const groups = findAll('.tip-tap-editor-control-group');
    const buttons = groups[groups.length - 1].querySelectorAll('button.tip-tap-control-button');
    return buttons[buttons.length - 1];
}

function editorHtml() {
    return find('.ProseMirror').innerHTML;
}

module('Integration | Component | tip-tap-editor', function (hooks) {
    setupRenderingTest(hooks);

    let editor;
    let modals;
    let uploads;
    let notificationErrors;

    hooks.beforeEach(function () {
        editor = null;
        modals = [];
        uploads = [];
        notificationErrors = [];

        this.owner.unregister('service:modalsManager');
        this.owner.register(
            'service:modalsManager',
            class extends Service {
                show(name, options) {
                    modals.push({ name, options });
                }
            }
        );

        this.owner.unregister('service:notifications');
        this.owner.register(
            'service:notifications',
            class extends Service {
                error(message) {
                    notificationErrors.push(message);
                }
            }
        );

        this.owner.unregister('service:fetch');
        this.owner.register(
            'service:fetch',
            class extends Service {
                uploadFile = {
                    perform: (file, options, onSuccess, onError) => {
                        uploads.push({ file, options, onSuccess, onError });
                    },
                };
            }
        );

        this.set('onCreate', ({ editor: created }) => (editor = created));
    });

    const TEMPLATE = hbs`
        <TipTapEditor
            @value={{this.value}}
            @placeholder={{this.placeholder}}
            @editable={{this.editable}}
            @onCreate={{this.onCreate}}
            @onBeforeCreate={{this.onBeforeCreate}}
            @onChange={{this.onChange}}
            @onHtmlChange={{this.onHtmlChange}}
            @onJsonChange={{this.onJsonChange}}
            @onTextChange={{this.onTextChange}}
            @onUpdate={{this.onUpdate}}
            @onSelectionUpdate={{this.onSelectionUpdate}}
            @onTransaction={{this.onTransaction}}
            @onFocus={{this.onFocus}}
            @onBlur={{this.onBlur}}
        />
    `;

    // TipTap emits its `create` event from a timeout after the ProseMirror view is
    // built, which is later than render()'s settled state — flush a macrotask so the
    // editor instance is available.
    async function renderEditor(template = TEMPLATE) {
        await render(template);
        await new Promise((resolve) => setTimeout(resolve, 0));
        await settled();
    }

    // Puts a paragraph of text under the cursor so formatting toggles have something
    // to apply to, then hands back the editor.
    async function withSelection(text = 'hello world') {
        editor.commands.setContent(`<p>${text}</p>`);
        editor.commands.selectAll();
        await settled();
    }

    module('setup', function () {
        test('it renders an editor and a toolbar', async function (assert) {
            await renderEditor();

            assert.dom('.tip-tap-editor').exists();
            assert.dom('.ProseMirror').exists();
            assert.true(findAll('.tip-tap-editor-control-group').length > 5, 'the toolbar is populated');
            assert.ok(editor, 'onCreate hands the editor to the caller');
        });

        test('an initial value is loaded into the editor', async function (assert) {
            this.set('value', '<p>Existing content</p>');

            await renderEditor();

            assert.true(editorHtml().includes('Existing content'));
        });

        test('onBeforeCreate is called too', async function (assert) {
            let called = 0;
            this.set('onBeforeCreate', () => called++);

            await renderEditor();

            assert.strictEqual(called, 1);
        });

        test('a placeholder is configured', async function (assert) {
            this.set('placeholder', 'Write something…');

            await renderEditor();

            assert.strictEqual(find('.ProseMirror p').getAttribute('data-placeholder'), 'Write something…');
        });

        test('the editor can be made read-only', async function (assert) {
            this.set('editable', false);

            await renderEditor();

            assert.false(editor.isEditable);
        });

        test('it renders without any callbacks', async function (assert) {
            await renderEditor(hbs`<TipTapEditor @value="<p>Bare</p>" />`);

            assert.dom('.ProseMirror').exists();
            assert.true(find('.ProseMirror').innerHTML.includes('Bare'));
        });

        test('it forwards splattributes', async function (assert) {
            await renderEditor(hbs`<TipTapEditor data-test-editor="yes" />`);

            assert.dom('.tip-tap-editor').hasAttribute('data-test-editor', 'yes');
        });
    });

    module('change callbacks', function () {
        test('editing reports html, json, text and the generic change', async function (assert) {
            const seen = { html: [], json: [], text: [], change: [], update: 0 };
            this.set('onHtmlChange', (html) => seen.html.push(html));
            this.set('onJsonChange', (json) => seen.json.push(json));
            this.set('onTextChange', (text) => seen.text.push(text));
            this.set('onChange', (html) => seen.change.push(html));
            this.set('onUpdate', () => seen.update++);

            await renderEditor();
            editor.commands.setContent('<p>Typed content</p>', true);
            await settled();

            assert.true(seen.html[0].includes('Typed content'));
            assert.strictEqual(seen.text[0], 'Typed content');
            assert.strictEqual(seen.json[0].type, 'doc');
            assert.true(seen.change[0].includes('Typed content'));
            assert.strictEqual(seen.update, 1);
        });

        test('selection changes and transactions are forwarded', async function (assert) {
            const seen = [];
            this.set('onSelectionUpdate', () => seen.push('selection'));
            this.set('onTransaction', () => seen.push('transaction'));

            await renderEditor();
            editor.commands.setContent('<p>abc</p>', true);
            editor.commands.setTextSelection({ from: 1, to: 3 });
            await settled();

            assert.true(seen.includes('transaction'), 'transactions are reported');
            assert.true(seen.includes('selection'), 'selection changes are reported');
        });
    });

    module('inline formatting', function () {
        const CASES = [
            ['bold', 'strong'],
            ['italic', 'em'],
            ['strikethrough', 's'],
        ];

        for (const [icon, tag] of CASES) {
            test(`the ${icon} button wraps the selection in <${tag}>`, async function (assert) {
                await renderEditor();
                await withSelection();

                await click(controlButton(icon));

                assert.true(editorHtml().includes(`<${tag}>`), `the selection is now ${icon}`);
            });
        }

        test('the format menu offers every inline style and applies them', async function (assert) {
            await renderEditor();
            await withSelection();

            await click(dropdownTrigger('Format'));
            assert.deepEqual(
                findAll('.next-dd-item').map((item) => item.textContent.trim()),
                ['Bold', 'Italic', 'Underline', 'Strikethrough', 'Superscript', 'Subscript']
            );

            await click(menuItem('Underline'));
            assert.true(editorHtml().includes('<u>'));

            await withSelection();
            await click(dropdownTrigger('Format'));
            await click(menuItem('Superscript'));
            assert.true(editorHtml().includes('<sup>'));

            await withSelection();
            await click(dropdownTrigger('Format'));
            await click(menuItem('Subscript'));
            assert.true(editorHtml().includes('<sub>'));
        });
    });

    module('blocks', function () {
        test('headings can be applied at each level', async function (assert) {
            await renderEditor();

            for (const level of [1, 2, 3]) {
                await withSelection();
                await click(dropdownTrigger('Heading'));
                await click(menuItem(`Heading ${level}`));

                assert.true(editorHtml().includes(`<h${level}>`), `heading ${level} is applied`);
            }
        });

        test('paragraph, blockquote and codeblock each restyle the block', async function (assert) {
            await renderEditor();

            await withSelection();
            await click(controlButton('quote-left'));
            assert.true(editorHtml().includes('<blockquote>'));

            await withSelection();
            await click(controlButton('code'));
            assert.true(editorHtml().includes('<pre>'));

            await withSelection();
            await click(controlButton('code'));
            await click(controlButton('paragraph'));
            assert.true(editorHtml().includes('<p>'));
        });

        test('bullet and ordered lists can be applied', async function (assert) {
            await renderEditor();

            await withSelection();
            await click(controlButton('list'));
            assert.true(editorHtml().includes('<ul>'));

            await withSelection();
            await click(controlButton('list-ol'));
            assert.true(editorHtml().includes('<ol>'));
        });

        test('a horizontal rule can be inserted', async function (assert) {
            await renderEditor();
            await withSelection();

            await click(controlButton('minus'));

            assert.ok(find('.ProseMirror hr'), 'a rule is inserted');
        });
    });

    module('alignment', function () {
        test('left and right alignment are applied', async function (assert) {
            await renderEditor();

            await withSelection();
            await click(controlButton('align-right'));
            assert.true(editorHtml().includes('text-align: right'));

            await click(controlButton('align-left'));
            assert.false(editorHtml().includes('text-align: right'), 'alignment is switched back');
        });

        test('the centre alignment button centres the selection', async function (assert) {
            await renderEditor();
            await withSelection();

            await click(controlButton('align-center'));

            assert.true(editorHtml().includes('text-align: center'), 'the button reaches alignCenter');
        });
    });

    module('font family and colour', function () {
        test('each font can be applied and then unset', async function (assert) {
            await renderEditor();

            await withSelection();
            await click(dropdownTrigger('Font'));
            assert.deepEqual(
                findAll('.next-dd-item').map((item) => item.textContent.trim()),
                ['Inter', 'Comic Sans', 'Serif', 'Monospace', 'Unset']
            );

            await click(menuItem('Comic Sans'));
            assert.true(editorHtml().includes('font-family'), 'a font family is applied to the selection');

            await click(dropdownTrigger('Font'));
            await click(menuItem('Unset'));
            assert.false(editorHtml().includes('font-family'), 'the font is removed again');
        });

        test('the colour picker sets and clears the text colour', async function (assert) {
            await renderEditor();
            await withSelection();

            const picker = find('.tip-tap-colorpicker-input');
            picker.value = '#ff0000';
            await triggerEvent(picker, 'change');

            assert.true(editorHtml().includes('color'), 'a colour is applied to the selection');

            await click(controlButton('eraser'));

            assert.false(editorHtml().includes('color: #ff0000'), 'the colour is cleared');
        });
    });

    module('history', function () {
        test('undo and redo step through edits', async function (assert) {
            await renderEditor();

            editor.commands.setContent('<p>first</p>', true);
            await settled();
            editor.commands.insertContent(' second');
            await settled();
            assert.true(editorHtml().includes('second'));

            await click(controlButton('arrow-rotate-left'));
            assert.false(editorHtml().includes('second'), 'the last edit is undone');

            await click(controlButton('arrow-rotate-right'));
            assert.true(editorHtml().includes('second'), 'and redone');
        });
    });

    module('tables', function () {
        test('inserting a table opens a modal and builds the table on confirm', async function (assert) {
            await renderEditor();
            await click(controlButton('table'));

            assert.strictEqual(modals.length, 1);
            assert.strictEqual(modals[0].name, 'modals/tip-tap-editor-insert-table');
            assert.strictEqual(modals[0].options.rows, 3);
            assert.strictEqual(modals[0].options.columns, 3);

            let done = 0;
            modals[0].options.confirm({ getOption: (key, fallback) => fallback, done: () => done++ });
            await settled();

            assert.true(editorHtml().includes('<table'), 'a table is inserted');
            assert.strictEqual(done, 1, 'the modal is closed');
        });

        test('the table menu offers every structural operation', async function (assert) {
            await renderEditor();
            await click(dropdownTrigger('Table'));

            assert.deepEqual(
                findAll('.next-dd-item').map((item) => item.textContent.trim()),
                ['Add Column Before', 'Add Column After', 'Delete Column', 'Add Row Before', 'Add Row After', 'Delete Row', 'Delete Table']
            );
            assert.strictEqual(findAll('.next-dd-menu-seperator').length, 2, 'the groups are separated');
        });

        test('rows and columns can be added and removed', async function (assert) {
            await renderEditor();
            editor.commands.insertTable({ rows: 2, columns: 2, withHeaderRow: true });
            await settled();

            const countCells = () => find('.ProseMirror table').querySelectorAll('td, th').length;
            const initial = countCells();

            await click(dropdownTrigger('Table'));
            await click(menuItem('Add Row After'));
            assert.true(countCells() > initial, 'a row is added');

            await click(dropdownTrigger('Table'));
            await click(menuItem('Add Column After'));
            const withColumn = countCells();

            await click(dropdownTrigger('Table'));
            await click(menuItem('Delete Column'));
            assert.true(countCells() < withColumn, 'a column is removed');

            await click(dropdownTrigger('Table'));
            await click(menuItem('Delete Row'));

            await click(dropdownTrigger('Table'));
            await click(menuItem('Delete Table'));
            assert.notOk(find('.ProseMirror table'), 'the table is gone');
        });

        test('column and row can also be added before the cursor', async function (assert) {
            await renderEditor();
            editor.commands.insertTable({ rows: 2, columns: 2, withHeaderRow: true });
            await settled();

            const countCells = () => find('.ProseMirror table').querySelectorAll('td, th').length;
            const initial = countCells();

            await click(dropdownTrigger('Table'));
            await click(menuItem('Add Column Before'));
            await click(dropdownTrigger('Table'));
            await click(menuItem('Add Row Before'));

            assert.true(countCells() > initial);
        });
    });

    module('embeds', function () {
        test('inserting a youtube video opens a modal and embeds on confirm', async function (assert) {
            await renderEditor();
            await click(youtubeButton());

            assert.strictEqual(modals.length, 1);
            assert.strictEqual(modals[0].name, 'modals/tip-tap-editor-insert-youtube');
            assert.strictEqual(modals[0].options.width, 480);
            assert.strictEqual(modals[0].options.height, 320);

            let done = 0;
            modals[0].options.confirm({
                getOption: (key, fallback) => (key === 'url' ? 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' : fallback),
                done: () => done++,
            });
            await settled();

            assert.strictEqual(done, 1, 'the modal closes on success');
            assert.deepEqual(notificationErrors, []);
        });

        test('an invalid youtube url is reported and leaves the dialog open', async function (assert) {
            await renderEditor();
            await click(youtubeButton());

            let done = 0;
            modals[0].options.confirm({
                getOption: (key, fallback) => (key === 'url' ? 'not-a-url' : fallback),
                done: () => done++,
            });
            await settled();

            assert.deepEqual(notificationErrors, ['Youtube video URL is invalid.'], 'the user is told');
            assert.strictEqual(done, 0, 'and the dialog stays open so the url can be corrected');
            assert.false(editorHtml().includes('iframe'), 'nothing is inserted');
        });
    });

    module('image upload', function () {
        async function addFile() {
            const input = find('input[type="file"]');
            const file = new File(['image-bytes'], 'logo.png', { type: 'image/png' });
            await triggerEvent(input, 'change', { files: [file] });
        }

        test('a queued file is uploaded and the returned url inserted', async function (assert) {
            await renderEditor();
            await addFile();

            assert.strictEqual(uploads.length, 1, 'the file is handed to the upload service');
            assert.deepEqual(uploads[0].options, { path: 'uploads/images', type: 'image' });
            assert.dom('.tip-tap-editor').containsText('%', 'upload progress is shown while it runs');

            uploads[0].onSuccess({ url: '/uploads/logo.png' });
            await settled();

            assert.true(editorHtml().includes('/uploads/logo.png'), 'the image is inserted');
            assert.dom('.tip-tap-editor').doesNotContainText('%', 'the progress indicator is cleared');
        });

        test('a failed upload clears the progress state and drops the file from the queue', async function (assert) {
            await renderEditor();
            await addFile();

            const removed = [];
            uploads[0].file.queue = { remove: (file) => removed.push(file) };

            uploads[0].onError();
            await settled();

            assert.deepEqual(removed, [uploads[0].file], 'the file is removed from the queue');
            assert.dom('.tip-tap-editor').doesNotContainText('%');
        });

        test('a failed upload without a queue is still survivable', async function (assert) {
            await renderEditor();
            await addFile();

            uploads[0].file.queue = undefined;
            uploads[0].onError();
            await settled();

            assert.dom('.tip-tap-editor').exists('no error is thrown');
        });
    });
});
