const {
  BadRequestError,
  UnauthenticatedError,
  NotFoundError,
} = require("../errors");
const asyncWrapper = require("../middleware/async");
const Post = require("../models/Post");
const User = require("../models/User");
const { StatusCodes } = require("http-status-codes");

const createPost = asyncWrapper(async (req, res) => {
  const { caption, image } = req.body;

  const newPost = {
    caption,
    image: {
      public_id: "yaass",
      url: "mehh",
    },
    owner: req.user._id,
  };

  const post = await Post.create(newPost);
  const user = await User.findById(req.user._id);

  user.posts.push(post._id);
  await user.save();

  res.status(StatusCodes.CREATED).json({
    success: true,
    message: "Post created",
  });
});

const deletePost = asyncWrapper(async (req, res) => {
  const post = await Post.findById(req.params.id);
  const user = await User.findById(req.user._id);

  if (!post) {
    throw new NotFoundError(
      "The post which you are trying to delete doesn't exist."
    );
  }

  if (post.owner.toString() !== req.user._id.toString()) {
    throw new UnauthenticatedError(
      "You are not authenticated to delete posts other than your own."
    );
  }

  await Post.findByIdAndDelete(req.params.id);

  /*const index = user.posts.indexOf(req.params.id);
  user.posts.splice(index, 1);*/

  //Optimal way to utilize mongoDB operators.
  await User.findByIdAndUpdate(req.user._id, {
    $pull: { posts: req.params.id },
  });
  await user.save();

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Post deleted.",
  });
});

const likeAndUnlikePosts = asyncWrapper(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    throw new NotFoundError(
      "The post which you are trying to like doesn't exist."
    );
  }

  if (post.likes.includes(req.params.id)) {
    const index = post.likes.indexOf(req.user._id);
    post.likes.splice(index, 1);
    await post.save();
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Post unLiked",
    });
  } else {
    post.likes.push(req.user._id);
    await post.save();
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Post Liked",
    });
  }
});

const getPostOfFollowing = asyncWrapper(async (req, res) => {
  const user = await User.findById(req.user._id);

  const posts = await Post.find({
    owner: {
      $in: user.following,
    },
  }).populate("owner likes comments.user");

  res.status(StatusCodes.OK).json({
    success: true,
    posts: posts.reverse(),
  });
});

const updateCaption = asyncWrapper(async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) {
    throw new NotFoundError(
      "The post you are looking for to update the caption for does not exist"
    );
  }

  if (post.owner.toString() !== req.user._id.toString()) {
    throw new UnauthenticatedError(
      "You can only edit the caption of your own post"
    );
  } else {
    post.caption = req.body.caption;
    await post.save();
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Your caption for the post has been updated",
    });
  }
});

const commentOnPost = asyncWrapper(async (req, res) => {
  const post = await Post.findById(req.params.id);

  if (!post) {
    throw new NotFoundError(
      "The post you are looking for to comment on does not exist"
    );
  }

  post.comments.push({
    user: req.user._id,
    comment: req.body.comment,
  });
  await post.save();
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Comment added",
    post,
  });
});

const updateComment = asyncWrapper(async (req, res) => {
  const { postId, commentId } = req.params;

  const post = await Post.findOne({
    _id: postId,
    comments: { $elemMatch: { id: commentId } },
  });

  if (!post) {
    throw new NotFoundError("The post or comment does not exist");
  }

  const commentToUpdate = post.comments.find((item) => item.id === commentId);

  if (!commentToUpdate) {
    throw new NotFoundError("Comment not found");
  }

  if (
    commentToUpdate.user.toString() === req.user._id.toString() ||
    post.owner.toString() === req.user._id.toString()
  ) {
    commentToUpdate.comment = req.body.comment;
  } else {
    throw new UnauthenticatedError("You can only update your own comment.");
  }

  await post.save();

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Comment updated",
    post,
  });
});

const deleteComment = asyncWrapper(async (req, res) => {
  const { postId, commentId } = req.params;

  const post = await Post.findOne({
    _id: postId,
    comments: { $elemMatch: { id: commentId } },
  });

  if (!post) {
    throw new NotFoundError("The comment doesn't exist");
  }

  const commentToDelete = post.comments.find((item) => item.id === commentId);

  if (
    commentToDelete.user.toString() === req.user._id.toString() ||
    post.owner.toString() === req.user._id.toString()
  ) {
    const index = post.comments.indexOf(commentToDelete);
    post.comments.splice(index, 1);
  } else {
    throw new UnauthenticatedError("You can only delete your own comment.");
  }

  await post.save();
  res.status(StatusCodes.OK).json({
    success: true,
    message: "Comment deleted",
    post,
  });
});

module.exports = {
  createPost,
  deletePost,
  likeAndUnlikePosts,
  getPostOfFollowing,
  updateCaption,
  commentOnPost,
  updateComment,
  deleteComment,
};
