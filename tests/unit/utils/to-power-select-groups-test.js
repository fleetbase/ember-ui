import toPowerSelectGroups from '@fleetbase/ember-ui/utils/to-power-select-groups';
import { module, test } from 'qunit';

const LABEL_MAP = { a: 'Alpha', b: 'Bravo', c: 'Charlie' };

function groupNames(groups) {
    return groups.map((group) => group.groupName);
}

function labelsIn(groups, index) {
    return groups[index].options.map((option) => option.label);
}

module('Unit | Utility | to-power-select-groups', function () {
    test('it returns an empty array for empty or non-array input', function (assert) {
        assert.deepEqual(toPowerSelectGroups([]), []);
        assert.deepEqual(toPowerSelectGroups(null), []);
        assert.deepEqual(toPowerSelectGroups(undefined), []);
        assert.deepEqual(toPowerSelectGroups('not an array'), [], 'string characters are never objects, so nothing groups');
        assert.deepEqual(toPowerSelectGroups({ a: 1 }), []);
        assert.deepEqual(toPowerSelectGroups(0), []);
    });

    test('it buckets items by their group key', function (assert) {
        const groups = toPowerSelectGroups(
            [
                { label: 'One', value: 1, group: 'a' },
                { label: 'Two', value: 2, group: 'b' },
                { label: 'Three', value: 3, group: 'a' },
            ],
            { groupLabelMap: LABEL_MAP }
        );

        assert.strictEqual(groups.length, 2, 'one bucket per distinct group');
        assert.deepEqual(groupNames(groups), ['Alpha', 'Bravo']);
        assert.deepEqual(labelsIn(groups, 0), ['One', 'Three']);
        assert.deepEqual(labelsIn(groups, 1), ['Two']);
        assert.deepEqual(Object.keys(groups[0]), ['groupName', 'options'], 'each group exposes exactly groupName and options');
    });

    test('it humanizes the group key when no label map entry exists', function (assert) {
        const groups = toPowerSelectGroups(
            [
                { label: 'One', group: 'fleet_ops' },
                { label: 'Two', group: 'apiKeys' },
            ],
            { groupSort: false }
        );

        assert.deepEqual(groupNames(groups), ['Fleet Ops', 'API Keys'], 'keys are smart-humanized');
    });

    test('the label map takes precedence over humanization', function (assert) {
        const groups = toPowerSelectGroups([{ label: 'One', group: 'fleet_ops' }], { groupLabelMap: { fleet_ops: 'Fleet Operations' } });

        assert.deepEqual(groupNames(groups), ['Fleet Operations']);
    });

    test('items with a missing, blank or non-string group fall into the fallback group', function (assert) {
        const groups = toPowerSelectGroups([{ label: 'A' }, { label: 'B', group: '   ' }, { label: 'C', group: null }, { label: 'D', group: 42 }]);

        assert.deepEqual(groupNames(groups), ['Other'], 'all four collapse into one bucket');
        assert.deepEqual(labelsIn(groups, 0), ['A', 'B', 'C', 'D']);
    });

    test('the fallback group name is configurable', function (assert) {
        const groups = toPowerSelectGroups([{ label: 'A' }], { fallbackGroup: 'Ungrouped' });

        assert.deepEqual(groupNames(groups), ['Ungrouped']);
    });

    test('a custom groupKey is honored', function (assert) {
        const groups = toPowerSelectGroups(
            [
                { label: 'A', category: 'b' },
                { label: 'B', category: 'a' },
                { label: 'C', group: 'a' },
            ],
            {
                groupKey: 'category',
                groupLabelMap: LABEL_MAP,
            }
        );

        assert.deepEqual(groupNames(groups), ['Alpha', 'Bravo', 'Other'], 'grouping reads the configured key only');
        assert.deepEqual(labelsIn(groups, 0), ['B']);
        assert.deepEqual(labelsIn(groups, 1), ['A']);
        assert.deepEqual(labelsIn(groups, 2), ['C'], 'the item carrying only `group` falls back to Other');
    });

    test('groups sort ascending by header, case-insensitively, by default', function (assert) {
        const groups = toPowerSelectGroups(
            [
                { label: 'x', group: 'c' },
                { label: 'y', group: 'a' },
                { label: 'z', group: 'b' },
            ],
            { groupLabelMap: { a: 'beta', b: 'Alpha', c: 'Zulu' } }
        );

        assert.deepEqual(groupNames(groups), ['Alpha', 'beta', 'Zulu'], 'lowercase comparison keeps beta before Zulu');
    });

    test('groupSort desc reverses the header order and false preserves insertion order', function (assert) {
        const items = [
            { label: 'x', group: 'c' },
            { label: 'y', group: 'a' },
            { label: 'z', group: 'b' },
        ];

        assert.deepEqual(groupNames(toPowerSelectGroups(items, { groupLabelMap: LABEL_MAP, groupSort: 'desc' })), ['Charlie', 'Bravo', 'Alpha']);
        assert.deepEqual(groupNames(toPowerSelectGroups(items, { groupLabelMap: LABEL_MAP, groupSort: false })), ['Charlie', 'Alpha', 'Bravo'], 'insertion order is first-seen order');
    });

    test('options sort ascending by label by default', function (assert) {
        const groups = toPowerSelectGroups(
            [
                { label: 'zebra', group: 'a' },
                { label: 'Apple', group: 'a' },
                { label: 'mango', group: 'a' },
            ],
            { groupLabelMap: LABEL_MAP }
        );

        assert.deepEqual(labelsIn(groups, 0), ['Apple', 'mango', 'zebra'], 'case-insensitive ascending');
    });

    test('optionSort desc reverses option order and false preserves it', function (assert) {
        const items = [
            { label: 'zebra', group: 'a' },
            { label: 'Apple', group: 'a' },
            { label: 'mango', group: 'a' },
        ];

        assert.deepEqual(labelsIn(toPowerSelectGroups(items, { groupLabelMap: LABEL_MAP, optionSort: 'desc' }), 0), ['zebra', 'mango', 'Apple']);
        assert.deepEqual(labelsIn(toPowerSelectGroups(items, { groupLabelMap: LABEL_MAP, optionSort: false }), 0), ['zebra', 'Apple', 'mango']);
    });

    test('option sorting falls back to value when a label is missing', function (assert) {
        const groups = toPowerSelectGroups(
            [
                { value: 'ccc', group: 'a' },
                { value: 'aaa', group: 'a' },
                { label: 'bbb', value: 'zzz', group: 'a' },
            ],
            { groupLabelMap: LABEL_MAP }
        );

        assert.deepEqual(
            groups[0].options.map((option) => option.label ?? option.value),
            ['aaa', 'bbb', 'ccc']
        );
    });

    test('options with neither label nor value sort first as empty strings', function (assert) {
        const groups = toPowerSelectGroups(
            [
                { label: 'b', group: 'a' },
                { group: 'a', other: 1 },
            ],
            { groupLabelMap: LABEL_MAP }
        );

        assert.strictEqual(groups[0].options[0].other, 1, 'the label-less option compares as an empty string');
        assert.strictEqual(groups[0].options[1].label, 'b');
    });

    test('non-object entries are skipped', function (assert) {
        const groups = toPowerSelectGroups([null, undefined, 'string', 42, false, { label: 'Kept', group: 'a' }], { groupLabelMap: LABEL_MAP });

        assert.strictEqual(groups.length, 1);
        assert.deepEqual(labelsIn(groups, 0), ['Kept'], 'only real objects survive');
    });

    test('every item being skipped yields no groups', function (assert) {
        assert.deepEqual(toPowerSelectGroups([null, undefined, 5]), []);
    });

    test('it shallow-copies items and never mutates the input array', function (assert) {
        const item = { label: 'One', value: 1, group: 'a', meta: { nested: true } };
        const items = [item];
        const groups = toPowerSelectGroups(items, { groupLabelMap: LABEL_MAP });
        const emitted = groups[0].options[0];

        assert.notStrictEqual(emitted, item, 'a copy is emitted');
        assert.deepEqual(emitted, item, 'with the same own properties, including the group key');
        assert.strictEqual(emitted.meta, item.meta, 'nested values are shared by reference (shallow copy)');

        emitted.label = 'Changed';

        assert.strictEqual(item.label, 'One', 'mutating the copy leaves the source item alone');
        assert.deepEqual(items, [item], 'the input array is unchanged');
        assert.strictEqual(items.length, 1);
    });

    test('distinct keys that humanize to the same header share one bucket', function (assert) {
        const groups = toPowerSelectGroups(
            [
                { label: 'A', group: 'x' },
                { label: 'B', group: 'y' },
            ],
            { groupLabelMap: { x: 'Same', y: 'Same' } }
        );

        assert.strictEqual(groups.length, 1, 'buckets are keyed by display name');
        assert.deepEqual(labelsIn(groups, 0), ['A', 'B']);
    });

    test('repeated invocations produce equivalent but independent results', function (assert) {
        const items = [
            { label: 'One', group: 'a' },
            { label: 'Two', group: 'b' },
        ];
        const first = toPowerSelectGroups(items, { groupLabelMap: LABEL_MAP });
        const second = toPowerSelectGroups(items, { groupLabelMap: LABEL_MAP });

        assert.deepEqual(second, first, 'same shape');
        assert.notStrictEqual(second, first, 'but a different array');
        assert.notStrictEqual(second[0].options[0], first[0].options[0], 'and different option copies');
    });
    module('sorting edge cases', function () {
        // The input is deliberately reverse-alphabetical so the comparator is asked to judge a
        // pair where the first name sorts AFTER the second — the other half of its two returns.
        test('groups sort descending when asked', function (assert) {
            const groups = toPowerSelectGroups(
                [
                    { label: 'Z', value: 'z', group: 'zulu' },
                    { label: 'A', value: 'a', group: 'alpha' },
                ],
                { groupSort: 'desc' }
            );

            assert.deepEqual(
                groups.map((group) => group.groupName),
                ['Zulu', 'Alpha'],
                'the comparator runs in both directions'
            );
        });

        test('options sort descending within a group', function (assert) {
            const [group] = toPowerSelectGroups(
                [
                    { label: 'Cherry', value: 'c', group: 'fruit' },
                    { label: 'Apple', value: 'a', group: 'fruit' },
                ],
                { optionSort: 'desc' }
            );

            assert.deepEqual(
                group.options.map((option) => option.label),
                ['Cherry', 'Apple']
            );
        });

        test('an option with no label falls back to its value, then to nothing', function (assert) {
            // The labelless, valueless option leads the input so the comparator sees it as its
            // FIRST argument and has to fall all the way through to the empty string.
            const [group] = toPowerSelectGroups([{ group: 'g' }, { value: 'zebra', group: 'g' }, { label: 'Apple', value: 'a', group: 'g' }], {
                optionSort: 'asc',
            });

            assert.deepEqual(
                group.options.map((option) => option.label ?? option.value ?? ''),
                ['', 'Apple', 'zebra'],
                'the labelless option sorts first because it compares as an empty string'
            );
        });
    });
});
