import { supabase } from "../../utils/supabase";
import { generateticketsForOrder } from "../../services/tickets/ticketService";

export const mockPaymentSuccess = async (order_id) => {

  // 1. Fetch the order
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", order_id)
    .single();

  if (error || !order) throw new Error("Order not found");

  // 2. Add fake payment entry
  await supabase.from("payments").insert({
    order_id,
    amount: order.total_amount,
    status: "success",
    gateway: "mock",
    response_payload: { mock: true }
  });

  // 3. Mark order as PAID
  await supabase
    .from("orders")
    .update({ status: "paid" })
    .eq("id", order_id);

  // 4. Generate tickets
  const tickets = await generateticketsForOrder(order);

  return {
    success: true,
    order_id,
    tickets,
  };
};