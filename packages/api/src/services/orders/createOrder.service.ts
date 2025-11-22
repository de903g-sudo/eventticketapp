import { supabase } from '../../utils/supabase';
import { calculatePricing } from './calculatePricing';
import { randomUUID } from 'crypto';

export const createOrderService = async (eventId: string, data: any) => {
  const { selectedTickets, customer } = data;

  if (!selectedTickets || selectedTickets.length === 0) {
    throw new Error("No tickets selected");
  }

  // Fetch event
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (eventErr || !event) throw new Error("Event not found");

  // Fetch ticket types
  const ticketTypeIds = selectedTickets.map((t: any) => t.ticket_type_id);

  const { data: ticketTypes, error: ttErr } = await supabase
    .from('ticket_types')
    .select('*')
    .in('id', ticketTypeIds);

  if (ttErr || !ticketTypes || ticketTypes.length === 0)
    throw new Error("Invalid ticket types");

  // Pricing calc
  const { orderTotals, orderItems } = calculatePricing(selectedTickets, ticketTypes);

  const order_number = "ORD-" + randomUUID().split('-')[0].toUpperCase();

  // Insert order
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      order_number,
      customer_id: customer?.id || null,
      event_id: eventId,
      status: "pending",
      total_base_amount: orderTotals.base,
      total_gst_amount: orderTotals.gst,
      total_amount: orderTotals.total,
      payment_gateway: "mock"  // IMPORTANT
    })
    .select()
    .single();

  if (orderErr || !order) throw new Error("Failed to create order");

  const orderId = order.id;

  // Insert order items
  const itemPayload = orderItems.map(item => ({
    order_id: orderId,
    ticket_type_id: item.ticket_type_id,
    quantity: item.quantity,
    unit_base_price: item.unit_base_price,
    unit_gst_amount: item.unit_gst_amount,
    unit_total: item.unit_total,
    line_base_total: item.line_base_total,
    line_gst_total: item.line_gst_total,
    line_total: item.line_total
  }));

  const { error: oiErr } = await supabase
    .from('order_items')
    .insert(itemPayload);

  if (oiErr) throw new Error("Failed to insert order items");

  return {
    order_id: orderId,
    order_number,
    amount: orderTotals.total
  };
};