import { module, test } from 'qunit';
import { setupTest } from 'dummy/tests/helpers';
import { getOwner } from '@ember/application';
import REGISTRY, { findBySlug, categories } from 'dummy/playground/registry';
import { DOCUMENTED_COMPONENTS, slugFor } from 'dummy/playground/allowlist';
import { validateControl } from 'dummy/playground/controls';

/**
 * Scope completeness, both directions: every allowlisted documented component has a registry
 * entry, and every registry entry is allowlisted. Deliberately never compared against the full
 * `app/components` inventory — that is the comparison the playground exists to avoid.
 */
module('Unit | playground | registry', function (hooks) {
    setupTest(hooks);

    module('scope completeness', function () {
        test('every documented component has a registry entry', function (assert) {
            const slugs = new Set(REGISTRY.map((entry) => entry.slug));
            const missing = DOCUMENTED_COMPONENTS.filter((documented) => !slugs.has(slugFor(documented.path)));

            assert.deepEqual(
                missing.map((entry) => entry.path),
                [],
                'no documented component is left without a playground page'
            );
        });

        test('every registry entry is an allowlisted documented component', function (assert) {
            const documented = new Set(DOCUMENTED_COMPONENTS.map((entry) => slugFor(entry.path)));
            const extra = REGISTRY.filter((entry) => !documented.has(entry.slug));

            assert.deepEqual(
                extra.map((entry) => entry.slug),
                [],
                'the registry does not exceed the documented scope'
            );
        });

        test('the counts agree', function (assert) {
            assert.strictEqual(REGISTRY.length, DOCUMENTED_COMPONENTS.length, 'registry and allowlist are the same size');
            assert.strictEqual(REGISTRY.length, 63, '63 documented components are represented');
        });
    });

    module('entry integrity', function () {
        test('slugs are unique', function (assert) {
            const slugs = REGISTRY.map((entry) => entry.slug);

            assert.strictEqual(new Set(slugs).size, slugs.length, 'no slug is duplicated');
        });

        test('required metadata is present on every entry', function (assert) {
            const required = ['slug', 'name', 'category', 'description', 'docsUrl', 'component', 'sourcePath', 'testPaths', 'example'];
            const incomplete = REGISTRY.filter((entry) => required.some((key) => !entry[key] || (Array.isArray(entry[key]) && entry[key].length === 0)));

            assert.deepEqual(
                incomplete.map((entry) => entry.slug),
                [],
                'every entry carries the metadata the component page renders'
            );
        });

        test('public component identifiers are derived from the resolution path', function (assert) {
            assert.strictEqual(findBySlug('layout-resource-tabular').component, 'Layout::Resource::Tabular');
            assert.strictEqual(findBySlug('attach-tooltip').component, 'Attach::Tooltip');
            assert.strictEqual(findBySlug('modal-layouts-option-prompt').component, 'Modal::Layouts::OptionPrompt');
            assert.strictEqual(findBySlug('registry-yield').component, 'RegistryYield');
        });

        test('every entry points at a component that actually resolves', function (assert) {
            const owner = getOwner(this);
            const unresolvable = REGISTRY.filter((entry) => !owner.factoryFor(`component:${entry.path}`));

            assert.deepEqual(
                unresolvable.map((entry) => entry.path),
                [],
                'no documented component points at a missing source component'
            );
        });

        test('every example adapter resolves', function (assert) {
            const owner = getOwner(this);
            const unresolvable = REGISTRY.filter((entry) => !owner.factoryFor(`component:${entry.example}`));

            assert.deepEqual(
                unresolvable.map((entry) => entry.example),
                [],
                'every registry entry has a rendering adapter'
            );
        });

        test('categories come from the documentation navigation', function (assert) {
            assert.deepEqual(categories(), [
                'Layout & Structure',
                'Navigation',
                'Buttons & Actions',
                'Forms & Inputs',
                'Data Display',
                'Calendars & Boards',
                'Modals',
                'Dashboard',
                'Builders',
                'Registry & Slots',
            ]);
        });

        test('findBySlug returns null for anything not documented', function (assert) {
            assert.strictEqual(findBySlug('aside-item-scroller'), null, 'an undocumented public component does not resolve');
            assert.strictEqual(findBySlug('not-a-component'), null);
        });
    });

    module('control metadata', function () {
        test('every control on every entry is valid', function (assert) {
            const problems = [];

            for (const entry of REGISTRY) {
                for (const definition of entry.controls) {
                    const found = validateControl(definition);

                    if (found.length > 0) {
                        problems.push(`${entry.slug}.${definition.key}: ${found.join('; ')}`);
                    }
                }
            }

            assert.deepEqual(problems, [], 'no control is malformed');
        });

        test('control keys are unique within an entry', function (assert) {
            const clashes = REGISTRY.filter((entry) => {
                const keys = entry.controls.map((definition) => definition.key);

                return new Set(keys).size !== keys.length;
            });

            assert.deepEqual(
                clashes.map((entry) => entry.slug),
                [],
                'no entry declares the same control twice'
            );
        });

        test('scenario ids are unique within an entry', function (assert) {
            const clashes = REGISTRY.filter((entry) => {
                const ids = entry.scenarios.map((scenario) => scenario.id);

                return new Set(ids).size !== ids.length;
            });

            assert.deepEqual(
                clashes.map((entry) => entry.slug),
                [],
                'no entry declares the same scenario twice'
            );
        });

        test('preset scenarios only set controls that exist', function (assert) {
            const problems = [];

            for (const entry of REGISTRY) {
                const keys = new Set(entry.controls.map((definition) => definition.key));

                for (const scenario of entry.scenarios) {
                    for (const key of Object.keys(scenario.values ?? {})) {
                        if (!keys.has(key)) {
                            problems.push(`${entry.slug}/${scenario.id} sets unknown control "${key}"`);
                        }
                    }
                }
            }

            assert.deepEqual(problems, [], 'no preset writes a control the entry does not declare');
        });
    });
});
