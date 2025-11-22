// packages/api/src/index.ts

// 1. Load environment variables BEFORE anything else
import * as dotenv from "dotenv"
dotenv.config()

// 2. Now import the rest of your dependencies
import express from "express"
import cors from "cors"
import authRoutes from "./routes/auth.routes"
import scannerRoutes from "./routes/scanner.routes"
import organizerRoutes from "./routes/organizer.routes"
import tempRoutes from "./routes/temp.routes"
import publicRoutes from "./routes/public.routes"
import mockPaymentRoutes from "./routes/payments/mockPaymentRoutes";

// 3. Initialize express app
const app = express()

app.use(cors())
app.use(express.json())

// 4. Debug env check (optional — remove later)
console.log("SUPABASE_URL =", process.env.SUPABASE_URL || "MISSING")
console.log("SERVICE_ROLE_KEY =", process.env.SUPABASE_SERVICE_ROLE_KEY ? "LOADED" : "MISSING")

// 5. Health check
app.get("/health", (req, res) => {
  return res.json({ ok: true })
})

// 6. Route mounting
app.use("/api/auth", authRoutes)
app.use("/api/scanner", scannerRoutes)
app.use("/api/organizer", organizerRoutes)
app.use("/temp", tempRoutes)
app.use("/api", publicRoutes)
app.use("/api/payments", mockPaymentRoutes);

// 7. Start server
const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})