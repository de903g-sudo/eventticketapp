import express from "express";
import { createOrderHandler } from "../controllers/orders.controller";

const router = express.Router();

router.post("/events/:event_id/create-order", createOrderHandler);

export default router;