export const calculatePricing = (selectedTickets: any[], ticketTypes: any[]) => {
  let orderTotals = { base: 0, gst: 0, total: 0 };
  let orderItems: any[] = [];

  for (const sel of selectedTickets) {
    const tt = ticketTypes.find(t => t.id === sel.ticket_type_id);
    if (!tt) throw new Error("Invalid ticket type selected");

    const quantity = sel.quantity;
    const gstRate = tt.gst_rate / 100;

    const unit_base = Number(tt.base_price);
    const unit_gst = unit_base * gstRate;
    const unit_total = unit_base + unit_gst;

    const line_base = unit_base * quantity;
    const line_gst = unit_gst * quantity;
    const line_total = unit_total * quantity;

    orderTotals.base += line_base;
    orderTotals.gst += line_gst;
    orderTotals.total += line_total;

    orderItems.push({
      ticket_type_id: tt.id,
      quantity,
      unit_base_price: unit_base,
      unit_gst_amount: unit_gst,
      unit_total,
      line_base_total: line_base,
      line_gst_total: line_gst,
      line_total
    });
  }

  return { orderTotals, orderItems };
};