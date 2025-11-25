import * as scannerService from "../services/scanner/loginService";
import * as scanService from "../services/scanner/scanService";

export const scannerLogin = async (req, res) => {
  try {
    const { username, pin } = req.body;

    if (!username || !pin) {
      return res.status(400).json({ error: "username and pin required" });
    }

    const result = await scannerService.login(username, pin);
    return res.json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

export const scanTicket = async (req, res) => {
  try {
    const { ticket_code } = req.body;
    const scannerUser = req.user; // added by JWT middleware

    if (!ticket_code) {
      return res.status(400).json({ error: "ticket_code required" });
    }

    const result = await scanService.processScan(ticket_code, scannerUser.id);
    return res.json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};