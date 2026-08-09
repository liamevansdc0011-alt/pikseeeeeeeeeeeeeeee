import "dotenv/config";
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const SITE_PASSWORD = process.env.SITE_PASSWORD || "";

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Public folder serve karega
app.use(express.static(path.join(__dirname, "public")));

// Dashboard page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Dashboard login
app.post("/api/auth", (req, res) => {
  const password = String(req.body?.password || "");

  if (!SITE_PASSWORD) {
    return res.status(500).json({
      success: false,
      message: "SITE_PASSWORD is not configured."
    });
  }

  if (password !== SITE_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: "Incorrect password"
    });
  }

  res.json({ success: true });
});

// Gmail verification
app.post("/api/verify", async (req, res) => {
  const email = String(req.body?.email || "").trim();
  const appPassword = String(req.body?.appPassword || "").trim();

  if (!email || !appPassword) {
    return res.status(400).json({
      success: false,
      message: "Gmail and App Password are required."
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: email,
        pass: appPassword
      }
    });

    await transporter.verify();

    res.json({
      success: true,
      message: "Gmail connection verified."
    });
  } catch (error) {
    console.error(error.message);

    res.status(401).json({
      success: false,
      message: "Gmail verification failed."
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Email server is running."
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
