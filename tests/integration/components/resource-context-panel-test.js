import { module, test } from 'qunit';
import { setupRenderingTest } from 'dummy/tests/helpers';
import { render, click, settled, triggerKeyEvent, findAll, find, setupOnerror, resetOnerror } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import Service from '@ember/service';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';
import Model from '@ember-data/model';

module('Integration | Component | resource-context-panel', function (hooks) {
    setupRenderingTest(hooks);

    let panel;

    hooks.beforeEach(function () {
        panel = {
            overlays: [],
            activeTabs: {},
            closed: [],
            activeTabCalls: [],
            active: null,
        };

        this.owner.unregister('service:resourceContextPanel');
        this.owner.register(
            'service:resourceContextPanel',
            class extends Service {
                get overlays() {
                    return panel.overlays;
                }
                get activeTabs() {
                    return panel.activeTabs;
                }
                getActive() {
                    return panel.active;
                }
                close(id) {
                    panel.closed.push(id);
                }
                setActiveTab(overlayId, tabId) {
                    panel.activeTabCalls.push([overlayId, tabId]);
                }
            }
        );

        this.owner.unregister('service:notifications');
        this.owner.register(
            'service:notifications',
            class extends Service {
                successes = [];
                serverErrors = [];
                success(message) {
                    this.successes.push(message);
                }
                serverError(error) {
                    this.serverErrors.push(error);
                }
            }
        );

        this.owner.register('component:test-panel-content', setComponentTemplate(hbs`<div class="panel-content">{{@resource.name}}</div>`, templateOnly()));
        this.owner.register('component:test-panel-footer', setComponentTemplate(hbs`<div class="panel-footer">footer</div>`, templateOnly()));
        this.owner.register('component:test-tab-one', setComponentTemplate(hbs`<div class="tab-one">tab one body</div>`, templateOnly()));
    });

    hooks.afterEach(function () {
        resetOnerror();
    });

    const TEMPLATE = hbs`<ResourceContextPanel />`;

    function panels() {
        return findAll('.resource-context-panel-header');
    }

    module('rendering overlays', function () {
        test('with nothing open it renders nothing', async function (assert) {
            await render(TEMPLATE);

            assert.strictEqual(panels().length, 0);
            assert.dom('.resource-context-panel-backdrop').doesNotExist();
        });

        test('an overlay renders a panel titled after its resource', async function (assert) {
            panel.overlays = [{ id: 'ov_1', resource: { name: 'Order 123' } }];

            await render(TEMPLATE);

            assert.strictEqual(panels().length, 1);
            assert.dom(this.element).containsText('Order 123');
        });

        test('an explicit title wins over the resource name', async function (assert) {
            panel.overlays = [{ id: 'ov_1', title: 'Custom title', resource: { name: 'Order 123' } }];

            await render(TEMPLATE);

            assert.dom(this.element).containsText('Custom title');
            assert.dom(this.element).doesNotContainText('Order 123');
        });

        test('a resource exposing only displayName is still titled', async function (assert) {
            panel.overlays = [{ id: 'ov_1', resource: { displayName: 'Driver Alex' } }];

            await render(TEMPLATE);

            assert.dom(this.element).containsText('Driver Alex');
        });

        test('several overlays render several panels', async function (assert) {
            panel.overlays = [
                { id: 'ov_1', title: 'First' },
                { id: 'ov_2', title: 'Second' },
            ];

            await render(TEMPLATE);

            assert.strictEqual(panels().length, 2);
        });
    });

    module('sizing', function () {
        const CASES = [
            ['xxs', '400px'],
            ['xs', '500px'],
            ['sm', '550px'],
            ['md', '600px'],
            ['lg', '800px'],
            ['xl', '1000px'],
            // set-width passes viewport units straight through to CSS.
            ['fullscreen', '100vw'],
        ];

        for (const [size, width] of CASES) {
            test(`size ${size} maps to ${width}`, async function (assert) {
                panel.overlays = [{ id: 'ov_1', title: 'Sized', size }];

                await render(TEMPLATE);

                assert.true(find('.next-content-overlay-panel').style.width.includes(width), `the panel is ${width} wide`);
            });
        }

        test('an unknown size falls back to the small width', async function (assert) {
            panel.overlays = [{ id: 'ov_1', title: 'Sized', size: 'gigantic' }];

            await render(TEMPLATE);

            assert.true(find('.next-content-overlay-panel').style.width.includes('550px'));
        });

        test('an explicit width wins over the size', async function (assert) {
            panel.overlays = [{ id: 'ov_1', title: 'Sized', size: 'lg', width: '123px' }];

            await render(TEMPLATE);

            assert.true(find('.next-content-overlay-panel').style.width.includes('123px'));
        });
    });

    module('content and footer', function () {
        test('an overlay content component is rendered with the resource', async function (assert) {
            panel.overlays = [{ id: 'ov_1', title: 'With content', content: 'test-panel-content', resource: { name: 'Order 123' } }];

            await render(TEMPLATE);

            assert.dom('.panel-content').hasText('Order 123');
        });

        test('an overlay footer component is rendered', async function (assert) {
            panel.overlays = [{ id: 'ov_1', title: 'With footer', footer: 'test-panel-footer' }];

            await render(TEMPLATE);

            assert.dom('.panel-footer').exists();
        });

        test('no content component means no content wrapper', async function (assert) {
            panel.overlays = [{ id: 'ov_1', title: 'Bare' }];

            await render(TEMPLATE);

            assert.dom('.resource-context-panel-content').doesNotExist();
            assert.dom('.resource-context-panel-footer').doesNotExist();
        });
    });

    module('tabs', function () {
        test('tabs are rendered and the active one supplies the body', async function (assert) {
            panel.activeTabs = { ov_1: 'details' };
            panel.overlays = [
                {
                    id: 'ov_1',
                    title: 'Tabbed',
                    tabs: [
                        { key: 'details', label: 'Details', component: 'test-tab-one' },
                        { key: 'activity', label: 'Activity', component: 'test-tab-one' },
                    ],
                },
            ];

            await render(TEMPLATE);

            assert.dom('.resource-context-panel-tabs').exists();
            assert.dom(this.element).containsText('Details');
            assert.dom(this.element).containsText('Activity');
            assert.dom('.tab-one').exists('the active tab body renders');
        });

        test('a tab key is derived from its label when none is given', async function (assert) {
            panel.overlays = [{ id: 'ov_1', title: 'Tabbed', tabs: [{ title: 'Recent Activity', render: 'test-tab-one' }] }];

            await render(TEMPLATE);

            assert.dom(this.element).containsText('Recent Activity', 'the title is used as the label');
        });

        test('changing tab tells the service', async function (assert) {
            panel.activeTabs = { ov_1: 'details' };
            panel.overlays = [
                {
                    id: 'ov_1',
                    title: 'Tabbed',
                    tabs: [
                        { key: 'details', label: 'Details', component: 'test-tab-one' },
                        { key: 'activity', label: 'Activity', component: 'test-tab-one' },
                    ],
                },
            ];

            await render(TEMPLATE);
            const activityTab = findAll('[role="tab"], .ui-tab').find((tab) => tab.textContent.includes('Activity'));
            await click(activityTab);

            assert.deepEqual(panel.activeTabCalls, [['ov_1', 'activity']]);
        });

        test('an overlay with no tabs renders no tab strip', async function (assert) {
            panel.overlays = [{ id: 'ov_1', title: 'Untabbed' }];

            await render(TEMPLATE);

            assert.dom('.resource-context-panel-tabs').doesNotExist();
        });
    });

    module('closing', function () {
        test('a dismissible overlay gets a click-away backdrop', async function (assert) {
            panel.overlays = [{ id: 'ov_1', title: 'Dismissible', dismissible: true }];
            panel.active = panel.overlays[0];

            await render(TEMPLATE);

            assert.dom('.resource-context-panel-backdrop').exists();
        });

        test('an overlay that is not dismissible gets no backdrop', async function (assert) {
            panel.overlays = [{ id: 'ov_1', title: 'Pinned', dismissible: false }];
            panel.active = panel.overlays[0];

            await render(TEMPLATE);

            assert.dom('.resource-context-panel-backdrop').doesNotExist('the backdrop is not rendered for everything');
        });

        test('closing a panel from its own cancel control closes that overlay by id', async function (assert) {
            panel.overlays = [{ id: 'ov_1', title: 'Closable' }];

            await render(TEMPLATE);
            const closeButton = findAll('.resource-context-panel-header button')[0];
            assert.ok(closeButton, 'the panel offers a way to close itself');

            await click(closeButton);

            assert.deepEqual(panel.closed, ['ov_1'], 'the overlay is closed by id');
        });

        test('escape closes a dismissible overlay', async function (assert) {
            panel.overlays = [{ id: 'ov_1', title: 'Dismissible', dismissible: true }];
            panel.active = panel.overlays[0];

            await render(TEMPLATE);
            await triggerKeyEvent(document, 'keydown', 'Escape');

            assert.deepEqual(panel.closed, [undefined]);
        });

        test('escape leaves a non-dismissible overlay alone', async function (assert) {
            panel.overlays = [{ id: 'ov_1', title: 'Sticky', dismissible: false }];
            panel.active = panel.overlays[0];

            await render(TEMPLATE);
            await triggerKeyEvent(document, 'keydown', 'Escape');

            assert.deepEqual(panel.closed, []);
        });

        test('another key never closes anything', async function (assert) {
            panel.overlays = [{ id: 'ov_1', title: 'Dismissible', dismissible: true }];
            panel.active = panel.overlays[0];

            await render(TEMPLATE);
            await triggerKeyEvent(document, 'keydown', 'Enter');

            assert.deepEqual(panel.closed, []);
        });

        test('escape after teardown is ignored', async function (assert) {
            panel.overlays = [{ id: 'ov_1', title: 'Dismissible', dismissible: true }];
            panel.active = panel.overlays[0];
            this.set('show', true);

            await render(hbs`{{#if this.show}}<ResourceContextPanel />{{/if}}`);
            this.set('show', false);
            await settled();

            await triggerKeyEvent(document, 'keydown', 'Escape');

            assert.deepEqual(panel.closed, [], 'the global listener was removed on destroy');
        });
    });

    module('resolving the resource', function () {
        // findResource() only accepts a real ember-data Model, and the dummy app ships a
        // plain-object store stub, so build the fixture straight off Model.prototype.
        function record(properties) {
            return Object.assign(Object.create(Model.prototype), properties);
        }

        test('an explicit model argument is used when there is no resource', async function (assert) {
            panel.overlays = [{ id: 'ov_1', model: record({ name: 'From model' }) }];

            await render(TEMPLATE);

            assert.dom(this.element).containsText('From model');
        });

        test('a real resource wins over a real model', async function (assert) {
            panel.overlays = [{ id: 'ov_1', model: record({ name: 'From model' }), resource: record({ name: 'From resource' }) }];

            await render(TEMPLATE);

            assert.dom(this.element).containsText('From resource');
            assert.dom(this.element).doesNotContainText('From model');
        });

        test('a model hiding under any other key is found', async function (assert) {
            panel.overlays = [{ id: 'ov_1', vehicle: record({ name: 'Truck 104' }) }];

            await render(TEMPLATE);

            assert.dom(this.element).containsText('Truck 104', 'the overlay is scanned for a model-shaped value');
        });

        test('a plain-object resource is still used as a fallback', async function (assert) {
            panel.overlays = [{ id: 'ov_1', resource: { name: 'Duck typed' } }];

            await render(TEMPLATE);

            assert.dom(this.element).containsText('Duck typed');
        });

        test('an overlay with nothing resource-shaped renders an untitled panel', async function (assert) {
            panel.overlays = [{ id: 'ov_1' }];

            await render(TEMPLATE);

            assert.strictEqual(panels().length, 1, 'the panel still renders');
            assert.dom(this.element).doesNotContainText('undefined');
        });
    });

    module('the default save task', function () {
        function saveButton() {
            return findAll('button.btn').find((button) => /Save Changes|Create /.test(button.textContent));
        }

        function savableOverlay(overrides = {}) {
            const resource = {
                id: 'ord_1',
                name: 'Order 123',
                isNew: false,
                saveCount: 0,
                save() {
                    resource.saveCount++;
                    return Promise.resolve(resource);
                },
            };

            return { overlay: { id: 'ov_save', useDefaultSaveTask: true, pojoResource: true, resource, ...overrides }, resource };
        }

        test('no save button is rendered unless the default task is opted into', async function (assert) {
            panel.overlays = [{ id: 'ov_1', resource: { name: 'Order 123' } }];

            await render(TEMPLATE);

            assert.notOk(saveButton(), 'the panel has no save control');
        });

        test('saving persists the resource, announces it and closes the overlay', async function (assert) {
            const { overlay, resource } = savableOverlay();
            panel.overlays = [overlay];

            await render(TEMPLATE);
            await click(saveButton());

            const notifications = this.owner.lookup('service:notifications');
            assert.strictEqual(resource.saveCount, 1, 'the record is saved');
            assert.deepEqual(notifications.successes, ['Order 123 updated successfully.']);
            assert.deepEqual(panel.closed, ['ov_save'], 'the overlay closes itself behind the save');
        });

        test('a new record is announced as created', async function (assert) {
            const { overlay, resource } = savableOverlay();
            resource.isNew = true;
            panel.overlays = [overlay];

            await render(TEMPLATE);
            await click(saveButton());

            const notifications = this.owner.lookup('service:notifications');
            assert.deepEqual(notifications.successes, ['Order 123 created successfully.']);
        });

        test('a nameless resource falls back to a generic label', async function (assert) {
            const { overlay, resource } = savableOverlay();
            delete resource.name;
            panel.overlays = [overlay];

            await render(TEMPLATE);
            await click(saveButton());

            const notifications = this.owner.lookup('service:notifications');
            assert.deepEqual(notifications.successes, ['Resource updated successfully.'], 'getModelName cannot name a duck-typed record');
        });

        test('a display_name is used when there is no name', async function (assert) {
            const { overlay, resource } = savableOverlay();
            delete resource.name;
            resource.display_name = 'Order 123 (display)';
            panel.overlays = [overlay];

            await render(TEMPLATE);
            await click(saveButton());

            const notifications = this.owner.lookup('service:notifications');
            assert.deepEqual(notifications.successes, ['Order 123 (display) updated successfully.']);
        });

        test('the caller callback receives the saved record', async function (assert) {
            const saved = [];
            const { overlay, resource } = savableOverlay({ saveOptions: { callback: (result) => saved.push(result) } });
            panel.overlays = [overlay];

            await render(TEMPLATE);
            await click(saveButton());

            assert.deepEqual(saved, [resource]);
        });

        test('a failed save is reported and the overlay stays open', async function (assert) {
            const failure = new Error('server said no');
            const { overlay, resource } = savableOverlay();
            resource.save = () => Promise.reject(failure);
            panel.overlays = [overlay];

            // saveTask deliberately re-throws after reporting so a caller awaiting the task can
            // react. Nothing awaits it here (the panel performs it from the template), so the
            // rejection surfaces as an uncaught error unless it is captured.
            const uncaught = [];
            setupOnerror((error) => uncaught.push(error));

            await render(TEMPLATE);
            await click(saveButton());

            const notifications = this.owner.lookup('service:notifications');
            assert.deepEqual(notifications.serverErrors, [failure], 'the failure is reported');
            assert.deepEqual(notifications.successes, [], 'nothing is announced as saved');
            assert.deepEqual(panel.closed, [], 'the overlay is left open so the user can retry');
            assert.deepEqual(uncaught, [failure], 'and the error is re-thrown for any awaiting caller');
        });

        test('an explicit saveTask on the overlay wins over the default one', async function (assert) {
            const performed = [];
            const { overlay } = savableOverlay();
            overlay.saveTask = { isRunning: false, perform: (...args) => performed.push(args) };
            panel.overlays = [overlay];

            await render(TEMPLATE);
            await click(saveButton());

            assert.strictEqual(performed.length, 1, 'the supplied task runs instead');
            assert.deepEqual(panel.closed, [], 'and the default close never happens');
        });
    });
});
