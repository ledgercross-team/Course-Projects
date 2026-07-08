const express = require("express");
const router = express.Router();
const { register, login, devLogin } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/dev-login", devLogin);

module.exports = router;
