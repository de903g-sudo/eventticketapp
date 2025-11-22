import { Router } from "express";
import { mockPaymentController } from "../../controllers/payments/mockPaymentController";

const router = Router();

router.post("/mock-success", mockPaymentController);

export default router;