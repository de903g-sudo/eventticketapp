import { Request, Response } from 'express';
import { createOrderService } from '../services/orders/createOrder.service';

export const createOrder = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const payload = req.body;

    const result = await createOrderService(eventId, payload);

    return res.status(200).json({
      success: true,
      message: "Order created successfully",
      data: result
    });

  } catch (err: any) {
    console.error('Order Creation Error:', err.message);
    return res.status(400).json({
      success: false,
      error: err.message || "Order creation failed"
    });
  }
};