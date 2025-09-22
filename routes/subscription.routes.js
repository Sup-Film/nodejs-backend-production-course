import { Router } from "express";

const subscriptionRouter = Router();

subscriptionRouter.get("/", (req, res) => {
  res.send("Get all subscriptions");
});

export default subscriptionRouter;