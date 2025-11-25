// packages/api/src/routes/scanner.ts
import express from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../utils/supabase';
import { verifyAndCheckin } from '../services/scannerService';

const router = express.Router();

// POST /api/scanner/login
router.post('/login', async (req, res) => {
  const { identifier, pin } = req.body;
  if (!identifier || !pin) return res.status(400).json({ error: 'Missing fields' });

  // Assuming users table stores scanner users and pin_hash
  const { data: user, error } = await supabase
    .from('users')
    .select('id,name,role,pin_hash,phone,email')
    .or(`phone.eq.${identifier},email.eq.${identifier},name.eq.${identifier}`)
    .eq('role', 'scanner')
    .single();

  if (error || !user) return res.status(401).json({ error: 'Invalid credentials' });

  // verify pin (if hashed)
  const isValid = /* implement proper hash check */ (pin === user.pin_hash); // replace with bcrypt compare
  if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '8h' });

  res.json({ token, user: { id: user.id, name: user.name } });
});

// POST /api/scanner/scan
router.post('/scan', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization' });
  const token = authHeader.split(' ')[1];
  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
    if (!payload || payload.role !== 'scanner') return res.status(403).json({ error: 'Forbidden' });
    const scannerUserId = payload.sub;

    const { qr, source, raw_code } = req.body;
    if (!qr && !raw_code) return res.status(400).json({ error: 'Provide qr or raw_code' });

    // prefer qr
    const scanPayload = qr ?? raw_code;
    const result = await verifyAndCheckin(scanPayload, scannerUserId, source || 'camera');

    res.json(result);
  } catch (err: any) {
    return res.status(401).json({ error: 'Invalid token', message: err.message });
  }
});

export default router;