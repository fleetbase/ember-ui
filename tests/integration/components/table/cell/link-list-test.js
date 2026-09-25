import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | table/cell/link-list', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders one link per item using the name property', async function (assert) {
        this.set('row', { tags: [{ name: 'urgent' }, { name: 'fragile' }] });
        this.set('column', { valuePath: 'tags', action: () => {} });

        await render(hbs`<Table::Cell::LinkList @row={{this.row}} @column={{this.column}} />`);

        const links = findAll('a');
        assert.strictEqual(links.length, 2);
        assert.dom(links[0]).hasText('urgent');
        assert.dom(links[1]).hasText('fragile');
    });

    test('a custom label path overrides the name property', async function (assert) {
        this.set('row', { tags: [{ name: 'ignored', label: 'Shown' }] });
        this.set('column', { valuePath: 'tags', cellComponentLabelPath: 'label', action: () => {} });

        await render(hbs`<Table::Cell::LinkList @row={{this.row}} @column={{this.column}} />`);

        assert.dom('a').hasText('Shown');
    });

    test('it renders a dash when the list is empty', async function (assert) {
        this.set('row', { tags: [] });
        this.set('column', { valuePath: 'tags', action: () => {} });

        await render(hbs`<Table::Cell::LinkList @row={{this.row}} @column={{this.column}} />`);

        assert.dom('a').doesNotExist();
        assert.dom('li span').hasText('-', 'the empty state is a single dash row');
    });

    test('it renders a dash when the value path resolves to nothing', async function (assert) {
        this.set('row', {});
        this.set('column', { valuePath: 'tags', action: () => {} });

        await render(hbs`<Table::Cell::LinkList @row={{this.row}} @column={{this.column}} />`);

        assert.dom('li span').hasText('-');
    });

    test('it renders the empty state with no arguments at all', async function (assert) {
        await render(hbs`<Table::Cell::LinkList />`);

        assert.dom('.cell-link-list').exists();
        assert.dom('li span').hasText('-');
    });

    test('clicking a link calls the column action with the item and the row', async function (assert) {
        const calls = [];
        this.set('row', { tags: [{ name: 'urgent' }, { name: 'fragile' }] });
        this.set('column', { valuePath: 'tags', action: (item, row) => calls.push([item, row]) });

        await render(hbs`<Table::Cell::LinkList @row={{this.row}} @column={{this.column}} />`);
        await click(findAll('a')[1]);

        assert.strictEqual(calls.length, 1);
        assert.strictEqual(calls[0][0], this.row.tags[1], 'the clicked item is passed, not the first one');
        assert.strictEqual(calls[0][1], this.row);
    });

    test('it resolves a nested value path', async function (assert) {
        this.set('row', { meta: { tags: [{ name: 'nested' }] } });
        this.set('column', { valuePath: 'meta.tags', action: () => {} });

        await render(hbs`<Table::Cell::LinkList @row={{this.row}} @column={{this.column}} />`);

        assert.dom('a').hasText('nested');
    });

    test('an item missing the label property renders an empty link', async function (assert) {
        this.set('row', { tags: [{ id: 1 }] });
        this.set('column', { valuePath: 'tags', action: () => {} });

        await render(hbs`<Table::Cell::LinkList @row={{this.row}} @column={{this.column}} />`);

        assert.dom('a').hasText('', 'a missing name renders empty rather than "undefined"');
    });

    test('it updates when the list changes', async function (assert) {
        this.set('column', { valuePath: 'tags', action: () => {} });
        this.set('row', { tags: [{ name: 'one' }] });

        await render(hbs`<Table::Cell::LinkList @row={{this.row}} @column={{this.column}} />`);
        assert.strictEqual(findAll('a').length, 1);

        this.set('row', { tags: [{ name: 'one' }, { name: 'two' }] });
        assert.strictEqual(findAll('a').length, 2);

        this.set('row', { tags: [] });
        assert.dom('li span').hasText('-', 'emptying the list falls back to the dash');
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Table::Cell::LinkList data-test-list="yes" class="extra" />`);

        assert.dom('.cell-link-list').hasAttribute('data-test-list', 'yes');
        assert.dom('.cell-link-list').hasClass('extra');
    });
});
