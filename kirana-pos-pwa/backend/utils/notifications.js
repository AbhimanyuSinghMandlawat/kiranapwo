/**
 * Notification utilities — email and WhatsApp.
 */
const nodemailer = require("nodemailer");

async function sendEmailNotification(subject, htmlBody) {
  try {
    if (!process.env.SMTPUSER || !process.env.SMTPPASS) {
      return { sent: false, reason: "SMTP not configured" };
    }
    const transporter = nodemailer.createTransport({
      host: process.env.SMTPHOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTPPORT || "587", 10),
      secure: false,
      auth: { user: process.env.SMTPUSER, pass: process.env.SMTPPASS },
    });
    await transporter.sendMail({
      from: `"Kirana POS" <${process.env.SMTPUSER}>`,
      to: process.env.NOTIFYEMAIL || process.env.SMTPUSER,
      subject,
      html: htmlBody,
    });
    return { sent: true };
  } catch (err) {
    console.error("[EMAIL ERROR]", err.message);
    return { sent: false, reason: err.message };
  }
}

async function sendWhatsAppNotification(message) {
  try {
    if (!process.env.TWILIOSID || !process.env.TWILIOTOKEN) {
      return { sent: false, reason: "Twilio not configured" };
    }
    return { sent: false, reason: "Twilio integration pending" };
  } catch (err) {
    return { sent: false, reason: err.message };
  }
}

module.exports = { sendEmailNotification, sendWhatsAppNotification };
