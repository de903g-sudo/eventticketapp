import express from "express";
import { getEventBySlugHandler } from "../controllers/public.controller";

const router = express.Router();

// Public route: fetch event + ticket types
router.get("/events/:slug", getEventBySlugHandler);

// NO POST routes here
// NO create-order here

export default router;