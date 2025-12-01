import Component from '@glimmer/component';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { assert } from '@ember/debug';
import { task } from 'ember-concurrency';

/**
 * LoadEngine Component
 * 
 * A component that handles lazy loading of engines and yields the engine instance.
 * This provides a flexible pattern for working with engine components.
 * 
 * @class LoadEngineComponent
 * @extends Component
 * 
 * @example Basic usage
 * <LoadEngine @engineName="@fleetbase/fleetops-engine" as |engine|>
 *   {{#if engine}}
 *     {{component "admin/navigator-app" engineInstance=engine}}
 *   {{/if}}
 * </LoadEngine>
 * 
 * @example With loading and error states
 * <LoadEngine @engineName="@fleetbase/fleetops-engine" as |engine isLoading error|>
 *   {{#if isLoading}}
 *     <LoadingSpinner />
 *   {{else if error}}
 *     <ErrorMessage @message={{error}} />
 *   {{else if engine}}
 *     {{component "admin/navigator-app" engineInstance=engine}}
 *   {{/if}}
 * </LoadEngine>
 */
export default class LoadEngineComponent extends Component {
    @service('universe/extension-manager') extensionManager;
    @tracked engineInstance = null;
    @tracked error = null;

    constructor() {
        super(...arguments);
        this.loadEngine.perform();
    }

    /**
     * Load the engine
     * 
     * @method loadEngine
     * @private
     */
    @task *loadEngine() {
        const { engineName } = this.args;

        assert(
            `LoadEngine requires an @engineName argument`,
            engineName
        );

        try {
            console.log(`[LoadEngine] Loading engine: ${engineName}`);
            
            // Trigger lazy loading of the engine
            const engine = yield this.extensionManager.ensureEngineLoaded(engineName);
            
            if (!engine) {
                throw new Error(`Failed to load engine '${engineName}'`);
            }

            console.log(`[LoadEngine] Engine loaded successfully:`, engine);
            this.engineInstance = engine;
        } catch (e) {
            console.error('[LoadEngine] Error loading engine:', e);
            this.error = e.message;
        }
    }

    /**
     * Whether the engine is currently loading
     * 
     * @computed isLoading
     * @returns {Boolean}
     */
    get isLoading() {
        return this.loadEngine.isRunning;
    }
}
