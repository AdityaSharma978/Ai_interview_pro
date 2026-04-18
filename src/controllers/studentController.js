// Delete account and all related data
const Session = require('../models/sessionModel');
const Space = require('../models/spaceModel');
const QuestionAnswer = require('../models/questionAnswerModel');

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.session.userId;
    const userName = req.session.name;
    const uniqueId = req.session.uniqueId;
    const user = await Student.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    // Delete all sessions for this user
    await Session.deleteMany({ name: userName });
    // Delete all spaces for this user (by uniqueId)
    const spaces = await Space.find({ studentId: uniqueId });
    const spaceIds = spaces.map(s => s._id);
    await Space.deleteMany({ studentId: uniqueId });
    // Delete all question-answers for these spaces
    await QuestionAnswer.deleteMany({ spaceId: { $in: spaceIds } });
    // Delete the user
    await Student.deleteOne({ _id: userId });
    // Destroy session
    req.session.destroy(err => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).send('Account deleted, but logout failed');
      }
      res.redirect('/');
    });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).send('Failed to delete account');
  }
};
const Student = require('../models/studentModel');

const { sendVerificationEmail } = require('../services/emailService');
const crypto = require('crypto');

exports.signup = async (req, res) => {
  try {
    const { fname, lname, email, password, verificationCode } = req.body;
    if (!fname || !lname || !email || !password) {
      return res.render('signup', { error: 'All fields are required.' });
    }
    const existing = await Student.findOne({ email });
    if (existing) {
      return res.render('signup', { error: 'Email already registered.' });
    }

    // If verificationCode is not provided, send code and ask user to verify
    if (!verificationCode) {
      // Generate code and send email
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      req.session.signup = { fname, lname, email, password, code, codeExpires: Date.now() + 10 * 60 * 1000 };
      await sendVerificationEmail(email, code);
      return res.render('signup', { error: null, verify: true, email });
    }

    // Validate code
    if (!req.session.signup || req.session.signup.email !== email) {
      return res.render('signup', { error: 'Session expired. Please try again.' });
    }
    if (req.session.signup.code !== verificationCode) {
      return res.render('signup', { error: 'Invalid verification code.', verify: true, email });
    }
    if (Date.now() > req.session.signup.codeExpires) {
      return res.render('signup', { error: 'Verification code expired. Please try again.', verify: true, email });
    }

    // Create user
    const name = req.session.signup.fname + ' ' + req.session.signup.lname;
    const student = new Student({ name, email, password });
    await student.save();
    req.session.signup = null;
    res.render('signup', { error: null, success: true });
  } catch (err) {
    console.error('Signup error:', err);
    res.render('signup', { error: 'Signup failed. Try again.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.render('login', { error: 'Email and password required.' });
    }
    const student = await Student.findOne({ email });
    if (!student || !(await student.matchPassword(password))) {
      return res.render('login', { error: 'Invalid credentials.' });
    }
    req.session.userId = student._id;
    req.session.name = student.name || student.email;

    // Find or create a Session for this user (by name)
    const Session = require('../models/sessionModel');
    const crypto = require('crypto');
    let session = await Session.findOne({ name: student.name });
    if (!session) {
      const uniqueId = crypto.randomBytes(4).toString('hex');
      session = await Session.create({ uniqueId, name: student.name, spaces: [] });
    }
    req.session.uniqueId = session.uniqueId;
    res.redirect('/dashboard');
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { error: 'Login failed. Try again.' });
  }
};
