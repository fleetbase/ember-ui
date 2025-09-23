import { helper } from '@ember/component/helper';

export default helper(function getWritePermission([model, schema = 'fleet-ops']) {
    const modelName = model.constructor?.modelName ?? model._internalModel?.modelName;
    return model.isNew ? `${schema} create ${modelName}` : `${schema} update ${modelName}`;
});
