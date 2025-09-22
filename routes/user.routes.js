import { Router } from "express";

import authorize from "../middlewares/auth.middleware.js";
import { getUsers, getUser } from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.get("/", getUsers);

// request -> authorize middleware -> if valid -> next() -> get user details controller
userRouter.get("/:id", authorize, getUser);

userRouter.get("/:id", (req, res) => {
  res.send(`Get user with ID ${req.params.id}`);
});

userRouter.post("/", (req, res) => {
  res.send("Create a new user");
});

userRouter.put("/:id", (req, res) => {
  res.send(`Update user with ID ${req.params.id}`);
});

userRouter.delete("/:id", (req, res) => {
  res.send(`Delete user with ID ${req.params.id}`);
});

export default userRouter;
