import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled, findAll } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';

const COMPANY = { id: 'cmp_1' };

function subjectFixture(model, overrides = {}) {
    return { model, type: `${model}-type`, label: model, ...overrides };
}

// A stand-in for an Ember Data record: enough of set/save/destroyRecord for the manager.
function recordFixture(attrs = {}) {
    return {
        ...attrs,
        set(key, value) {
            this[key] = value;
        },
        save() {
            this.saved = (this.saved ?? 0) + 1;
            return Promise.resolve(this);
        },
        destroyRecord() {
            this.destroyed = true;
            return Promise.resolve(this);
        },
    };
}

function buttonWithIcon(scope, iconName) {
    return findAll(`${scope} button`).find((button) => button.querySelector(`[data-icon="${iconName}"]`));
}

function buttonWithText(text) {
    return findAll('button').find((button) => button.textContent.trim().includes(text));
}

module('Integration | Component | custom-fields-manager', function (hooks) {
    setupRenderingTest(hooks);

    let store;
    let modals;
    let registry;
    let notifications;
    let loadedGroups;
    let loadShouldFail;

    hooks.beforeEach(function () {
        loadedGroups = [];
        loadShouldFail = false;

        store = { created: [] };
        modals = { shown: [], confirmed: [] };
        registry = { edited: [], loads: [], cacheLookups: [] };
        notifications = { serverErrors: [] };

        this.owner.unregister('service:store');
        this.owner.register(
            'service:store',
            class extends Service {
                createRecord(modelName, attrs) {
                    const record = recordFixture({ ...attrs, modelName });
                    store.created.push({ modelName, attrs, record });
                    return record;
                }
            }
        );

        this.owner.unregister('service:currentUser');
        this.owner.register(
            'service:currentUser',
            class extends Service {
                companyId = COMPANY.id;
                loadCompany() {
                    return Promise.resolve(COMPANY);
                }
            }
        );

        this.owner.unregister('service:notifications');
        this.owner.register(
            'service:notifications',
            class extends Service {
                serverError(error) {
                    notifications.serverErrors.push(error);
                }
            }
        );

        this.owner.unregister('service:modalsManager');
        this.owner.register(
            'service:modalsManager',
            class extends Service {
                show(name, options) {
                    modals.shown.push({ name, options });
                }
                confirm(options) {
                    modals.confirmed.push(options);
                }
            }
        );

        this.owner.unregister('service:customFieldsRegistry');
        this.owner.register(
            'service:customFieldsRegistry',
            class extends Service {
                panel = {
                    edit: (customField) => registry.edited.push(customField),
                };
                loadSubjectCustomFields = {
                    perform: (company, options) => {
                        registry.loads.push({ company, options });
                        if (loadShouldFail) {
                            return Promise.reject(new Error('load failed'));
                        }
                        return Promise.resolve({ customFieldGroups: loadedGroups });
                    },
                };
                // The real service never returns nothing: on a cache miss it builds an empty
                // manager. Whether anything was cached is decided by the groups it carries.
                forSubject(company, options) {
                    registry.cacheLookups.push({ company, options });
                    return { customFieldGroups: [] };
                }
            }
        );

        this.owner.unregister('service:abilities');
        this.owner.register(
            'service:abilities',
            class extends Service {
                cannot() {
                    return false;
                }
                can() {
                    return true;
                }
            }
        );

        this.set('subjects', [subjectFixture('order'), subjectFixture('driver')]);
    });

    const TEMPLATE = hbs`<CustomFieldsManager @subjects={{this.subjects}} @title={{this.title}} />`;

    module('rendering', function () {
        test('it renders a default title and a tab per subject', async function (assert) {
            await render(TEMPLATE);

            assert.dom(this.element).containsText('Custom Fields Manager');
            assert.strictEqual(findAll('.subject-custom-fields').length, 2, 'one panel per subject');
        });

        test('the title can be overridden', async function (assert) {
            this.set('title', 'Order metadata');

            await render(TEMPLATE);

            assert.dom(this.element).containsText('Order metadata');
        });

        test('with no subjects it renders nothing to manage', async function (assert) {
            this.set('subjects', []);

            await render(TEMPLATE);

            assert.strictEqual(findAll('.subject-custom-fields').length, 0);
            assert.deepEqual(registry.loads, [], 'nothing is loaded');
        });

        test('a subject with no groups explains what to do', async function (assert) {
            await render(TEMPLATE);

            assert.dom(this.element).containsText('No custom field groups');
            assert.dom(this.element).containsText('Add your first field group to start adding custom fields for orders', 'the subject label is pluralised');
        });

        test('the first subject is loaded as soon as the manager renders', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(registry.loads.length, 1, 'only the first subject is loaded');
            assert.strictEqual(registry.loads[0].company, COMPANY);
            assert.deepEqual(registry.loads[0].options.loadOptions, {
                groupedFor: 'order_custom_field_group',
                fieldFor: 'order-type',
            });
        });

        test('a multi-word model name is underscored for the group lookup', async function (assert) {
            this.set('subjects', [subjectFixture('fuelReport')]);

            await render(TEMPLATE);

            assert.strictEqual(registry.loads[0].options.loadOptions.groupedFor, 'fuel_report_custom_field_group');
        });

        test('a failed load is reported', async function (assert) {
            loadShouldFail = true;

            await render(TEMPLATE);

            assert.strictEqual(notifications.serverErrors.length, 1, 'the failure is surfaced to the user');
        });
    });

    module('with loaded groups', function (hooks) {
        hooks.beforeEach(function () {
            loadedGroups = [
                recordFixture({
                    id: 'grp_1',
                    name: 'Delivery details',
                    meta: { grid_size: 2 },
                    customFields: [
                        { id: 'cf_1', label: 'Gate code', type: 'text' },
                        { id: 'cf_2', label: 'Fragile', type: 'boolean' },
                    ],
                }),
            ];
        });

        test('each group and its fields are rendered', async function (assert) {
            await render(TEMPLATE);

            assert.dom(this.element).containsText('Delivery details');
            assert.deepEqual(
                findAll('.custom-field-custom-field-type-pill').map((node) => node.textContent.trim()),
                ['text', 'boolean']
            );
            assert.dom(this.element).containsText('Gate code');
        });

        test('the grid size button reflects the stored size', async function (assert) {
            await render(TEMPLATE);

            assert.dom(this.element).containsText('Grid Size : 2');
        });

        test('a group with no stored grid size defaults to one', async function (assert) {
            loadedGroups = [recordFixture({ id: 'grp_1', name: 'Delivery details', customFields: [] })];

            await render(TEMPLATE);

            assert.dom(this.element).containsText('Grid Size : 1');
        });

        test('choosing a grid size stores it on the group and saves', async function (assert) {
            await render(TEMPLATE);
            await click('.ember-basic-dropdown-trigger');
            await click(findAll('.next-dd-item')[2]);

            const group = loadedGroups[0];
            assert.strictEqual(group.meta.grid_size, 3);
            assert.strictEqual(group.saved, 1, 'the change is persisted');
        });

        test('a group with no meta object gets one before the size is stored', async function (assert) {
            loadedGroups = [recordFixture({ id: 'grp_1', name: 'Delivery details', customFields: [], meta: null })];

            await render(TEMPLATE);
            await click('.ember-basic-dropdown-trigger');
            await click(findAll('.next-dd-item')[1]);

            assert.deepEqual(loadedGroups[0].meta, { grid_size: 2 });
        });

        test('a failed grid size save is reported', async function (assert) {
            loadedGroups[0].save = () => Promise.reject(new Error('save failed'));

            await render(TEMPLATE);
            await click('.ember-basic-dropdown-trigger');
            await click(findAll('.next-dd-item')[0]);

            assert.strictEqual(notifications.serverErrors.length, 1);
        });

        test('editing a custom field opens it in the registry panel', async function (assert) {
            await render(TEMPLATE);
            await click(buttonWithIcon('.grid', 'pencil'));

            assert.deepEqual(registry.edited, [loadedGroups[0].customFields[0]]);
        });

        test('creating a custom field adds it to the group and opens it', async function (assert) {
            await render(TEMPLATE);
            await click(buttonWithText('Create new custom field'));

            const created = store.created.find((entry) => entry.modelName === 'custom-field');
            assert.ok(created, 'a custom-field record is created');
            assert.strictEqual(created.attrs.label, 'Untitled Field');
            assert.strictEqual(created.attrs.category_uuid, 'grp_1');
            assert.strictEqual(created.attrs.for, 'order-type');
            assert.strictEqual(created.attrs.subject_uuid, COMPANY.id);

            assert.strictEqual(loadedGroups[0].customFields.length, 3, 'it joins the group');
            assert.deepEqual(registry.edited, [created.record], 'and is opened for editing');
        });

        test('a group with no field list still accepts a new field', async function (assert) {
            loadedGroups = [recordFixture({ id: 'grp_1', name: 'Delivery details', customFields: undefined })];

            await render(TEMPLATE);
            await click(buttonWithText('Create new custom field'));

            assert.strictEqual(loadedGroups[0].customFields.length, 1);
        });
    });

    module('creating a group', function () {
        test('it opens a form modal seeded with a new category record', async function (assert) {
            await render(TEMPLATE);
            await click(buttonWithText('New field group'));

            assert.strictEqual(modals.shown.length, 1);
            const { name, options } = modals.shown[0];
            assert.strictEqual(name, 'modals/custom-field-group-form');
            assert.strictEqual(options.title, 'New custom field group');

            const created = store.created.find((entry) => entry.modelName === 'category');
            assert.strictEqual(created.attrs.owner_uuid, COMPANY.id);
            assert.strictEqual(created.attrs.owner_type, 'company');
            assert.strictEqual(created.attrs.for, 'order_custom_field_group');
            assert.strictEqual(options.customFieldGroup, created.record);
        });

        test('confirming with a name saves the group and shows it', async function (assert) {
            await render(TEMPLATE);
            await click(buttonWithText('New field group'));

            const { options } = modals.shown[0];
            options.customFieldGroup.name = 'Delivery details';

            const modal = {
                started: 0,
                finished: 0,
                stopped: 0,
                startLoading() {
                    this.started++;
                },
                done() {
                    this.finished++;
                },
                stopLoading() {
                    this.stopped++;
                },
            };
            await options.confirm(modal);
            await settled();

            assert.strictEqual(options.customFieldGroup.saved, 1, 'the group is saved');
            assert.strictEqual(modal.started, 1, 'the modal shows progress while saving');
            assert.strictEqual(modal.finished, 1, 'and closes on success');
            assert.dom(this.element).containsText('Delivery details', 'and appears in the list');
        });

        test('confirming without a name does nothing', async function (assert) {
            await render(TEMPLATE);
            await click(buttonWithText('New field group'));

            const { options } = modals.shown[0];
            let started = 0;
            await options.confirm({ startLoading: () => started++, done() {}, stopLoading() {} });

            assert.strictEqual(started, 0, 'the modal never even starts loading');
            assert.strictEqual(options.customFieldGroup.saved, undefined, 'nothing is saved');
        });

        test('a failed save is reported and the modal is released', async function (assert) {
            await render(TEMPLATE);
            await click(buttonWithText('New field group'));

            const { options } = modals.shown[0];
            options.customFieldGroup.name = 'Delivery details';
            options.customFieldGroup.save = () => Promise.reject(new Error('save failed'));

            let stopped = 0;
            await options.confirm({ startLoading() {}, done() {}, stopLoading: () => stopped++ });

            assert.strictEqual(notifications.serverErrors.length, 1);
            assert.strictEqual(stopped, 1, 'the modal stops loading so the user can retry');
        });
    });

    module('deleting', function (hooks) {
        hooks.beforeEach(function () {
            loadedGroups = [recordFixture({ id: 'grp_1', name: 'Delivery details', customFields: [{ id: 'cf_1', label: 'Gate code', type: 'text' }] })];
        });

        test('deleting a group asks for confirmation first', async function (assert) {
            await render(TEMPLATE);
            await click(buttonWithIcon('.flex.flex-row.items-center.space-x-2', 'trash'));

            assert.strictEqual(modals.confirmed.length, 1);
            assert.strictEqual(modals.confirmed[0].title, 'Delete this field group?');
            assert.strictEqual(modals.confirmed[0].acceptButtonType, 'danger');
        });

        test('confirming a group deletion destroys it and reloads', async function (assert) {
            await render(TEMPLATE);
            await click(buttonWithIcon('.flex.flex-row.items-center.space-x-2', 'trash'));

            const loadsBefore = registry.loads.length;
            await modals.confirmed[0].confirm({ startLoading() {}, done() {}, stopLoading() {} });

            assert.true(loadedGroups[0].destroyed);
            assert.true(registry.loads.length > loadsBefore, 'the subject is reloaded');
        });

        test('a failed group deletion is reported', async function (assert) {
            loadedGroups[0].destroyRecord = () => Promise.reject(new Error('nope'));

            await render(TEMPLATE);
            await click(buttonWithIcon('.flex.flex-row.items-center.space-x-2', 'trash'));

            let stopped = 0;
            await modals.confirmed[0].confirm({ startLoading() {}, done() {}, stopLoading: () => stopped++ });

            assert.strictEqual(notifications.serverErrors.length, 1);
            assert.strictEqual(stopped, 1);
        });

        test('deleting a custom field asks for confirmation and then destroys it', async function (assert) {
            const customField = recordFixture({ id: 'cf_1', label: 'Gate code', type: 'text' });
            loadedGroups = [recordFixture({ id: 'grp_1', name: 'Delivery details', customFields: [customField] })];

            await render(TEMPLATE);
            await click(buttonWithIcon('.grid', 'trash'));

            assert.strictEqual(modals.confirmed.length, 1);
            assert.strictEqual(modals.confirmed[0].title, 'Delete this custom field?');

            await modals.confirmed[0].confirm({ startLoading() {}, done() {}, stopLoading() {} });

            assert.true(customField.destroyed);
        });

        test('a failed custom field deletion is reported', async function (assert) {
            const customField = recordFixture({ id: 'cf_1', label: 'Gate code', type: 'text' });
            customField.destroyRecord = () => Promise.reject(new Error('nope'));
            loadedGroups = [recordFixture({ id: 'grp_1', name: 'Delivery details', customFields: [customField] })];

            await render(TEMPLATE);
            await click(buttonWithIcon('.grid', 'trash'));

            let stopped = 0;
            await modals.confirmed[0].confirm({ startLoading() {}, done() {}, stopLoading: () => stopped++ });

            assert.strictEqual(notifications.serverErrors.length, 1);
            assert.strictEqual(stopped, 1);
        });
    });

    test('switching tabs loads that subject', async function (assert) {
        await render(TEMPLATE);
        assert.strictEqual(registry.loads.length, 1, 'only the first subject is loaded initially');

        const driverTab = findAll('.ui-tab, [role="tab"]').find((tab) => tab.textContent.trim().includes('driver'));
        assert.ok(driverTab, 'the second subject has a tab');

        await click(driverTab);

        assert.strictEqual(registry.loads.length, 2, 'the newly selected subject is loaded');
        assert.strictEqual(registry.loads[1].options.loadOptions.groupedFor, 'driver_custom_field_group');
    });

    // Only the first subject is fetched on insert; the rest are re-attached from whatever the
    // registry already holds, so navigating away and back does not refetch them.
    module('restoring the other tabs from the registry cache', function () {
        function cacheReturning(context, value) {
            const service = context.owner.lookup('service:customFieldsRegistry');
            const asked = [];
            service.forSubject = (company, options) => {
                asked.push({ company, options });

                return typeof value === 'function' ? value() : value;
            };

            return asked;
        }

        test('a cached subject is restored without a second fetch', async function (assert) {
            const asked = cacheReturning(this, {
                customFieldGroups: [recordFixture({ id: 'grp_cached', name: 'Cached driver details', customFields: [{ id: 'cf_9', label: 'Licence', type: 'text' }] })],
            });

            await render(TEMPLATE);

            assert.strictEqual(asked.length, 1, 'only the subjects after the first are asked about');
            assert.strictEqual(asked[0].options.loadOptions.groupedFor, 'driver_custom_field_group');
            assert.strictEqual(registry.loads.length, 1, 'the cached subject is not fetched again');
            assert.dom(this.element).containsText('Cached driver details', 'the cached groups are attached to the tab');
        });

        test('a cache entry holding no groups leaves the subject alone', async function (assert) {
            cacheReturning(this, { customFieldGroups: [] });

            await render(TEMPLATE);

            assert.strictEqual(registry.loads.length, 1, 'nothing else is fetched');
            assert.notOk(this.element.textContent.includes('Cached'), 'and nothing is attached');
        });

        test('a company that will not load stops the restore before any lookup', async function (assert) {
            // Every lookup needs the company, so failing to load it once is worth reporting once
            // rather than per subject.
            this.owner.lookup('service:currentUser').loadCompany = () => Promise.reject(new Error('no company'));
            const asked = cacheReturning(this, { customFieldGroups: [] });

            await render(TEMPLATE);

            assert.deepEqual(asked, [], 'no subject is asked about');
            assert.dom(this.element).containsText('Custom Fields Manager', 'and the manager still renders');
        });

        test('a cache lookup that throws does not stop the manager rendering', async function (assert) {
            cacheReturning(this, () => {
                throw new Error('cache is corrupt');
            });

            await render(TEMPLATE);

            assert.dom(this.element).containsText('Custom Fields Manager', 'the failure is swallowed per subject');
            assert.strictEqual(findAll('.subject-custom-fields').length, 2, 'both tabs still render');
        });
    });

    test('switching to a tab that is already loaded does not refetch it', async function (assert) {
        this.owner.lookup('service:customFieldsRegistry').forSubject = () => ({
            customFieldGroups: [recordFixture({ id: 'grp_cached', name: 'Cached driver details', customFields: [] })],
        });

        await render(TEMPLATE);
        assert.strictEqual(registry.loads.length, 1, 'the cache covered the second subject');

        const driverTab = findAll('.ui-tab, [role="tab"]').find((tab) => tab.textContent.trim().includes('driver'));
        await click(driverTab);

        assert.strictEqual(registry.loads.length, 1, 'selecting it fetches nothing');
    });

    // The tab guard used to read `subject.groups.length`, which cannot tell "never fetched" apart
    // from "fetched, and this subject has no field groups" — so an empty subject was refetched on
    // every single tab selection.
    module('a subject with no field groups', function () {
        function tabFor(label) {
            return findAll('.ui-tab, [role="tab"]').find((tab) => tab.textContent.trim().includes(label));
        }

        test('it is fetched once, however often its tab is selected', async function (assert) {
            loadedGroups = [];

            await render(TEMPLATE);
            assert.strictEqual(registry.loads.length, 1, 'the first subject is loaded on insert');

            await click(tabFor('driver'));
            assert.strictEqual(registry.loads.length, 2, 'the second subject is fetched the first time');

            await click(tabFor('order'));
            await click(tabFor('driver'));
            await click(tabFor('order'));
            await click(tabFor('driver'));

            assert.strictEqual(registry.loads.length, 2, 'and never again, despite having no groups to show for it');
        });

        test('a failed fetch is retried the next time the tab is selected', async function (assert) {
            await render(TEMPLATE);

            loadShouldFail = true;
            await click(tabFor('driver'));
            assert.strictEqual(registry.loads.length, 2, 'the fetch was attempted');
            assert.strictEqual(notifications.serverErrors.length, 1, 'and reported');

            loadShouldFail = false;
            await click(tabFor('order'));
            await click(tabFor('driver'));

            assert.strictEqual(registry.loads.length, 3, 'a subject that failed to load is not treated as loaded');
        });
    });

    test('it renders without a subjects argument at all', async function (assert) {
        await render(hbs`<CustomFieldsManager />`);

        assert.dom(this.element).containsText('Custom Fields Manager');
        assert.deepEqual(registry.loads, []);
    });
});
