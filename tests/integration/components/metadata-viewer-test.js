import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, find, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function rows() {
    return findAll('tbody tr').map((row) => Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent.trim()));
}

module('Integration | Component | metadata-viewer', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<MetadataViewer @metadata={{this.metadata}} />`;

    module('with no metadata', function () {
        test('it explains that there is nothing to show', async function (assert) {
            this.set('metadata', {});

            await render(TEMPLATE);

            assert.dom('.metadata-viewer').containsText('No metadata');
            assert.dom('.metadata-viewer').containsText('No metadata to display');
            assert.strictEqual(find('table'), null, 'no table is drawn');
        });

        test('an absent metadata argument is treated as empty', async function (assert) {
            await render(hbs`<MetadataViewer />`);

            assert.dom('.metadata-viewer').containsText('No metadata');
        });
    });

    module('with metadata', function (hooks) {
        hooks.beforeEach(function () {
            this.set('metadata', { colour: 'blue', weight: 42 });
        });

        test('it tabulates every key and value', async function (assert) {
            await render(TEMPLATE);

            assert.deepEqual(
                findAll('thead th').map((th) => th.textContent.trim()),
                ['Key', 'Value']
            );
            assert.deepEqual(rows(), [
                ['colour', 'blue'],
                ['weight', '42'],
            ]);
        });

        test('a nested value is rendered as formatted json', async function (assert) {
            this.set('metadata', { tags: ['a', 'b'], nested: { x: 1 } });

            await render(TEMPLATE);

            const [tags, nested] = rows();
            assert.strictEqual(tags[0], 'tags');
            assert.true(tags[1].includes('"a"'), 'the array is shown as json');
            assert.true(tags[1].includes('"b"'), 'including every element');
            assert.strictEqual(nested[0], 'nested');
            assert.true(nested[1].includes('"x"'), 'so is the object');
            assert.true(nested[1].includes('1'), 'including its value');
            assert.false(nested[1].includes('[object Object]'), 'nothing falls through to a raw stringification');
        });

        test('the raw payload is hidden behind a toggle', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(find('pre'), null, 'the raw view starts closed');
            assert.dom('button').containsText('View raw metadata');
        });

        test('the raw payload can be shown and hidden again', async function (assert) {
            await render(TEMPLATE);
            await click('button');

            assert.ok(find('pre'), 'the raw payload is revealed');
            assert.dom('pre').containsText('"colour": "blue"', 'pretty printed');
            assert.dom('button').containsText('Hide raw metadata');

            await click('button');
            assert.strictEqual(find('pre'), null, 'and hidden again');
            assert.dom('button').containsText('View raw metadata');
        });

        test('it forwards splattributes', async function (assert) {
            await render(hbs`<MetadataViewer @metadata={{this.metadata}} data-test-metadata="yes" />`);

            assert.dom('.metadata-viewer').hasAttribute('data-test-metadata', 'yes');
        });
    });
});
