import PaginationItems from '@fleetbase/ember-ui/utils/pagination/items';
import { module, test } from 'qunit';

function plain(items) {
    return [...items].map(({ page, current, dots }) => ({ page, current, dots }));
}

module('Unit | Utility | pagination/items', function () {
    module('pageItemsAll', function () {
        test('it emits one entry per page, in order, flagging the current one', function (assert) {
            const subject = PaginationItems.create({ currentPage: 2, totalPages: 3 });

            assert.deepEqual(plain(subject.pageItemsAll), [
                { page: 1, current: false, dots: false },
                { page: 2, current: true, dots: false },
                { page: 3, current: false, dots: false },
            ]);
        });

        test('it never emits dots', function (assert) {
            const subject = PaginationItems.create({ currentPage: 1, totalPages: 25 });
            const items = [...subject.pageItemsAll];

            assert.strictEqual(items.length, 25, 'every page is listed');
            assert.true(
                items.every((item) => item.dots === false),
                'the untruncated list has no ellipsis entries'
            );
            assert.strictEqual(items.filter((item) => item.current).length, 1, 'exactly one page is current');
        });

        test('it is empty when there are no pages', function (assert) {
            assert.deepEqual(plain(PaginationItems.create({ currentPage: 1, totalPages: 0 }).pageItemsAll), []);
            assert.deepEqual(plain(PaginationItems.create({}).pageItemsAll), [], 'missing properties are treated as zero');
        });

        test('a single page is marked current', function (assert) {
            assert.deepEqual(plain(PaginationItems.create({ currentPage: 1, totalPages: 1 }).pageItemsAll), [{ page: 1, current: true, dots: false }]);
        });

        test('an out-of-range current page simply flags nothing', function (assert) {
            const items = plain(PaginationItems.create({ currentPage: 99, totalPages: 3 }).pageItemsAll);

            assert.strictEqual(items.length, 3);
            assert.strictEqual(items.filter((item) => item.current).length, 0, 'no page is highlighted when the current page is beyond the end');
        });

        test('numeric strings are parsed', function (assert) {
            assert.deepEqual(plain(PaginationItems.create({ currentPage: '2', totalPages: '2' }).pageItemsAll), [
                { page: 1, current: false, dots: false },
                { page: 2, current: true, dots: false },
            ]);
        });
    });

    module('pageItemsTruncated', function () {
        test('it marks a dots entry wherever the page sequence jumps', function (assert) {
            const subject = PaginationItems.create({ currentPage: 5, totalPages: 10, numPagesToShow: 5, showFL: true });

            assert.deepEqual(plain(subject.pageItemsTruncated), [
                { page: 1, current: false, dots: false },
                { page: 3, current: false, dots: true },
                { page: 4, current: false, dots: false },
                { page: 5, current: true, dots: false },
                { page: 6, current: false, dots: false },
                { page: 7, current: false, dots: false },
                { page: 10, current: false, dots: true },
            ]);
        });

        test('a contiguous window carries no dots', function (assert) {
            const subject = PaginationItems.create({ currentPage: 1, totalPages: 10, numPagesToShow: 5, showFL: false });

            assert.deepEqual(plain(subject.pageItemsTruncated), [
                { page: 1, current: true, dots: false },
                { page: 2, current: false, dots: false },
                { page: 3, current: false, dots: false },
                { page: 4, current: false, dots: false },
                { page: 5, current: false, dots: false },
            ]);
        });

        test('only the leading gap is flagged when the window sits at the end', function (assert) {
            const subject = PaginationItems.create({ currentPage: 10, totalPages: 10, numPagesToShow: 5, showFL: true });

            assert.deepEqual(
                plain(subject.pageItemsTruncated).map((item) => [item.page, item.dots]),
                [
                    [1, false],
                    [5, true],
                    [6, false],
                    [7, false],
                    [8, false],
                    [9, false],
                    [10, false],
                ]
            );
        });

        test('the current page is always present even with no pages at all', function (assert) {
            const subject = PaginationItems.create({ currentPage: 1, totalPages: 0, numPagesToShow: 5 });

            assert.deepEqual(plain(subject.pageItemsTruncated), [{ page: 1, current: true, dots: false }], 'the truncated list always anchors on the current page');
        });
    });

    module('pageItems', function () {
        test('it returns the untruncated list by default', function (assert) {
            const subject = PaginationItems.create({ currentPage: 1, totalPages: 8, numPagesToShow: 3, showFL: false });

            assert.strictEqual([...subject.pageItems].length, 8, 'truncatePages defaults to falsy');
            assert.deepEqual(plain(subject.pageItems), plain(subject.pageItemsAll));
        });

        test('it returns the truncated list when truncatePages is enabled', function (assert) {
            const subject = PaginationItems.create({ currentPage: 1, totalPages: 8, numPagesToShow: 3, showFL: false, truncatePages: true });

            assert.deepEqual(
                plain(subject.pageItems).map((item) => item.page),
                [1, 2, 3]
            );
            assert.deepEqual(plain(subject.pageItems), plain(subject.pageItemsTruncated));
        });

        test('it switches lists when truncatePages changes', function (assert) {
            const subject = PaginationItems.create({ currentPage: 1, totalPages: 8, numPagesToShow: 3, showFL: false });

            assert.strictEqual([...subject.pageItems].length, 8);

            subject.set('truncatePages', true);
            assert.strictEqual([...subject.pageItems].length, 3, 'enabling truncation recomputes the list');

            subject.set('truncatePages', false);
            assert.strictEqual([...subject.pageItems].length, 8, 'and disabling it restores the full list');
        });

        test('it recomputes when the current page moves', function (assert) {
            const subject = PaginationItems.create({ currentPage: 1, totalPages: 8, numPagesToShow: 3, showFL: false, truncatePages: true });

            assert.deepEqual(
                plain(subject.pageItems).map((item) => item.page),
                [1, 2, 3]
            );

            subject.set('currentPage', 5);

            const items = plain(subject.pageItems);
            assert.deepEqual(
                items.map((item) => item.page),
                [4, 5, 6],
                'the window follows the current page'
            );
            assert.deepEqual(
                items.map((item) => item.current),
                [false, true, false]
            );
        });
    });

    test('instances do not share state', function (assert) {
        const a = PaginationItems.create({ currentPage: 1, totalPages: 3 });
        const b = PaginationItems.create({ currentPage: 3, totalPages: 3 });

        assert.deepEqual(
            plain(a.pageItemsAll).map((item) => item.current),
            [true, false, false]
        );
        assert.deepEqual(
            plain(b.pageItemsAll).map((item) => item.current),
            [false, false, true]
        );
    });
});
