const mongoose = require("mongoose");

const postSchema = mongoose.Schema({
  caption: String,
  image: {
    public_id: String,
    url: String,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  comments: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      comment: {
        type: String,
        required: true,
      },
      id: {
        type: String,
        default: function () {
          return new mongoose.Types.ObjectId().toString();
        },
      },
    },
  ],
});

module.exports = mongoose.model("Post", postSchema);
