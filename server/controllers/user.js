const User = require("../models/User");
const Post = require("../models/Post");
const asyncWrapper = require("../middleware/async");
const { StatusCodes } = require("http-status-codes");
const {
  UnauthenticatedError,
  BadRequestError,
  NotFoundError,
} = require("../errors");
const sendEmail = require("../middleware/send-email");
const crypto = require("crypto");

const register = asyncWrapper(async (req, res) => {
  const { name, email, password } = req.body;
  let user = await User.findOne({ email });
  if (user) {
    throw new BadRequestError("user already exists");
  }
  user = await User.create({
    name,
    email,
    password,
  });

  const token = await user.createToken();
  console.log(token);
  const options = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };

  res.status(StatusCodes.CREATED).cookie("token", token, options).json({
    success: true,
    user,
    token,
  });
});

const login = asyncWrapper(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email })
    .select("+password")
    .populate("posts followers following");
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const isMatched = await user.matchPassword(password);
  if (!isMatched) {
    throw new UnauthenticatedError("Wrong Password");
  }

  const token = await user.createToken();
  const options = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    httpOnly: true,
  };

  res.status(StatusCodes.CREATED).cookie("token", token, options).json({
    success: true,
    user,
    token,
  });
});

const logout = asyncWrapper(async (req, res) => {
  const options = {
    expires: new Date(Date.now()),
    httpOnly: true,
  };
  res.status(StatusCodes.OK).cookie("token", null, options).json({
    success: true,
    message: "User logged out.",
  });
});

const followUser = asyncWrapper(async (req, res) => {
  const loggedInUser = await User.findById(req.user._id);
  const ToBeFollowedUser = await User.findById(req.params.id);

  if (!ToBeFollowedUser) {
    throw new NotFoundError(`No user found with id: ${req.params.id}`);
  }
  if (loggedInUser._id.toString() === ToBeFollowedUser._id.toString()) {
    throw new BadRequestError("Cannot follow yourself");
  }

  if (loggedInUser.following.includes(req.params.id)) {
    const indexToBeFollowed = loggedInUser.following.indexOf(req.params.id);
    const indexLoggedIn = ToBeFollowedUser.followers.indexOf(req.user._id);

    loggedInUser.following.splice(indexToBeFollowed, 1);
    ToBeFollowedUser.followers.splice(indexLoggedIn, 1);

    await loggedInUser.save();
    await ToBeFollowedUser.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "User UnFollowed",
    });
  } else {
    ToBeFollowedUser.followers.push(req.user._id);
    loggedInUser.following.push(req.params.id);

    await ToBeFollowedUser.save();
    await loggedInUser.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "User Followed",
    });
  }
});

const updatePassword = asyncWrapper(async (req, res) => {
  const user = await User.findById(req.user._id).select("+password");
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new BadRequestError("Please provide both old and new passwords.");
  }
  const isMatched = await user.matchPassword(oldPassword);
  if (!isMatched) {
    throw new UnauthenticatedError(
      "Wrong Password! Provide correct password to update to a new one"
    );
  }

  user.password = newPassword;
  await user.save();
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Password updated.",
  });
});

const updateProfile = asyncWrapper(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { name, email } = req.body;

  if (name) {
    user.name = name;
  }
  if (email) {
    user.email = email;
  }

  await user.save();
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Your profile has been updated.",
  });
});

const deleteProfile = asyncWrapper(async (req, res) => {
  const user = await User.findById(req.user._id);
  const posts = user.posts;
  const following = user.following;
  const followers = user.followers;
  const userId = req.user._id;

  await User.findByIdAndDelete(req.user._id);

  res.cookie("token", null, { expires: new Date(Date.now()), httpOnly: true });

  for (let i = 0; i < posts.length; i++) {
    try {
      const deletedPost = await Post.findByIdAndDelete(posts[i]);
      console.log(`Deleted post with ID: ${deletedPost._id}`);
    } catch (error) {
      console.error(`Error deleting post with ID ${posts[i]}:`, error);
    }
  }

  for (let i = 0; i < following.length; i++) {
    const followedUser = await User.findById(following[i]);
    const index = followedUser.followers.indexOf(req.user._id);
    followedUser.followers.splice(index, 1);
    await followedUser.save();
  }

  for (let i = 0; i < followers.length; i++) {
    const follower = await User.findById(followers[i]);
    const index = follower.following.indexOf(req.user._id);
    follower.following.splice(index, 1);
    await follower.save();
  }

  const allPosts = await Post.find();
  for (let i = 0; i < allPosts.length; i++) {
    const post = await Post.findById(allPosts[i]._id);

    for (let j = 0; j < post.comments.length; j++) {
      const comment = post.comments[j];

      if (comment.user.toString() === userId.toString()) {
        post.comments.splice(j, 1);
        j--;
      }
    }
    await post.save();
  }

  for (let i = 0; i < allPosts.length; i++) {
    const post = await Post.findById(allPosts[i]._id);

    for (let j = 0; j < post.likes.length; j++) {
      if (post.likes[j].toString() === userId.toString()) {
        post.likes.splice(j, 1);
        j--;
      }
    }
    await post.save();
  }

  res.status(StatusCodes.OK).json({
    success: true,
    message: "User deleted",
  });
});

const forgotPassword = asyncWrapper(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    throw new UnauthenticatedError("User not found");
  }

  const resetPasswordToken = user.getResetPasswordToken();
  await user.save();
  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/password/reset/${resetPasswordToken}`;
  const message = `Reset Your Password by clicking on the link below: \n\n ${resetUrl}`;

  try {
    await sendEmail({
      email: user.email,
      subject: "Reset Password",
      message,
    });
    res.status(StatusCodes.OK).json({
      success: true,
      message: `Email sent to ${user.email}`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: error.message,
    });
  }
});

const resetPassword = asyncWrapper(async (req, res) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    throw new UnauthenticatedError("Token is invalid or is expired");
  }

  user.password = req.body.password;

  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;

  await user.save();
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Password Reset",
  });
});

module.exports = {
  register,
  login,
  logout,
  followUser,
  updatePassword,
  updateProfile,
  deleteProfile,
  forgotPassword,
  resetPassword,
};
