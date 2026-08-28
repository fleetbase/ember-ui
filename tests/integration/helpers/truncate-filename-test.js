import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | truncate-filename', function (hooks) {
    setupRenderingTest(hooks);

    test('it leaves a short filename untouched', async function (assert) {
        this.set('filename', 'invoice.pdf');

        await render(hbs`{{truncate-filename this.filename}}`);

        assert.dom(this.element).hasText('invoice.pdf');
    });

    test('it leaves a filename of exactly the maximum length untouched', async function (assert) {
        this.set('filename', 'abcdefghijklmnop.txt');

        await render(hbs`{{truncate-filename this.filename}}`);

        assert.strictEqual(this.element.textContent.trim(), 'abcdefghijklmnop.txt');
        assert.strictEqual('abcdefghijklmnop.txt'.length, 20, 'the fixture is exactly at the default limit');
    });

    test('it truncates the base name and keeps the extension within the default limit', async function (assert) {
        this.set('filename', 'abcdefghijklmnopq.txt');

        await render(hbs`{{truncate-filename this.filename}}`);

        assert.strictEqual(this.element.textContent.trim(), 'abcdefghijklm....txt');
        assert.strictEqual(this.element.textContent.trim().length, 20, 'the result respects the maximum length');
    });

    test('it honours a custom maximum length', async function (assert) {
        this.set('filename', 'abcdefghijklmnopq.txt');

        await render(hbs`{{truncate-filename this.filename 10}}`);

        assert.strictEqual(this.element.textContent.trim(), 'abc....txt');
    });

    test('it truncates a filename with no extension', async function (assert) {
        this.set('filename', 'thisisaverylongfilenamewithoutanyextension');

        await render(hbs`{{truncate-filename this.filename}}`);

        assert.strictEqual(this.element.textContent.trim(), 'thisisaverylongfi...');
        assert.strictEqual(this.element.textContent.trim().length, 20, 'the result respects the maximum length');
    });

    test('it treats everything after the first dot as the extension', async function (assert) {
        this.set('filename', 'my.backup.archive.tar.gz');

        await render(hbs`{{truncate-filename this.filename}}`);

        assert.strictEqual(this.element.textContent.trim(), '....backup.archive.tar.gz');
    });

    test('it returns the extension alone when the limit cannot fit it', async function (assert) {
        this.set('filename', 'photograph.jpeg');

        await render(hbs`{{truncate-filename this.filename 4}}`);

        assert.strictEqual(this.element.textContent.trim(), '....jpeg');
    });

    test('it handles a dotfile whose whole name reads as an extension', async function (assert) {
        this.set('filename', '.gitignore');

        await render(hbs`{{truncate-filename this.filename 5}}`);

        assert.strictEqual(this.element.textContent.trim(), '....gitignore');
    });

    test('it handles a zero maximum length', async function (assert) {
        this.set('filename', 'report.csv');

        await render(hbs`{{truncate-filename this.filename 0}}`);

        assert.strictEqual(this.element.textContent.trim(), '....csv');
    });

    test('it returns falsy and non string input unchanged', async function (assert) {
        this.set('nullValue', null);
        this.set('empty', '');
        this.set('number', 12345);

        await render(hbs`{{truncate-filename this.nullValue}}|{{truncate-filename this.missing}}|{{truncate-filename this.empty}}|{{truncate-filename this.number}}`);

        assert.strictEqual(this.element.textContent.trim(), '|||12345');
    });

    test('it truncates unicode filenames', async function (assert) {
        this.set('filename', 'файл-очень-длинное-имя.txt');

        await render(hbs`{{truncate-filename this.filename}}`);

        assert.strictEqual(this.element.textContent.trim(), 'файл-очень-дл....txt');
    });

    test('it truncates a very long filename to the requested length', async function (assert) {
        this.set('filename', `${'a'.repeat(500)}.png`);

        await render(hbs`{{truncate-filename this.filename 30}}`);

        const output = this.element.textContent.trim();
        assert.strictEqual(output.length, 30, 'the output is capped at the requested length');
        assert.true(output.endsWith('....png'), 'the extension is preserved');
    });
});
