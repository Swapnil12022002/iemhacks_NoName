const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { UnauthenticatedError } = require("../errors");
const asyncWrapper = require("../middleware/async");

const isAuthenticated = asyncWrapper(async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    throw new UnauthenticatedError("Not authenticated, please login first.");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
  const user = await User.findById(decoded.id);
  req.user = user;

  next();
});

module.exports = isAuthenticated;
