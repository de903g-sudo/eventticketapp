import { Router } from 'express';
import { createOrder } from '../controllers/orders.controller';

const router = Router();

router.post('/events/:id/create-order', createOrder);

export default router;