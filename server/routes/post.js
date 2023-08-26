const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/auth");
const {
  createPost,
  deletePost,
  likeAndUnlikePosts,
  getPostOfFollowing,
  updateCaption,
  commentOnPost,
  updateComment,
  deleteComment,
} = require("../controllers/post");

router.route("/post/upload").post(isAuthenticated, createPost);
router
  .route("/post/:id")
  .get(isAuthenticated, likeAndUnlikePosts)
  .put(isAuthenticated, updateCaption)
  .delete(isAuthenticated, deletePost);
router.route("/posts").get(isAuthenticated, getPostOfFollowing);
router.route("/post/comment/:id").post(isAuthenticated, commentOnPost);
router
  .route("/post/comment/:postId/:commentId")
  .put(isAuthenticated, updateComment)
  .delete(isAuthenticated, deleteComment);

module.exports = router;
