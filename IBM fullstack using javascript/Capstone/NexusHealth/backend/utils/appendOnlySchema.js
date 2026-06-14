// backend/utils/appendOnlySchema.js
const MUTATION_METHODS = [
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'findOneAndReplace',
  'findOneAndDelete',
  'replaceOne',
  'deleteOne',
  'deleteMany',
];

const buildAppendOnlyErrorMessage = (collectionName) =>
  `${collectionName} collection is append-only: updates and deletes are prohibited`;

const applyAppendOnlyGuards = (schema, collectionName) => {
  const errorMessage = buildAppendOnlyErrorMessage(collectionName);

  schema.pre('save', function appendOnlySaveGuard() {
    if (!this.isNew) {
      throw new Error(errorMessage);
    }
  });

  const blockMutationHook = function blockMutationHook() {
    throw new Error(errorMessage);
  };

  schema.pre(MUTATION_METHODS, blockMutationHook);
};

const applyAppendOnlyNativeCollectionGuards = (model, collectionName) => {
  const errorMessage = buildAppendOnlyErrorMessage(collectionName);
  const { collection } = model;

  for (const method of MUTATION_METHODS) {
    if (typeof collection[method] !== 'function') {
      continue;
    }

    collection[method] = () => {
      throw new Error(errorMessage);
    };
  }
};

module.exports = {
  MUTATION_METHODS,
  buildAppendOnlyErrorMessage,
  applyAppendOnlyGuards,
  applyAppendOnlyNativeCollectionGuards,
};
