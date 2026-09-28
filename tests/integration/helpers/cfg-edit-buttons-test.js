import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

module('Integration | Helper | cfg-edit-buttons', function (hooks) {
    setupRenderingTest(hooks);

    test('it produces exactly one edit button descriptor', async function (assert) {
        this.set('cfg', { key: 'smtp', isEditing: false });

        await render(hbs`
            {{#each (cfg-edit-buttons this.cfg) as |editButton|}}
                <span class="btn" data-type={{editButton.type}} data-icon={{editButton.icon}} data-icon-prefix={{editButton.iconPrefix}}>{{editButton.text}}</span>
            {{/each}}
        `);

        assert.dom('.btn').exists({ count: 1 }, 'a single button descriptor is returned');
        assert.dom('.btn').hasText('Edit');
        assert.dom('.btn').hasAttribute('data-type', 'default');
        assert.dom('.btn').hasAttribute('data-icon', 'pencil');
        assert.dom('.btn').hasAttribute('data-icon-prefix', 'fas');
    });

    test('permission and disabled named arguments are passed through onto the descriptor', async function (assert) {
        this.set('cfg', { key: 'smtp' });
        this.set('permission', 'fleet-ops update setting');
        this.set('disabled', true);

        await render(hbs`
            {{#each (cfg-edit-buttons this.cfg permission=this.permission disabled=this.disabled) as |editButton|}}
                <span class="btn" data-permission={{editButton.permission}}>{{if editButton.disabled "disabled" "enabled"}}</span>
            {{/each}}
        `);

        assert.dom('.btn').hasAttribute('data-permission', 'fleet-ops update setting');
        assert.dom('.btn').hasText('disabled');
    });

    test('permission and disabled are undefined when not supplied', async function (assert) {
        this.set('cfg', { key: 'smtp' });

        await render(hbs`
            {{#each (cfg-edit-buttons this.cfg) as |editButton|}}
                <span class="btn" data-permission={{editButton.permission}}>{{if editButton.disabled "disabled" "enabled"}}</span>
            {{/each}}
        `);

        assert.dom('.btn').doesNotHaveAttribute('data-permission');
        assert.dom('.btn').hasText('enabled');
    });

    test('clicking invokes the supplied onClick with the config object', async function (assert) {
        const received = [];
        const cfg = { key: 'smtp', isEditing: false };
        this.set('cfg', cfg);
        this.set('onClick', (arg) => received.push(arg));

        await render(hbs`
            {{#each (cfg-edit-buttons this.cfg onClick=this.onClick) as |editButton|}}
                <button type="button" class="btn" {{on "click" editButton.onClick}}>{{editButton.text}}</button>
            {{/each}}
        `);
        await click('.btn');

        assert.deepEqual(received, [cfg], 'the onClick receives the cfg it was built for');
        assert.false(cfg.isEditing, 'the default fallback is not applied when an onClick is provided');
    });

    test('without an onClick the button falls back to flipping cfg.isEditing', async function (assert) {
        const cfg = { key: 'smtp', isEditing: false };
        this.set('cfg', cfg);

        await render(hbs`
            {{#each (cfg-edit-buttons this.cfg) as |editButton|}}
                <button type="button" class="btn" {{on "click" editButton.onClick}}>{{editButton.text}}</button>
            {{/each}}
        `);
        await click('.btn');

        assert.true(cfg.isEditing, 'the default fallback puts the config into edit mode');
    });

    test('a non-function onClick falls back to the default behaviour', async function (assert) {
        const cfg = { key: 'smtp', isEditing: false };
        this.set('cfg', cfg);
        this.set('notAFunction', 'nope');

        await render(hbs`
            {{#each (cfg-edit-buttons this.cfg onClick=this.notAFunction) as |editButton|}}
                <button type="button" class="btn" {{on "click" editButton.onClick}}>{{editButton.text}}</button>
            {{/each}}
        `);
        await click('.btn');

        assert.true(cfg.isEditing);
    });
});
