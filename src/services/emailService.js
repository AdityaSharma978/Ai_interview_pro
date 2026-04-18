const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

async function sendResetCode(email, code) {
  const mailOptions = {
    from: `InterviewAI Pro <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'InterviewAI Pro Password Reset Code',
    html: `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="max-width:420px;width:100%;margin:32px auto 0 auto;background:#fff;border-radius:14px;box-shadow:0 4px 24px rgba(138,43,226,0.08);font-family:'Plus Jakarta Sans',Arial,sans-serif;">
        <tr>
          <td style="padding:32px 28px 24px 28px;">
            <div style="text-align:center;margin-bottom:18px;">
              <img src="https://img.icons8.com/ios-filled/50/8A2BE2/key-security.png" width="38" height="38" alt="key" style="margin-bottom:8px;"/>
              <div style="font-family:'Syne',Arial,sans-serif;font-size:1.2rem;font-weight:800;color:#222;">InterviewAI <span style="color:#8A2BE2;">Pro</span></div>
            </div>
            <h2 style="font-family:'Syne',Arial,sans-serif;font-size:1.25rem;font-weight:700;margin:0 0 10px 0;color:#222;text-align:center;">Password Reset Code</h2>
            <p style="color:#444;font-size:1rem;margin:0 0 18px 0;text-align:center;">Use the code below to reset your password. This code will expire in <b>10 minutes</b>.</p>
            <div style="font-size:2.1rem;font-weight:900;letter-spacing:10px;color:#8A2BE2;background:#f3f0fa;padding:16px 0;border-radius:10px;text-align:center;margin-bottom:18px;word-break:break-all;">${code}</div>
            <p style="color:#888;font-size:0.98rem;margin:0 0 18px 0;text-align:center;">If you did not request a password reset, you can safely ignore this email.</p>
            <div style="margin:24px 0 0 0;text-align:center;">
              <a href="https://your-app-url.com/login" style="display:inline-block;padding:12px 28px;background:#8A2BE2;color:#fff;font-weight:700;font-size:1.05rem;border-radius:8px;text-decoration:none;">Go to App</a>
            </div>
            <div style="margin-top:24px;text-align:center;color:#bbb;font-size:0.93rem;">— The InterviewAI Pro Team</div>
          </td>
        </tr>
      </table>
    `
  };
  return transporter.sendMail(mailOptions);
}

async function sendVerificationEmail(email, code) {
  const mailOptions = {
    from: `InterviewAI Pro <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'InterviewAI Pro Email Verification',
    html: `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="max-width:420px;width:100%;margin:32px auto 0 auto;background:#fff;border-radius:14px;box-shadow:0 4px 24px rgba(138,43,226,0.08);font-family:'Plus Jakarta Sans',Arial,sans-serif;">
        <tr>
          <td style="padding:32px 28px 24px 28px;">
            <div style="text-align:center;margin-bottom:18px;">
              <img src="https://img.icons8.com/ios-filled/50/8A2BE2/secured-letter.png" width="38" height="38" alt="verify" style="margin-bottom:8px;"/>
              <div style="font-family:'Syne',Arial,sans-serif;font-size:1.2rem;font-weight:800;color:#222;">InterviewAI <span style="color:#8A2BE2;">Pro</span></div>
            </div>
            <h2 style="font-family:'Syne',Arial,sans-serif;font-size:1.25rem;font-weight:700;margin:0 0 10px 0;color:#222;text-align:center;">Verify Your Email</h2>
            <p style="color:#444;font-size:1rem;margin:0 0 18px 0;text-align:center;">Use the code below to verify your email address. This code will expire in <b>10 minutes</b>.</p>
            <div style="font-size:2.1rem;font-weight:900;letter-spacing:10px;color:#8A2BE2;background:#f3f0fa;padding:16px 0;border-radius:10px;text-align:center;margin-bottom:18px;word-break:break-all;">${code}</div>
            <p style="color:#888;font-size:0.98rem;margin:0 0 18px 0;text-align:center;">If you did not sign up, you can safely ignore this email.</p>
            <div style="margin:24px 0 0 0;text-align:center;">
              <a href="https://your-app-url.com/login" style="display:inline-block;padding:12px 28px;background:#8A2BE2;color:#fff;font-weight:700;font-size:1.05rem;border-radius:8px;text-decoration:none;">Go to App</a>
            </div>
            <div style="margin-top:24px;text-align:center;color:#bbb;font-size:0.93rem;">— The InterviewAI Pro Team</div>
          </td>
        </tr>
      </table>
    `
  };
  return transporter.sendMail(mailOptions);
}

module.exports = { sendResetCode, sendVerificationEmail };

// async function sendResetCode(email, code) {
//   const mailOptions = {
//     from: `InterviewAI Pro <${process.env.GMAIL_USER}>`,
//     to: email,
//     subject: 'InterviewAI Pro Password Reset Code',
//     html: `<p>Your password reset code is:</p><h2>${code}</h2><p>This code will expire in 10 minutes.</p>`
//   };
//   return transporter.sendMail(mailOptions);
// }
