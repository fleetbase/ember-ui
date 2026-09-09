import { module, test } from 'qunit';
import { DOCUMENTED_COMPONENTS, CATEGORIES, REMOVED_FROM_ADDON_STILL_IN_DOCS, DOCS_ROOT, slugFor } from 'dummy/playground/allowlist';

/**
 * The allowlist is the playground's scope authority: it records the component surface documented
 * at fleetbase.io/docs/ui. These tests hold it to that job — they do NOT compare it against
 * `app/components`, because the addon exports far more than the documentation covers.
 */
module('Unit | playground | allowlist', function () {
    test('it covers the documented component surface', function (assert) {
        assert.strictEqual(DOCUMENTED_COMPONENTS.length, 63, 'the documented surface is 63 components');
    });

    test('every entry carries the metadata the playground needs', function (assert) {
        const incomplete = DOCUMENTED_COMPONENTS.filter((entry) => !entry.path || !entry.name || !entry.category || !entry.docsUrl);

        assert.deepEqual(incomplete, [], 'no entry is missing path, name, category or docsUrl');
    });

    test('every documentation URL points at the official documentation', function (assert) {
        const offsite = DOCUMENTED_COMPONENTS.filter((entry) => !entry.docsUrl.startsWith(`${DOCS_ROOT}/`));

        assert.deepEqual(offsite, [], `every docsUrl is under ${DOCS_ROOT}`);
    });

    test('resolution paths are paths, not display names', function (assert) {
        // `Layout::Resource::Tabular` resolves through `layout/resource/tabular`, not
        // `layout-resource-tabular` or `layoutResourceTabular`.
        const byName = Object.fromEntries(DOCUMENTED_COMPONENTS.map((entry) => [entry.name, entry.path]));

        assert.strictEqual(byName['Layout::Resource::Tabular'], 'layout/resource/tabular');
        assert.strictEqual(byName['Attach::Tooltip'], 'attach/tooltip');
        assert.strictEqual(byName['Modal::Layouts::Confirm'], 'modal/layouts/confirm');
        assert.strictEqual(byName['RegistryYield'], 'registry-yield');
    });

    test('no path is listed twice', function (assert) {
        const paths = DOCUMENTED_COMPONENTS.map((entry) => entry.path);

        assert.strictEqual(new Set(paths).size, paths.length, 'paths are unique');
    });

    test('slugs are unique and URL-safe', function (assert) {
        const slugs = DOCUMENTED_COMPONENTS.map((entry) => slugFor(entry.path));

        assert.strictEqual(new Set(slugs).size, slugs.length, 'slugs are unique');
        assert.deepEqual(
            slugs.filter((slug) => !/^[a-z0-9-]+$/.test(slug)),
            [],
            'slugs contain only lowercase letters, digits and hyphens'
        );
    });

    test('every category is one the documentation navigation uses', function (assert) {
        const unknown = DOCUMENTED_COMPONENTS.filter((entry) => !CATEGORIES.includes(entry.category));

        assert.deepEqual(unknown, [], 'no entry invents a category');
    });

    test('out-of-scope public components are absent', function (assert) {
        // Each of these is a real public export the documentation does not cover. Adding one here
        // would be adding scope the documentation does not authorise.
        const outOfScope = ['aside-item-scroller', 'chat-container', 'chat-tray', 'metadata-editor', 'autocomplete-input', 'bulk-search-dropdown'];
        const paths = DOCUMENTED_COMPONENTS.map((entry) => entry.path);
        const leaked = outOfScope.filter((path) => paths.includes(path));

        assert.deepEqual(leaked, [], 'no undocumented public component is allowlisted');
    });

    test('table cells and other internals are not allowlisted', function (assert) {
        const internal = DOCUMENTED_COMPONENTS.filter(
            (entry) => entry.path.startsWith('table/') || entry.path.startsWith('template-builder/') || entry.path.startsWith('report-builder/') || entry.path.startsWith('chat-tray/')
        );

        assert.deepEqual(internal, [], 'sub-components of documented components get no page of their own');
    });

    module('the ScheduleCalendar documentation mismatch', function () {
        test('ScheduleCalendar and ScheduleItemCard are deliberately absent', function (assert) {
            const names = DOCUMENTED_COMPONENTS.map((entry) => entry.name);

            // Both were deleted from the addon as confirmed dead code (commit e6a3903, PR #143),
            // but /docs/ui/scheduling/event-calendar still names ScheduleCalendar. The playground
            // documents what exists; the official documentation is what needs correcting.
            assert.notOk(names.includes('ScheduleCalendar'), 'ScheduleCalendar is not restored');
            assert.notOk(names.includes('ScheduleItemCard'), 'ScheduleItemCard is not restored');
        });

        test('the mismatch is recorded rather than silently dropped', function (assert) {
            assert.deepEqual(REMOVED_FROM_ADDON_STILL_IN_DOCS, ['ScheduleCalendar', 'ScheduleItemCard'], 'the discrepancy is stated in the allowlist itself');
        });

        test('EventCalendar is included', function (assert) {
            const names = DOCUMENTED_COMPONENTS.map((entry) => entry.name);

            assert.ok(names.includes('EventCalendar'), 'the component that does exist is covered');
        });
    });
});
