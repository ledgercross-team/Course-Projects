// backend/routes/meta.js
const express = require('express');
const { CLINICAL_DOMAINS } = require('../config/enums');

const router = express.Router();

router.get('/clinical-domains', (_req, res) => {
  return res.status(200).json({ clinicalDomains: CLINICAL_DOMAINS });
});

module.exports = router;
