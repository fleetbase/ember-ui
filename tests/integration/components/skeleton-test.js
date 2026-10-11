import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | skeleton', function (hooks) {
    setupRenderingTest(hooks);

    test('it draws one hidden block in the requested shape and falls back to text', async function (assert) {
        await render(hbs`<Skeleton @variant="circle" @width="24px" @height="24px" data-test-block />`);

        assert.dom('[data-test-block]').hasClass('ui-skeleton');
        assert.dom('[data-test-block]').hasClass('ui-skeleton-circle');
        assert.dom('[data-test-block]').hasAttribute('aria-hidden', 'true');
        assert.dom('[data-test-block]').hasStyle({ width: '24px', height: '24px' });

        await render(hbs`<Skeleton @variant="nonsense" data-test-block />`);
        assert.dom('[data-test-block]').hasClass('ui-skeleton-text', 'an unknown variant renders as a text line');
    });

    test('text renders the requested number of lines with a short last line', async function (assert) {
        await render(hbs`<Skeleton::Text @lines={{4}} />`);

        assert.dom('.ui-skeleton-text .ui-skeleton').exists({ count: 4 });
        assert.dom('.ui-skeleton-text .ui-skeleton:last-child').hasAttribute('style', /width:\s*60%/);
    });

    test('table renders rows and columns with a heading row, a selection column and an identity first cell', async function (assert) {
        await render(hbs`<Skeleton::Table @rows={{3}} @columns={{4}} @checkbox={{true}} />`);

        assert.dom('.ui-skeleton-table thead th').exists({ count: 5 }, 'four columns plus the checkbox column');
        assert.dom('.ui-skeleton-table tbody tr').exists({ count: 3 });
        assert.dom('.ui-skeleton-table tbody tr:first-child td').exists({ count: 5 });
        assert.dom('.ui-skeleton-table tbody tr:first-child .ui-skeleton-identity').exists({ count: 1 });

        await render(hbs`<Skeleton::Table @header={{false}} @identityColumn={{false}} @rows={{2}} @columns={{2}} />`);
        assert.dom('.ui-skeleton-table thead').doesNotExist();
        assert.dom('.ui-skeleton-identity').doesNotExist();
    });

    test('table defaults and caps its counts', async function (assert) {
        await render(hbs`<Skeleton::Table />`);
        assert.dom('.ui-skeleton-table tbody tr').exists({ count: 8 });
        assert.dom('.ui-skeleton-table thead th').exists({ count: 5 });

        await render(hbs`<Skeleton::Table @rows={{5000}} @columns={{1}} />`);
        assert.dom('.ui-skeleton-table tbody tr').exists({ count: 100 }, 'rows are capped');
    });

    test('cards grid renders count cards in the card anatomy', async function (assert) {
        await render(hbs`<Skeleton::CardsGrid @count={{6}} @columns={{3}} @mediaHeight={{120}} />`);

        assert.dom('.ui-skeleton-cards-grid').hasClass('ui-skeleton-cards-grid-cols-3');
        assert.dom('.ui-skeleton-card').exists({ count: 6 });
        assert.dom('.ui-skeleton-card:first-child .ui-skeleton-card-header').exists();
        assert.dom('.ui-skeleton-card:first-child .ui-skeleton-card-media').hasStyle({ height: '120px' });
        assert.dom('.ui-skeleton-card:first-child .ui-skeleton-card-footer .ui-skeleton-badge').exists();

        await render(hbs`<Skeleton::CardsGrid @count={{2}} @hideMedia={{true}} />`);
        assert.dom('.ui-skeleton-card-media').doesNotExist();
    });

    test('panel renders the identity strip, tabs and sections of fields', async function (assert) {
        await render(hbs`<Skeleton::Panel @tabs={{4}} @sections={{2}} @fieldsPerSection={{3}} />`);

        assert.dom('.ui-skeleton-panel-identity .ui-skeleton-avatar').exists();
        assert.dom('.ui-skeleton-panel-tabs .ui-skeleton').exists({ count: 4 });
        assert.dom('.ui-skeleton-panel-section').exists({ count: 2 });
        assert.dom('[data-skeleton-section="0"] .ui-skeleton-field').exists({ count: 3 });
    });

    test('form and stat tiles render their counts', async function (assert) {
        await render(hbs`<Skeleton::Form @fields={{5}} @columns={{2}} /><Skeleton::StatTiles @count={{3}} />`);

        assert.dom('.ui-skeleton-form').hasClass('ui-skeleton-form-cols-2');
        assert.dom('.ui-skeleton-form-field').exists({ count: 5 });
        assert.dom('.ui-skeleton-form-field .ui-skeleton-input').exists({ count: 5 });
        assert.dom('.ui-skeleton-stat-tile').exists({ count: 3 });
    });

    test('page announces itself once and draws the header and the view', async function (assert) {
        await render(hbs`<Skeleton::Page @label="Loading orders" @columns={{6}} @rows={{4}} />`);

        assert.dom('.ui-skeleton-page').hasAttribute('role', 'status');
        assert.dom('.ui-skeleton-page').hasAttribute('aria-busy', 'true');
        assert.dom('.ui-skeleton-page').hasAttribute('data-skeleton-view', 'table');
        assert.dom('.ui-skeleton-page .ui-skeleton-sr-only').hasText('Loading orders');
        assert.dom('.ui-skeleton-page-header').exists({ count: 1 });
        assert.dom('.ui-skeleton-page-header .ui-skeleton-page-header-search').exists();
        assert.dom('.ui-skeleton-page-header .ui-skeleton-button').exists({ count: 2 });
        assert.dom('.ui-skeleton-table-card .ui-skeleton-table-card-toolbar').exists();
        assert.dom('.ui-skeleton-table-card .ui-skeleton-table tbody tr').exists({ count: 4 });
        assert.dom('.ui-skeleton-table-card .ui-skeleton-table thead th').exists({ count: 7 }, 'six columns plus the checkbox column');
        assert.dom('.ui-skeleton-table-card .ui-skeleton-table-card-footer').exists();
        assert.dom('.ui-skeleton-page [aria-hidden="true"]').exists('the boxes themselves are hidden from assistive tech');
    });

    test('page switches body by view and takes a block', async function (assert) {
        await render(hbs`<Skeleton::Page @label="Loading" @view="cards" @count={{4}} @hideSearch={{true}} @hideAvatar={{true}} @actions={{1}} />`);
        assert.dom('.ui-skeleton-page').hasAttribute('data-skeleton-view', 'cards');
        assert.dom('.ui-skeleton-card').exists({ count: 4 });
        assert.dom('.ui-skeleton-page-header-search').doesNotExist();
        assert.dom('.ui-skeleton-page-header .ui-skeleton-avatar').doesNotExist();
        assert.dom('.ui-skeleton-page-header .ui-skeleton-button').exists({ count: 1 });

        await render(hbs`<Skeleton::Page @label="Loading" @view="dashboard" @tiles={{4}} />`);
        assert.dom('.ui-skeleton-stat-tile').exists({ count: 4 });
        assert.dom('.ui-skeleton-table').exists();

        await render(hbs`<Skeleton::Page @label="Loading" @view="form" @count={{3}} />`);
        assert.dom('.ui-skeleton-form-field').exists({ count: 3 });

        await render(hbs`<Skeleton::Page @label="Loading" @view="panel" @hideHeader={{true}} />`);
        assert.dom('.ui-skeleton-page-header').doesNotExist();
        assert.dom('.ui-skeleton-panel').exists();

        await render(hbs`<Skeleton::Page @label="Loading" @view="bogus"><div data-test-custom>custom</div></Skeleton::Page>`);
        assert.dom('.ui-skeleton-page').hasAttribute('data-skeleton-view', 'table', 'an unknown view falls back to the table');
        assert.dom('.ui-skeleton-page-body [data-test-custom]').exists('a block replaces the body');
        assert.dom('.ui-skeleton-table').doesNotExist();
    });
});
