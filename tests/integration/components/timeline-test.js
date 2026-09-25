import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, findAll, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';

function activity(count = 5) {
    return Array.from({ length: count }, (_, index) => ({ id: `a${index}`, status: `Step ${index}` }));
}

function visibleLabels() {
    return findAll('.timeline-entry').map((node) => node.textContent.trim());
}

function leftArrow() {
    return find('.timeline-arrow-left');
}

function rightArrow() {
    return find('.timeline-arrow-right');
}

module('Integration | Component | timeline', function (hooks) {
    setupRenderingTest(hooks);

    hooks.beforeEach(function () {
        this.set('activity', activity());
    });

    const TEMPLATE = hbs`
        <Timeline @activity={{this.activity}} as |Item|>
            <Item as |entry|>
                <span class="timeline-entry">{{entry.status}}</span>
            </Item>
        </Timeline>
    `;

    module('rendering', function () {
        test('it shows a window of three activities', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.timeline').exists();
            assert.deepEqual(visibleLabels(), ['Step 0', 'Step 1', 'Step 2'], 'the first three are shown');
        });

        test('the activity count is exposed as a class', async function (assert) {
            await render(TEMPLATE);

            assert.dom('.timeline').hasClass('timeline-activity-5');
        });

        test('a shorter activity list shows everything it has', async function (assert) {
            this.set('activity', activity(2));

            await render(TEMPLATE);

            assert.deepEqual(visibleLabels(), ['Step 0', 'Step 1']);
        });

        test('a single activity is shown on its own', async function (assert) {
            this.set('activity', activity(1));

            await render(TEMPLATE);

            assert.deepEqual(visibleLabels(), ['Step 0']);
        });

        test('an empty activity list renders no entries', async function (assert) {
            this.set('activity', []);

            await render(TEMPLATE);

            assert.deepEqual(visibleLabels(), []);
            assert.dom('.timeline').exists('the frame still renders');
        });

        test('a non-array activity argument is ignored', async function (assert) {
            this.set('activity', 'not an array');

            await render(TEMPLATE);

            assert.deepEqual(visibleLabels(), []);
        });

        test('custom classes and splattributes are applied', async function (assert) {
            await render(hbs`
                <Timeline
                    @activity={{this.activity}}
                    @controlsClass="my-controls"
                    @wrapperClass="my-wrapper"
                    @itemsContainerClass="my-items"
                    @arrowClass="my-arrow"
                    @arrowLeftClass="my-left"
                    @arrowRightClass="my-right"
                    data-test-timeline="yes"
                />
            `);

            assert.dom('.timeline').hasAttribute('data-test-timeline', 'yes');
            assert.dom('.timeline-controls').hasClass('my-controls');
            assert.dom('.timeline-wrapper').hasClass('my-wrapper');
            assert.dom('.timeline-items-container').hasClass('my-items');
            assert.dom(leftArrow()).hasClass('my-arrow');
            assert.dom(leftArrow()).hasClass('my-left');
            assert.dom(rightArrow()).hasClass('my-right');
        });
    });

    module('paging', function () {
        test('the left arrow starts disabled and the right arrow does not', async function (assert) {
            await render(TEMPLATE);

            assert.dom(leftArrow()).isDisabled('there is nothing before the first activity');
            assert.dom(rightArrow()).isNotDisabled();
        });

        test('stepping right advances the window by one', async function (assert) {
            await render(TEMPLATE);

            await click(rightArrow());

            assert.deepEqual(visibleLabels(), ['Step 1', 'Step 2', 'Step 3']);
            assert.dom(leftArrow()).isNotDisabled('you can now step back');
        });

        test('stepping left returns to the previous window', async function (assert) {
            await render(TEMPLATE);

            await click(rightArrow());
            await click(leftArrow());

            assert.deepEqual(visibleLabels(), ['Step 0', 'Step 1', 'Step 2']);
            assert.dom(leftArrow()).isDisabled();
        });

        test('the right arrow disables at the end of the list', async function (assert) {
            await render(TEMPLATE);

            await click(rightArrow());
            await click(rightArrow());

            assert.deepEqual(visibleLabels(), ['Step 2', 'Step 3', 'Step 4']);
            assert.dom(rightArrow()).isDisabled('the last activity is in view');
        });

        test('paging translates the item container', async function (assert) {
            await render(TEMPLATE);

            await click(rightArrow());

            assert.true(find('.timeline-items-container').style.transform.includes('translateX'), 'the strip is shifted');
        });

        test('with three or fewer activities neither arrow is usable', async function (assert) {
            this.set('activity', activity(3));

            await render(TEMPLATE);

            assert.dom(leftArrow()).isDisabled();
            assert.dom(rightArrow()).isDisabled();
        });
    });

    test('it renders without a block', async function (assert) {
        await render(hbs`<Timeline @activity={{this.activity}} />`);

        assert.dom('.timeline-items-container').exists('the container renders even with nothing yielded');
    });
});
