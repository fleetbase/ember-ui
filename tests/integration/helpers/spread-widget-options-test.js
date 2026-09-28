import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { helper } from '@ember/component/helper';

function registerCapture(owner, sink) {
    owner.register(
        'helper:capture-value',
        helper(function ([value]) {
            sink.push(value);
            return '';
        })
    );
}

module('Integration | Helper | spread-widget-options', function (hooks) {
    setupRenderingTest(hooks);

    test('it merges the widget id into the grid options', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('params', { id: 'widget_1', options: { x: 0, y: 2, w: 4, h: 3 } });

        await render(hbs`{{capture-value (spread-widget-options this.params)}}`);

        assert.deepEqual(captured[0], { id: 'widget_1', x: 0, y: 2, w: 4, h: 3 }, 'the id and options are flattened into one object');
    });

    test('it exposes the merged options to the template', async function (assert) {
        this.set('params', { id: 'widget_1', options: { x: 0, y: 2 } });

        await render(hbs`{{get (spread-widget-options this.params) "id"}}|{{get (spread-widget-options this.params) "x"}}|{{get (spread-widget-options this.params) "y"}}`);

        assert.dom(this.element).hasText('widget_1|0|2');
    });

    test('it works with a hash built inline in the template', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('gridOptions', { w: 6, h: 2 });

        await render(hbs`{{capture-value (spread-widget-options (hash id="widget_2" options=this.gridOptions))}}`);

        assert.deepEqual(captured[0], { id: 'widget_2', w: 6, h: 2 });
    });

    test('an id inside options overrides the top level id', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('params', { id: 'outer', options: { id: 'inner', w: 1 } });

        await render(hbs`{{capture-value (spread-widget-options this.params)}}`);

        assert.strictEqual(captured[0].id, 'inner', 'the spread options win over the leading id');
    });

    test('it returns just the id when there are no options', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('params', { id: 'widget_3' });

        await render(hbs`{{capture-value (spread-widget-options this.params)}}`);

        assert.deepEqual(captured[0], { id: 'widget_3' }, 'missing options spread to nothing');
    });

    test('it tolerates null options and a missing id', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('nullOptions', { id: 'widget_4', options: null });
        this.set('noId', { options: { w: 2 } });

        await render(hbs`{{capture-value (spread-widget-options this.nullOptions)}}{{capture-value (spread-widget-options this.noId)}}`);

        assert.deepEqual(captured[0], { id: 'widget_4' }, 'null options spread to nothing');
        assert.deepEqual(captured[1], { id: undefined, w: 2 }, 'a missing id is carried through as undefined');
    });

    test('it returns a new object and does not mutate the source options', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        const options = { x: 1 };
        const params = { id: 'widget_5', options };
        this.set('params', params);

        await render(hbs`{{capture-value (spread-widget-options this.params)}}`);

        assert.notStrictEqual(captured[0], options, 'a fresh object is returned');
        assert.notStrictEqual(captured[0], params, 'the params object is not returned directly');
        assert.deepEqual(options, { x: 1 }, 'the source options are not mutated');
    });

    test('it preserves falsy option values', async function (assert) {
        const captured = [];
        registerCapture(this.owner, captured);
        this.set('params', { id: 'widget_6', options: { x: 0, autoPosition: false, label: '' } });

        await render(hbs`{{capture-value (spread-widget-options this.params)}}`);

        assert.deepEqual(captured[0], { id: 'widget_6', x: 0, autoPosition: false, label: '' });
    });
});
