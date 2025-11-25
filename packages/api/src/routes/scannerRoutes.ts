import { Router } from "express";
import { scannerLogin, scanTicket } from "../controllers/scannerController";
import { scannerAuth } from "../middleware/authScanner";

const router = Router();

router.post("/login", scannerLogin);
router.post("/scan", scannerAuth, scanTicket);

export default router;