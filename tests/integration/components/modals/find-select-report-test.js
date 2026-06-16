import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Component | modals/find-select-report', function (hooks) {
    setupRenderingTest(hooks);

    test('it renders the report selector inside the default modal', async function (assert) {
        this.owner.register('service:store', { query: () => Promise.resolve([]) }, { instantiate: false });
        this.set('options', { title: 'Select report', onChange: () => {}, selected: [], limit: 1 });

        await render(hbs`<Modals::FindSelectReport @modalIsOpened={{true}} @options={{this.options}} />`);

        assert.dom('.modal-body-container').exists();
        assert.dom('input[placeholder="Search reports by keyword..."]').exists();
    });
});
