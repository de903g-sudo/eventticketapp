import { mockPaymentSuccess } from "../../services/payments/mockPayment";

export const mockPaymentController = async (req, res) => {
  const { order_id } = req.body;

  if (!order_id) {
    return res.status(400).json({ error: "order_id is required" });
  }

  try {
    const result = await mockPaymentSuccess(order_id);
    res.json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Mock payment failed" });
  }
};