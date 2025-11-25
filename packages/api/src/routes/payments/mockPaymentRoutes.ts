import express from "express";
import { mockPaymentSuccess } from "../../controllers/payments/mockPaymentController";

const router = express.Router();

router.post("/mock/success", mockPaymentSuccess);

export default router;