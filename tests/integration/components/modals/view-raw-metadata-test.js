import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/view-raw-metadata', function (hooks) {
    setupRenderingTest(hooks);

    const TEMPLATE = hbs`<Modals::ViewRawMetadata @options={{this.options}} @onConfirm={{this.onConfirm}} @onDecline={{this.onDecline}} />`;

    test('it pretty-prints the metadata', async function (assert) {
        this.set('options', { metadata: { driver: 'Alex', attempts: 2 } });

        await render(TEMPLATE);

        const printed = find('pre').textContent;
        assert.true(printed.includes('"driver"'));
        assert.true(printed.includes('"Alex"'));
        assert.true(printed.includes('\n'), 'the output is formatted across lines, not minified');
    });

    test('nested metadata is rendered in full', async function (assert) {
        this.set('options', { metadata: { vehicle: { plate: 'ABC-123' } } });

        await render(TEMPLATE);

        assert.true(find('pre').textContent.includes('ABC-123'));
    });

    test('empty metadata renders an empty object', async function (assert) {
        this.set('options', { metadata: {} });

        await render(TEMPLATE);

        assert.strictEqual(find('pre').textContent.trim(), '{}');
    });

    test('it renders with no metadata at all', async function (assert) {
        this.set('options', {});

        await render(TEMPLATE);

        assert.ok(find('pre'), 'the viewer still renders');
    });
});
