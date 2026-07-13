// backend/routes/drugs.js
const express = require('express');
const { requireAuthenticatedUser, requireRole } = require('../middleware/requestIdentity');
const { searchDrugsForAutocomplete } = require('../services/drugSearchService');
const {
  DrugNotFoundError,
  RateLimitError,
  InvalidApiKeyError,
  RxCheckError,
} = require('../services/rxcheckErrors');

const router = express.Router();

router.get(
  '/search',
  requireAuthenticatedUser,
  requireRole('PHYSICIAN', 'CMO', 'PHARMACIST'),
  async (req, res) => {
    try {
      const query = req.query.q;

      if (!query || String(query).trim().length === 0) {
        return res.status(400).json({ error: 'Query parameter q is required' });
      }

      const trimmedQuery = String(query).trim();
      const results = await searchDrugsForAutocomplete(trimmedQuery);

      return res.status(200).json({
        query: trimmedQuery,
        results,
      });
    } catch (error) {
      if (error instanceof DrugNotFoundError) {
        return res.status(404).json({ error: error.message, code: error.code });
      }

      if (error instanceof RateLimitError) {
        return res.status(429).json({ error: error.message, code: error.code });
      }

      if (error instanceof InvalidApiKeyError) {
        return res.status(502).json({ error: 'Drug search provider authentication failed' });
      }

      if (error instanceof RxCheckError) {
        const statusCode = error.statusCode && error.statusCode < 500 ? error.statusCode : 502;
        return res.status(statusCode).json({ error: error.message, code: error.code });
      }

      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

module.exports = router;
