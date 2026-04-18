const Student = require('../models/studentModel');
const { sendResetCode } = require('../services/emailService');

// In-memory store for reset codes (for demo; use DB/Redis in production)
const resetCodes = {};

exports.sendResetCode = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  const user = await Student.findOne({ email });
  if (!user) return res.status(404).json({ error: 'No user with that email.' });
  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  resetCodes[email] = { code, expires: Date.now() + 10 * 60 * 1000 };
  await sendResetCode(email, code);
  res.json({ success: true });
};

exports.verifyResetCode = (req, res) => {
  const { email, code } = req.body;
  const entry = resetCodes[email];
  if (!entry || entry.code !== code || Date.now() > entry.expires) {
    return res.status(400).json({ error: 'Invalid or expired code.' });
  }
  res.json({ success: true });
};

exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;
  const entry = resetCodes[email];
  if (!entry || entry.code !== code || Date.now() > entry.expires) {
    return res.status(400).json({ error: 'Invalid or expired code.' });
  }
  const user = await Student.findOne({ email });
  if (!user) return res.status(404).json({ error: 'No user with that email.' });
  user.password = newPassword;
  await user.save();
  delete resetCodes[email];
  res.json({ success: true });
};
