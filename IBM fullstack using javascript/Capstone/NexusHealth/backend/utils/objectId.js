// backend/utils/objectId.js
const mongoose = require('mongoose');

const isValidObjectId = (value) => {
  if (value == null) {
    return false;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return true;
  }

  if (typeof value !== 'string') {
    return false;
  }

  if (!mongoose.Types.ObjectId.isValid(value)) {
    return false;
  }

  return new mongoose.Types.ObjectId(value).toString() === value;
};

const toObjectId = (id) => {
  if (!isValidObjectId(id)) {
    const error = new Error('Invalid ObjectId');
    error.statusCode = 400;
    throw error;
  }

  if (id instanceof mongoose.Types.ObjectId) {
    return id;
  }

  return new mongoose.Types.ObjectId(id);
};

module.exports = { isValidObjectId, toObjectId };
