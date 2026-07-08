const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");
const upload = require("../middleware/upload");

const {
  uploadWill,
  attachOnChainId,
  getWillById,
  myWills,
  verify,
  release,
  witnessApprove,
} = require("../controllers/willController");

// Creator uploads a will document (PDF/JPG/PNG, max 20MB)
router.post("/uploadWill", auth, roleGuard("creator"), upload.single("file"), uploadWill);

// Link the Mongo record to its on-chain will id after createWill() confirms
router.post("/uploadWill/:id/onchain", auth, roleGuard("creator"), attachOnChainId);

// Witness approves an assigned will (off-chain mirror of approveByWitness())
router.post("/will/:id/witness-approve", auth, roleGuard("witness"), witnessApprove);

// View a single will (access-controlled inside the controller)
router.get("/will/:id", auth, getWillById);

// Admin verifies death/condition
router.post("/verify", auth, roleGuard("admin"), verify);

// Admin releases the will to the beneficiary
router.post("/release", auth, roleGuard("admin"), release);

// List wills relevant to the logged-in wallet
router.get("/myWills", auth, myWills);

module.exports = router;
