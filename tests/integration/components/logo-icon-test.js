import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, find } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

// Real inline images: a URL that 404s would fire the <Image> error handler and be
// swapped for the fallback mid-test, making src assertions racy.
const BRAND_ICON = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const SUPPLIED_ICON = 'data:image/gif;base64,R0lGODlhAQABAIABAP8AAP///yH5BAEAAAEALAAAAAABAAEAAAICTAEAOw==';

module('Integration | Component | logo-icon', function (hooks) {
    setupRenderingTest(hooks);

    let findRecordCalls;
    let respondWith;

    hooks.beforeEach(function () {
        findRecordCalls = [];
        respondWith = () => Promise.resolve({ icon_url: BRAND_ICON });
        this.set('size', 8);

        this.owner.unregister('service:store');
        this.owner.register(
            'service:store',
            class extends Service {
                findRecord(modelName, id) {
                    findRecordCalls.push({ modelName, id });
                    return respondWith();
                }
            }
        );
    });

    const TEMPLATE = hbs`<LogoIcon @brand={{this.brand}} @size={{this.size}} />`;

    module('loading the brand', function () {
        test('with no brand it loads one from the store', async function (assert) {
            await render(TEMPLATE);

            assert.deepEqual(findRecordCalls, [{ modelName: 'brand', id: 1 }]);
            assert.dom('img').hasAttribute('src', BRAND_ICON);
        });

        test('a supplied brand is used without a lookup', async function (assert) {
            this.set('brand', { icon_url: SUPPLIED_ICON });

            await render(TEMPLATE);

            assert.deepEqual(findRecordCalls, [], 'the store is not consulted');
            assert.dom('img').hasAttribute('src', SUPPLIED_ICON);
        });

        test('a failed load still renders, falling back to the bundled icon', async function (assert) {
            respondWith = () => Promise.reject(new Error('offline'));

            await render(TEMPLATE);

            assert.dom('img').exists('the icon renders even though the brand could not be loaded');
            assert.dom('img').hasAttribute('data-fallback-src', '/images/icon.png');
        });

        test('a brand with no icon url falls back', async function (assert) {
            this.set('brand', {});

            await render(TEMPLATE);

            assert.dom('img').hasAttribute('data-fallback-src', '/images/icon.png');
        });
    });

    module('sizing', function () {
        const CASES = [
            [4, '16'],
            [5, '20'],
            [8, '32'],
            [10, '40'],
            [12, '48'],
            [16, '64'],
            [20, '80'],
        ];

        for (const [size, pixels] of CASES) {
            test(`size ${size} renders at ${pixels} pixels`, async function (assert) {
                this.set('brand', { icon_url: SUPPLIED_ICON });
                this.set('size', size);

                await render(TEMPLATE);

                assert.dom('img').hasAttribute('width', pixels);
                assert.dom('img').hasAttribute('height', pixels);
                assert.dom('img').hasClass(`w-${size}`);
                assert.dom('img').hasClass(`h-${size}`);
            });
        }

        // DEFECT (see DEFECTS.md #48): rendering <LogoIcon /> WITHOUT an explicit @size
        // raises "You attempted to update `size` on `LogoIconComponent`, but it had already
        // been used previously in the same computation" and the component renders nothing.
        // There is deliberately no test for it — the assertion surfaces as an uncaught
        // global failure that would abort the run.

        test('a numeric string size is accepted', async function (assert) {
            this.set('brand', { icon_url: SUPPLIED_ICON });
            this.set('size', '16');

            await render(TEMPLATE);

            assert.dom('img').hasAttribute('width', '64');
        });

        test('an unmapped size renders no explicit dimensions', async function (assert) {
            this.set('brand', { icon_url: SUPPLIED_ICON });
            this.set('size', 7);

            await render(TEMPLATE);

            assert.dom('img').doesNotHaveAttribute('width', 'there is no pixel mapping for this size');
            assert.dom('img').hasClass('w-7', 'but the utility class still follows the size');
        });
    });

    test('it forwards splattributes', async function (assert) {
        this.set('brand', { icon_url: SUPPLIED_ICON });

        await render(hbs`<LogoIcon @brand={{this.brand}} @size={{8}} data-test-logo="yes" />`);

        assert.ok(find('img[data-test-logo="yes"]'), 'attributes reach the image');
    });

    test('it renders at the documented default size when none is given', async function (assert) {
        this.set('brand', { icon_url: SUPPLIED_ICON });

        await render(hbs`<LogoIcon @brand={{this.brand}} />`);

        assert.dom('img').exists('the component renders rather than bailing out');
        assert.dom('img').hasAttribute('src', SUPPLIED_ICON);
        assert.dom('img').hasAttribute('height', '32', 'the default size of 8 maps to 32px');
    });

    test('each supported size maps to its pixel dimensions', async function (assert) {
        const SIZES = [
            [4, '16'],
            [5, '20'],
            [8, '32'],
            [10, '40'],
            [12, '48'],
            [16, '64'],
            [20, '80'],
        ];

        this.set('brand', { icon_url: SUPPLIED_ICON });

        for (const [size, px] of SIZES) {
            this.set('size', size);

            await render(hbs`<LogoIcon @brand={{this.brand}} @size={{this.size}} />`);

            assert.dom('img').hasAttribute('height', px, `size ${size} is ${px}px tall`);
            assert.dom('img').hasAttribute('width', px, `and ${px}px wide`);
            assert.dom('img').hasClass(`w-${size}`, 'and carries the matching tailwind class');
        }
    });

    test('an unmapped size renders no explicit dimensions', async function (assert) {
        this.set('brand', { icon_url: SUPPLIED_ICON });

        await render(hbs`<LogoIcon @brand={{this.brand}} @size={{7}} />`);

        assert.dom('img').doesNotHaveAttribute('height', 'size 7 is not in the map');
        assert.dom('img').hasClass('w-7', 'but the class is still emitted');
    });
});
