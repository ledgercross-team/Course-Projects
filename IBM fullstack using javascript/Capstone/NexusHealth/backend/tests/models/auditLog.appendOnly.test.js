const AuditLog = require('../../models/AuditLog');
const { buildAppendOnlyErrorMessage } = require('../../utils/appendOnlySchema');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

const APPEND_ONLY_ERROR = buildAppendOnlyErrorMessage('audit_logs');

describe('AuditLog append-only guards', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('allows inserting a new audit log entry', async () => {
    const entry = await AuditLog.create({
      auditId: 'audit-001',
      eventType: 'CONSENT_CREATED',
      actorId: '507f1f77bcf86cd799439011',
      targetResourceType: 'ConsentRule',
      targetResourceId: 'consent-001',
      payload: { action: 'created' },
    });

    expect(entry.auditId).toBe('audit-001');
  });

  it('blocks updating an existing audit log document', async () => {
    const entry = await AuditLog.create({
      auditId: 'audit-002',
      eventType: 'CONSENT_CREATED',
      actorId: '507f1f77bcf86cd799439011',
      targetResourceType: 'ConsentRule',
      targetResourceId: 'consent-002',
    });

    entry.payload = { tampered: true };

    await expect(entry.save()).rejects.toThrow(APPEND_ONLY_ERROR);
  });

  it('blocks deleteOne on audit_logs collection', async () => {
    await AuditLog.create({
      auditId: 'audit-003',
      eventType: 'CONSENT_CREATED',
      actorId: '507f1f77bcf86cd799439011',
      targetResourceType: 'ConsentRule',
      targetResourceId: 'consent-003',
    });

    await expect(AuditLog.deleteOne({ auditId: 'audit-003' })).rejects.toThrow(APPEND_ONLY_ERROR);
  });

  it('blocks findOneAndUpdate on audit_logs collection', async () => {
    await AuditLog.create({
      auditId: 'audit-004',
      eventType: 'CONSENT_CREATED',
      actorId: '507f1f77bcf86cd799439011',
      targetResourceType: 'ConsentRule',
      targetResourceId: 'consent-004',
    });

    await expect(
      AuditLog.findOneAndUpdate({ auditId: 'audit-004' }, { payload: { mutated: true } })
    ).rejects.toThrow(APPEND_ONLY_ERROR);
  });

  it('blocks findOneAndDelete on audit_logs collection', async () => {
    await AuditLog.create({
      auditId: 'audit-005',
      eventType: 'CONSENT_CREATED',
      actorId: '507f1f77bcf86cd799439011',
      targetResourceType: 'ConsentRule',
      targetResourceId: 'consent-005',
    });

    await expect(AuditLog.findOneAndDelete({ auditId: 'audit-005' })).rejects.toThrow(
      APPEND_ONLY_ERROR
    );
  });

  it('blocks native collection updateOne bypass attempts', async () => {
    await AuditLog.create({
      auditId: 'audit-006',
      eventType: 'CONSENT_CREATED',
      actorId: '507f1f77bcf86cd799439011',
      targetResourceType: 'ConsentRule',
      targetResourceId: 'consent-006',
    });

    expect(() =>
      AuditLog.collection.updateOne({ auditId: 'audit-006' }, { $set: { tampered: true } })
    ).toThrow(APPEND_ONLY_ERROR);
  });
});
