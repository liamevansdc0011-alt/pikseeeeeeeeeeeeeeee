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

app.use(express.static(path.join(__dirname, "public")));

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(email || "").trim()
  );
}

function createTransporter(email, appPassword) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: String(email).trim(),
      pass: String(appPassword).trim()
    }
  });
}

/*
|--------------------------------------------------------------------------
| Dashboard login
|--------------------------------------------------------------------------
*/

app.post("/api/auth", (req, res) => {
  const password = String(req.body?.password || "");

  if (!SITE_PASSWORD) {
    return res.status(500).json({
      success: false,
      message: "SITE_PASSWORD is not configured on the server."
    });
  }

  if (password !== SITE_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: "Incorrect password"
    });
  }

  return res.json({
    success: true
  });
});

/*
|--------------------------------------------------------------------------
| Gmail verification
|--------------------------------------------------------------------------
*/

app.post("/api/verify", async (req, res) => {
  const email = String(req.body?.email || "").trim();
  const appPassword = String(req.body?.appPassword || "").trim();

  if (!email || !appPassword) {
    return res.status(400).json({
      success: false,
      message: "Gmail address and App Password are required."
    });
  }

  if (!validEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid Gmail address."
    });
  }

  try {
    const transporter = createTransporter(email, appPassword);

    await transporter.verify();

    return res.json({
      success: true,
      message: "Gmail SMTP connection verified."
    });
  } catch (error) {
    console.error("Gmail verification error:", error.message);

    return res.status(401).json({
      success: false,
      message:
        "Gmail verification failed. Check your Gmail address and App Password."
    });
  }
});

/*
|--------------------------------------------------------------------------
| Send emails
|--------------------------------------------------------------------------
*/

app.post("/api/send", async (req, res) => {
  const {
    email,
    appPassword,
    senderName,
    subject,
    messageBody,
    recipients
  } = req.body || {};

  const senderEmail = String(email || "").trim();
  const password = String(appPassword || "").trim();
  const name = String(senderName || "").trim();
  const mailSubject = String(subject || "").trim();
  const body = String(messageBody || "");

  if (!senderEmail || !password || !mailSubject || !body) {
    return res.status(400).json({
      success: false,
      message: "Please complete all required fields."
    });
  }

  if (!validEmail(senderEmail)) {
    return res.status(400).json({
      success: false,
      message: "Invalid sender email."
    });
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide at least one recipient."
    });
  }

  const cleanRecipients = [
    ...new Set(
      recipients
        .map((item) => String(item).trim().toLowerCase())
        .filter(validEmail)
    )
  ];

  if (cleanRecipients.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid recipient addresses found."
    });
  }

  try {
    const transporter = createTransporter(senderEmail, password);

    await transporter.verify();

    const results = [];

    for (const recipient of cleanRecipients) {
      try {
        const info = await transporter.sendMail({
          from: name
            ? `"${name.replace(/["<>]/g, "")}" <${senderEmail}>`
            : senderEmail,
          to: recipient,
          subject: mailSubject,
          text: body
        });

        results.push({
          success: true,
          recipient,
          messageId: info.messageId
        });
      } catch (error) {
        console.error(
          `Send failed for ${recipient}:`,
          error.message
        );

        results.push({
          success: false,
          recipient,
          error: error.message
        });
      }
    }

    const sent = results.filter((item) => item.success).length;
    const failed = results.length - sent;

    return res.json({
      success: true,
      sent,
      failed,
      results
    });
  } catch (error) {
    console.error("SMTP error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Gmail SMTP authentication failed."
    });
  }
});

/*
|--------------------------------------------------------------------------
| Health check
|--------------------------------------------------------------------------
*/

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Email server is running."
  });
});

/*
|--------------------------------------------------------------------------
| Start
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
