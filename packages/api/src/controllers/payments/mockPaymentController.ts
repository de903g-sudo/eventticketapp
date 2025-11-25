import { supabase } from "../../utils/supabase";
import { generateTicketsForOrder } from "../../services/tickets/ticketService";

export const mockPaymentSuccess = async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: "order_id required" });
    }

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Update order status
    await supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("id", order_id);

    // Insert into payments table
    await supabase.from("payments").insert([
      {
        order_id: order_id,
        gateway_order_id: "MOCK_ORDER",
        gateway_payment_id: "MOCK_PAYMENT",
        amount: order.total_amount,
        status: "success",
        response_payload: { mock: true }
      }
    ]);

    // Generate tickets
    await generateTicketsForOrder(order_id);

    return res.json({
      success: true,
      message: "Payment success, tickets generated",
      order_id
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "internal_server_error" });
  }
};