import PaginationTruncatePages from '@fleetbase/ember-ui/utils/pagination/truncate-pages';
import { module, test } from 'qunit';

function pages(options) {
    return [...PaginationTruncatePages.create(options).pagesToShow];
}

module('Unit | Utility | pagination/truncate-pages', function () {
    module('isValidPage', function () {
        test('it accepts pages within 1..totalPages', function (assert) {
            const subject = PaginationTruncatePages.create({ totalPages: 10 });

            assert.true(subject.isValidPage(1), 'the first page is valid');
            assert.true(subject.isValidPage(5));
            assert.true(subject.isValidPage(10), 'the last page is valid');
        });

        test('it rejects pages outside the range', function (assert) {
            const subject = PaginationTruncatePages.create({ totalPages: 10 });

            assert.false(subject.isValidPage(0), 'pages are one-based');
            assert.false(subject.isValidPage(-1));
            assert.false(subject.isValidPage(11), 'one past the end is invalid');
            assert.false(subject.isValidPage(9999));
        });

        test('it parses string and fractional input', function (assert) {
            const subject = PaginationTruncatePages.create({ totalPages: '10' });

            assert.true(subject.isValidPage('5'), 'numeric strings are parsed');
            assert.true(subject.isValidPage('10'), 'totalPages is parsed too');
            assert.true(subject.isValidPage(2.9), 'fractions truncate toward zero');
            assert.false(subject.isValidPage('11'));
        });

        test('it rejects unparseable input', function (assert) {
            const subject = PaginationTruncatePages.create({ totalPages: 10 });

            assert.false(subject.isValidPage('abc'), 'NaN comparisons are always false');
            assert.false(subject.isValidPage(undefined));
            assert.false(subject.isValidPage(null));
        });

        test('nothing is valid when there are no pages', function (assert) {
            const subject = PaginationTruncatePages.create({ totalPages: 0 });

            assert.false(subject.isValidPage(1));
            assert.false(subject.isValidPage(0));
        });
    });

    module('pagesToShow without first/last anchors', function () {
        test('it fills forward from the first page', function (assert) {
            assert.deepEqual(pages({ currentPage: 1, totalPages: 10, numPagesToShow: 5, showFL: false }), [1, 2, 3, 4, 5]);
        });

        test('it centers the window on the current page', function (assert) {
            assert.deepEqual(pages({ currentPage: 5, totalPages: 10, numPagesToShow: 5, showFL: false }), [3, 4, 5, 6, 7]);
        });

        test('it fills backward from the last page', function (assert) {
            assert.deepEqual(pages({ currentPage: 10, totalPages: 10, numPagesToShow: 5, showFL: false }), [6, 7, 8, 9, 10], 'the window shifts back so it stays full');
        });

        test('a single page yields just that page', function (assert) {
            assert.deepEqual(pages({ currentPage: 1, totalPages: 1, numPagesToShow: 5, showFL: false }), [1]);
        });

        test('the window never exceeds the number of pages available', function (assert) {
            assert.deepEqual(pages({ currentPage: 3, totalPages: 3, numPagesToShow: 5, showFL: false }), [1, 2, 3]);
            assert.deepEqual(pages({ currentPage: 1, totalPages: 10, numPagesToShow: 10, showFL: false }), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'showing every page is allowed');
        });

        test('an even window size biases toward the following pages', function (assert) {
            assert.deepEqual(pages({ currentPage: 5, totalPages: 10, numPagesToShow: 4, showFL: false }), [3, 4, 5, 6]);
        });

        test('a window of one shows only the current page', function (assert) {
            assert.deepEqual(pages({ currentPage: 2, totalPages: 10, numPagesToShow: 1, showFL: false }), [2]);
        });
    });

    module('pagesToShow with first/last anchors', function () {
        test('it anchors both ends around a centered window', function (assert) {
            assert.deepEqual(pages({ currentPage: 5, totalPages: 10, numPagesToShow: 5, showFL: true }), [1, 3, 4, 5, 6, 7, 10], 'page 1 and page 10 are prepended/appended');
        });

        test('it does not duplicate the first page when already at the start', function (assert) {
            assert.deepEqual(pages({ currentPage: 1, totalPages: 10, numPagesToShow: 5, showFL: true }), [1, 2, 3, 4, 5, 6, 10]);
        });

        test('it does not duplicate the last page when already at the end', function (assert) {
            assert.deepEqual(pages({ currentPage: 10, totalPages: 10, numPagesToShow: 5, showFL: true }), [1, 5, 6, 7, 8, 9, 10]);
        });

        test('it anchors a window in the middle of a long range', function (assert) {
            assert.deepEqual(pages({ currentPage: 6, totalPages: 20, numPagesToShow: 5, showFL: true }), [1, 4, 5, 6, 7, 8, 20]);
        });

        test('a small window still keeps both anchors', function (assert) {
            assert.deepEqual(pages({ currentPage: 7, totalPages: 10, numPagesToShow: 3, showFL: true }), [1, 6, 7, 8, 10]);
        });
    });

    module('degenerate input', function () {
        test('the current page is always included even when it is out of range', function (assert) {
            assert.deepEqual(pages({ currentPage: 1, totalPages: 0, numPagesToShow: 5, showFL: false }), [1], 'zero total pages still reports the current page');
        });

        test('missing properties are treated as zero', function (assert) {
            assert.deepEqual(pages({}), [0], 'getInt falls back to 0 for absent properties');
        });

        test('numeric strings are parsed like numbers', function (assert) {
            assert.deepEqual(pages({ currentPage: '5', totalPages: '10', numPagesToShow: '5', showFL: false }), [3, 4, 5, 6, 7]);
        });
    });

    test('pagesToShow recomputes when its inputs change', function (assert) {
        const subject = PaginationTruncatePages.create({ currentPage: 1, totalPages: 10, numPagesToShow: 5, showFL: false });

        assert.deepEqual([...subject.pagesToShow], [1, 2, 3, 4, 5]);

        subject.set('currentPage', 5);
        assert.deepEqual([...subject.pagesToShow], [3, 4, 5, 6, 7], 'moving the current page slides the window');

        subject.set('numPagesToShow', 3);
        assert.deepEqual([...subject.pagesToShow], [4, 5, 6], 'shrinking the window narrows the result');

        subject.set('showFL', true);
        assert.deepEqual([...subject.pagesToShow], [1, 4, 5, 6, 10], 'enabling first/last adds the anchors');
    });

    test('repeated reads return an equal, stable result', function (assert) {
        const subject = PaginationTruncatePages.create({ currentPage: 5, totalPages: 10, numPagesToShow: 5, showFL: false });
        const first = subject.pagesToShow;
        const second = subject.pagesToShow;

        assert.deepEqual([...first], [3, 4, 5, 6, 7]);
        assert.strictEqual(second, first, 'the computed property is cached between reads');
    });

    test('instances do not share computed state', function (assert) {
        const a = PaginationTruncatePages.create({ currentPage: 1, totalPages: 10, numPagesToShow: 5, showFL: false });
        const b = PaginationTruncatePages.create({ currentPage: 9, totalPages: 10, numPagesToShow: 5, showFL: false });

        assert.deepEqual([...a.pagesToShow], [1, 2, 3, 4, 5]);
        assert.deepEqual([...b.pagesToShow], [6, 7, 8, 9, 10]);
    });
    // With the window centred at page 3 it already spans 1..5, so the showFL pass must NOT
    // prepend a second page one.
    test('the first page is not prepended when the window already starts there', function (assert) {
        const shown = pages({ currentPage: 3, totalPages: 10, numPagesToShow: 5, showFL: true });

        assert.strictEqual(shown[0], 1, 'page one leads the list');
        assert.strictEqual(shown.filter((page) => page === 1).length, 1, 'and appears exactly once rather than being prepended again');
    });
});
