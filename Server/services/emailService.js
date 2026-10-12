const sgMail = require("@sendgrid/mail");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getEmailConfig = () => ({
  apiKey: process.env.SENDGRID_API_KEY?.trim(),
  fromEmail: process.env.SENDGRID_FROM_EMAIL?.trim(),
  fromName: process.env.SENDGRID_FROM_NAME?.trim() || "JibzConnect",
});

const sendEmail = async ({ to, subject, text, html } = {}) => {
  if (typeof to !== "string" || !EMAIL_PATTERN.test(to.trim())) {
    return { success: false, error: "A valid recipient email address is required." };
  }
  if (typeof subject !== "string" || !subject.trim()) {
    return { success: false, error: "An email subject is required." };
  }
  if (typeof text !== "string" || !text.trim()) {
    return { success: false, error: "Plain-text email content is required." };
  }
  if (typeof html !== "string" || !html.trim()) {
    return { success: false, error: "HTML email content is required." };
  }

  const { apiKey, fromEmail, fromName } = getEmailConfig();
  if (!apiKey || !fromEmail || !EMAIL_PATTERN.test(fromEmail)) {
    return {
      success: false,
      error: "SendGrid email configuration is incomplete or invalid.",
    };
  }

  sgMail.setApiKey(apiKey);

  try {
    await sgMail.send({
      to: to.trim(),
      from: { email: fromEmail, name: fromName },
      subject: subject.trim(),
      text,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("SendGrid email error:", {
      message: error.message,
      statusCode: error.code || error.response?.statusCode,
    });
    return { success: false, error: "Email could not be sent." };
  }
};

module.exports = { sendEmail };
