// packages/api/src/services/scannerService.ts
import { supabase } from '../utils/supabase';

type ScanResult = {
  result: 'valid'|'used'|'invalid'|'error';
  ticket?: any;
  message?: string;
};

export async function verifyAndCheckin(qr: string, scannerUserId: string, source = 'camera'): Promise<ScanResult> {
  try {
    if (!process.env.QR_HMAC_SECRET) return { result: 'error', message: 'Server misconfiguration'};

    const parts = qr.split('.');
    if (parts.length !== 2) return { result: 'invalid', message: 'Bad QR format' };

    const [payloadB64, signatureB64] = parts;
    const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf8');

    const payload = JSON.parse(payloadJson);
    const ticketId = payload.ticket_id;
    const code = payload.code;

    // Fetch ticket (server-side authoritative)
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('id,unique_code,status,check_in_count,max_entries,holder_details,ticket_type_id,order_id')
      .eq('id', ticketId)
      .single();

    if (error || !tickets) return { result: 'invalid', message: 'Ticket not found' };

    // Confirm code matches
    if (tickets.unique_code !== code) return { result: 'invalid', message: 'Ticket code mismatch' };

    if (tickets.status !== 'active') return { result: 'invalid', message: `Ticket status: ${tickets.status}` };

    // Check entries
    const current = tickets.check_in_count ?? 0;
    const maxEntries = tickets.max_entries ?? 1;
    if (current >= maxEntries) {
      // still log the attempt as used
      await supabase.from('check_in_logs').insert({
        ticket_id: ticketId,
        scanner_user_id: scannerUserId,
        scan_time: new Date().toISOString(),
        scan_result: 'used',
        scan_source: source,
      });
      return { result: 'used', message: 'Ticket already used', ticket: tickets };
    }

    // Atomic increment and insert log — use RPC or transaction-ish pattern
    // Supabase/Postgres: use a function or run two queries inside a transaction.
    // Here is a safe approach using Postgres function (assumes function exists).
    const { data: txData, error: txErr } = await supabase.rpc('scanner_checkin', {
      p_ticket_id: ticketId,
      p_scanner_user_id: scannerUserId,
      p_scan_result: 'valid',
      p_scan_source: source,
    });

    if (txErr) {
      // fallback: try insert log and update count with optimistic check (last resort)
      await supabase.from('check_in_logs').insert({
        ticket_id: ticketId,
        scanner_user_id: scannerUserId,
        scan_time: new Date().toISOString(),
        scan_result: 'error',
        scan_source: source,
      });
      return { result: 'error', message: 'Check-in transaction failed' };
    }

    // return success
    return { result: 'valid', ticket: tickets, message: 'Check-in successful' };

  } catch (err: any) {
    return { result: 'error', message: err.message || 'Internal' };
  }
}
