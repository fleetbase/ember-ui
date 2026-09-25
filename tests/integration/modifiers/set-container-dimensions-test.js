import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render, settled, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

// A detached, off-screen fixture keeps the measured container independent of the
// rendered element's own parent, and independent of the browser window size.
function createFixtureContainer(id, width, height) {
    const container = document.createElement('div');

    container.id = id;
    container.style.cssText = `position: fixed; top: -9999px; left: 0; box-sizing: border-box; width: ${width}px; height: ${height}px;`;
    document.body.appendChild(container);

    return container;
}

module('Integration | Modifier | set-container-dimensions', function (hooks) {
    setupRenderingTest(hooks);

    let fixture;

    hooks.afterEach(function () {
        if (fixture) {
            fixture.remove();
            fixture = undefined;
        }
    });

    test('it sizes the element to its parent by default', async function (assert) {
        await render(hbs`
            <div style="box-sizing: border-box; width: 300px; height: 150px;">
                <div data-test-el {{set-container-dimensions}}></div>
            </div>
        `);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.width, '300px', 'width matches the parent offsetWidth');
        assert.strictEqual(element.style.height, '150px', 'height matches the parent offsetHeight');
        assert.strictEqual(element.offsetWidth, 300, 'element actually renders at the parent width');
        assert.strictEqual(element.offsetHeight, 150, 'element actually renders at the parent height');
    });

    test('it subtracts the horizontal and vertical padding options', async function (assert) {
        await render(hbs`
            <div style="box-sizing: border-box; width: 300px; height: 150px;">
                <div data-test-el {{set-container-dimensions (hash horizontalLeftPadding=10 horizontalRightPadding=20 verticalTopPadding=5 verticalBottomPadding=15)}}></div>
            </div>
        `);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.width, '270px', 'width is the container width minus both horizontal paddings');
        assert.strictEqual(element.style.height, '130px', 'height is the container height minus both vertical paddings');
    });

    test('it measures a container passed as an element', async function (assert) {
        fixture = createFixtureContainer('scd-element-container', 420, 220);
        this.set('container', fixture);

        await render(hbs`
            <div style="box-sizing: border-box; width: 100px; height: 50px;">
                <div data-test-el {{set-container-dimensions (hash containerEl=this.container)}}></div>
            </div>
        `);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.width, '420px', 'width comes from the supplied container element, not the parent');
        assert.strictEqual(element.style.height, '220px', 'height comes from the supplied container element, not the parent');
    });

    test('it measures a container passed as a selector', async function (assert) {
        fixture = createFixtureContainer('scd-selector-container', 360, 180);

        await render(hbs`
            <div style="box-sizing: border-box; width: 100px; height: 50px;">
                <div data-test-el {{set-container-dimensions (hash containerEl="#scd-selector-container")}}></div>
            </div>
        `);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.width, '360px', 'width comes from the selected container');
        assert.strictEqual(element.style.height, '180px', 'height comes from the selected container');
    });

    test('it falls back to the parent when the container selector matches nothing', async function (assert) {
        await render(hbs`
            <div style="box-sizing: border-box; width: 300px; height: 150px;">
                <div data-test-el {{set-container-dimensions (hash containerEl="#scd-missing-container")}}></div>
            </div>
        `);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.width, '300px', 'width falls back to the parent width');
        assert.strictEqual(element.style.height, '150px', 'height falls back to the parent height');
    });

    test('it recalculates when the options change', async function (assert) {
        this.set('leftPadding', 0);

        await render(hbs`
            <div style="box-sizing: border-box; width: 300px; height: 150px;">
                <div data-test-el {{set-container-dimensions (hash horizontalLeftPadding=this.leftPadding)}}></div>
            </div>
        `);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.width, '300px', 'initial width uses no padding');

        this.set('leftPadding', 40);
        await settled();

        assert.strictEqual(element.style.width, '260px', 'width tracks the updated padding option');
        assert.strictEqual(element.style.height, '150px', 'height is unchanged by a horizontal padding update');
    });

    test('it treats missing padding options as zero', async function (assert) {
        await render(hbs`
            <div style="box-sizing: border-box; width: 300px; height: 150px;">
                <div data-test-el {{set-container-dimensions (hash containerEl=null)}}></div>
            </div>
        `);

        const element = find('[data-test-el]');
        assert.strictEqual(element.style.width, '300px', 'omitted horizontal paddings do not produce NaN');
        assert.strictEqual(element.style.height, '150px', 'omitted vertical paddings do not produce NaN');
    });
});
