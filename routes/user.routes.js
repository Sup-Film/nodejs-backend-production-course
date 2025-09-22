import { Router } from "express";

const userRouter = Router();

userRouter.get("/", (req, res) => {
  res.send("Get all users");
});

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
