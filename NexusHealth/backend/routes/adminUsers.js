// backend/routes/adminUsers.js
const express = require('express');
const { requireAuthenticatedUser, requireRole } = require('../middleware/requestIdentity');
const { inviteUser, listUsers } = require('../services/adminUserService');

const router = express.Router();

router.use(requireAuthenticatedUser, requireRole('ADMIN'));

router.post('/invite', async (req, res) => {
  try {
    const result = await inviteUser(req.body);
    return res.status(201).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const users = await listUsers({
      role: req.query.role,
      accountStatus: req.query.accountStatus,
    });
    return res.status(200).json({ users });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

module.exports = router;
