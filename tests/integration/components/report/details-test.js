import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function fieldValues() {
    return findAll('.field-value').map((field) => field.textContent.trim());
}

function fieldNames() {
    return findAll('.field-name').map((field) => field.textContent.trim());
}

module('Integration | Component | report/details', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('resource', {
            title: 'Quarterly deliveries',
            description: 'Completed orders per depot',
            createdAt: '12 Mar 2026',
            tags: ['finance', 'quarterly'],
        });
    });

    const TEMPLATE = hbs`<Report::Details @resource={{this.resource}} />`;

    test('it lists the report fields', async function (assert) {
        await render(TEMPLATE);

        assert.dom('.details-wrapper').exists();
        assert.deepEqual(fieldNames(), ['Title', 'Description', 'Date Created', 'Tags']);
    });

    test('the panel is titled and open', async function (assert) {
        await render(TEMPLATE);

        assert.dom('.details-wrapper').containsText('Report Details');
        assert.dom('.field-value').exists('the body is expanded');
    });

    test('it shows the report title, description and creation date', async function (assert) {
        await render(TEMPLATE);

        const [title, description, createdAt] = fieldValues();
        assert.strictEqual(title, 'Quarterly deliveries');
        assert.strictEqual(description, 'Completed orders per depot');
        assert.strictEqual(createdAt, '12 Mar 2026');
    });

    test('every tag is listed as a chip', async function (assert) {
        await render(TEMPLATE);

        assert.deepEqual(
            findAll('.field-value .rounded-xl').map((chip) => chip.textContent.trim()),
            ['finance', 'quarterly']
        );
    });

    test('a report with no tags shows a dash', async function (assert) {
        this.set('resource', { ...this.resource, tags: [] });

        await render(TEMPLATE);

        assert.deepEqual(findAll('.field-value .rounded-xl'), []);
        assert.true(fieldValues().includes('-'), 'the tags field falls back to a dash');
    });

    test('missing title and description render as a dash', async function (assert) {
        this.set('resource', { createdAt: '12 Mar 2026' });

        await render(TEMPLATE);

        const [title, description] = fieldValues();
        assert.strictEqual(title, '-');
        assert.strictEqual(description, '-');
    });

    test('it renders with no resource at all', async function (assert) {
        await render(hbs`<Report::Details />`);

        assert.dom('.details-wrapper').exists();
        assert.deepEqual(fieldNames(), ['Title', 'Description', 'Date Created', 'Tags']);
    });

    test('it forwards splattributes', async function (assert) {
        await render(hbs`<Report::Details @resource={{this.resource}} data-test-details="yes" />`);

        assert.dom('.details-wrapper').hasAttribute('data-test-details', 'yes');
    });
});
