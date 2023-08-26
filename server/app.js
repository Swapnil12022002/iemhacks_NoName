const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
require("dotenv").config({ path: "server/config/config.env" });
const userRouter = require("./routes/user");
const postRouter = require("./routes/post");
const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//Routes
app.use("/api/v1", userRouter);
app.use("/api/v1", postRouter);
app.use(notFound);
app.use(errorHandler);

//Server starting section
const port = process.env.PORT || 3000;
const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    app.listen(port, () => console.log(`Server is running on port ${port}`));
  } catch (error) {
    console.log(error);
  }
};

start();
