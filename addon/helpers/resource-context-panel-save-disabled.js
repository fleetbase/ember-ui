import { helper } from '@ember/component/helper';

export default helper(function resourceContextPanelSaveDisabled([overlay]) {
    if (overlay?.saveDisabled === true) {
        return true;
    }

    if (overlay?.saveDisabled === false) {
        return false;
    }

    const model = overlay?.model;
    const isModelLike = model && typeof model.hasDirtyAttributes === 'boolean';

    if (!isModelLike) {
        return false; // POJO → always saveable
    }

    // ED model → disable if no changes
    return model.hasDirtyAttributes === false;
});
