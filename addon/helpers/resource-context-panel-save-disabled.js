import { helper } from '@ember/component/helper';

export default helper(function resourceContextPanelSaveDisabled([overlay]) {
    const model = overlay?.model;
    // "model-like" if it exposes a boolean `hasDirtyAttributes`
    const isModelLike = typeof model?.hasDirtyAttributes === 'boolean';
    const isCleanModel = isModelLike ? model.hasDirtyAttributes === false : false;

    // Disable when explicitly requested, or when it's a (model-like) *clean* model.
    return overlay?.saveDisabled === true || isCleanModel;
});
