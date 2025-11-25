import { supabase } from "../../utils/supabase";

export async function processScan(ticket_code: string, scanner_user_id: string) {

  // 1. Find ticket
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("unique_code", ticket_code)
    .single();

  if (error || !ticket) {
    return { result: "invalid" };
  }

  // 2. Cancelled/Refunded
  if (ticket.status === "cancelled" || ticket.status === "refunded") {
    await logScan(ticket.id, scanner_user_id, "invalid");
    return { result: "invalid" };
  }

  // 3. Single entry
  if (ticket.max_entries === 1 && ticket.check_in_count >= 1) {
    await logScan(ticket.id, scanner_user_id, "used");
    return { result: "used" };
  }

  // 4. Multi entry limit reached
  if (ticket.max_entries > 1 && ticket.check_in_count >= ticket.max_entries) {
    await logScan(ticket.id, scanner_user_id, "used");
    return { result: "used" };
  }

  // 5. Mark as check-in success
  const newCount = ticket.check_in_count + 1;

  // update ticket
  await supabase
    .from("tickets")
    .update({
      check_in_count: newCount,
      status: newCount >= ticket.max_entries ? "used" : ticket.status
    })
    .eq("id", ticket.id);

  // log
  await logScan(ticket.id, scanner_user_id, "valid");

  return {
    result: "valid",
    ticket_id: ticket.id,
    ticket_type_id: ticket.ticket_type_id,
    holder_name: ticket.holder_name,
    holder_email: ticket.holder_email,
    holder_phone: ticket.holder_phone,
    scan_time: new Date().toISOString()
  };
}

// HELPERS
async function logScan(ticket_id, scanner_user_id, result) {
  await supabase.from("check_in_logs").insert({
    ticket_id,
    scanner_user_id,
    scan_result: result,
    scan_time: new Date().toISOString()
  });
}