const express = require("express");
const router = express.Router();
const {
  register,
  login,
  logout,
  followUser,
  updatePassword,
  updateProfile,
  deleteProfile,
  forgotPassword,
  resetPassword,
} = require("../controllers/user");
const isAuthenticated = require("../middleware/auth");

router.route("/register").post(register);
router.route("/login").post(login);
router.route("/logout").get(logout);
router.route("/follow/:id").get(isAuthenticated, followUser);
router.route("/update/password").put(isAuthenticated, updatePassword);
router.route("/update/profile").put(isAuthenticated, updateProfile);
router.route("/delete/me").delete(isAuthenticated, deleteProfile);
router.route("/forgot/password").post(forgotPassword);
router.route("/password/reset/:token").post(resetPassword);

module.exports = router;
