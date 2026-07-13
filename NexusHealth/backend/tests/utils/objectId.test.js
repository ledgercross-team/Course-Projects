const { isValidObjectId, toObjectId } = require('../../utils/objectId');

describe('objectId utilities', () => {
  it('accepts valid 24-character hex ObjectId strings', () => {
    const id = '507f1f77bcf86cd799439011';

    expect(isValidObjectId(id)).toBe(true);
    expect(toObjectId(id).toString()).toBe(id);
  });

  it('rejects strings that pass isValid but are not canonical ObjectIds', () => {
    expect(isValidObjectId('invalidstring1')).toBe(false);
  });

  it('rejects null and undefined', () => {
    expect(isValidObjectId(null)).toBe(false);
    expect(isValidObjectId(undefined)).toBe(false);
  });

  it('throws a 400-class error when converting invalid ids', () => {
    expect(() => toObjectId('not-an-object-id')).toThrow('Invalid ObjectId');

    try {
      toObjectId('not-an-object-id');
    } catch (error) {
      expect(error.statusCode).toBe(400);
    }
  });
});
