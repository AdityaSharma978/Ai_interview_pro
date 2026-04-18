const express = require('express');
const router = express.Router();
const Student = require('./models/studentModel');
const { sendVerificationEmail } = require('./services/emailService');

// Register after OTP verified
router.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, error: 'All fields required.' });
    const existing = await Student.findOne({ email });
    if (existing) return res.status(400).json({ success: false, error: 'Email already registered.' });
    // Only allow registration if OTP was verified (session.signup exists, matches email, and verified)
    if (!req.session.signup || req.session.signup.email !== email || !req.session.signup.verified) {
      return res.status(400).json({ success: false, error: 'OTP verification required.' });
    }
    const student = new Student({ name, email, password });
    await student.save();
    req.session.signup = null;
    res.json({ success: true });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'Failed to register.' });
  }
});

// Signup OTP routes
// Send OTP for signup
router.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, error: 'All fields required.' });
    const existing = await Student.findOne({ email });
    if (existing) return res.status(400).json({ success: false, error: 'Email already registered.' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    req.session.signup = {
      name,
      email,
      code,
      codeExpires: Date.now() + 10 * 60 * 1000,
      verified: false
    };
    await sendVerificationEmail(email, code);
    res.json({ success: true });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ success: false, error: 'Failed to send OTP.' });
  }
});

// Verify OTP and register
// Verify OTP only (do not register here)
router.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, error: 'All fields required.' });
    const signup = req.session.signup;
    if (!signup || signup.email !== email) return res.status(400).json({ success: false, error: 'Session expired. Please try again.' });
    if (signup.code !== otp) return res.status(400).json({ success: false, error: 'Invalid verification code.' });
    if (Date.now() > signup.codeExpires) return res.status(400).json({ success: false, error: 'Verification code expired. Please try again.' });
    // Check again for duplicate email (race condition)
    const existing = await Student.findOne({ email });
    if (existing) return res.status(400).json({ success: false, error: 'Email already registered.' });
    req.session.signup.verified = true;
    res.json({ success: true });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ success: false, error: 'Failed to verify OTP.' });
  }
});
const forgotController = require('./controllers/forgotController');
// Forgot password API
router.post('/api/forgot/send-code', forgotController.sendResetCode);
router.post('/api/forgot/verify-code', forgotController.verifyResetCode);
router.post('/api/forgot/reset', forgotController.resetPassword);
const sessionController = require('./controllers/sessionController');
const studentController = require('./controllers/studentController');
const passport = require('./config/passport');
// Google OAuth routes
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
const Session = require('./models/sessionModel');
const crypto = require('crypto');
router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/signup?google_no_account=1' }),
  async (req, res) => {
    // If user is not set, redirect to signup with error
    if (!req.user) {
      return res.redirect('/signup?google_no_account=1');
    }
    // Set session variables for Google user
    req.session.userId = req.user._id;
    req.session.name = req.user.name;

    // Find or create a Session for this user
    let session = await Session.findOne({ name: req.user.name });
    if (!session) { 
      const uniqueId = crypto.randomBytes(4).toString('hex');
      session = await Session.create({ uniqueId, name: req.user.name, spaces: [] });
    }
    req.session.uniqueId = session.uniqueId;
    res.redirect('/dashboard');
  }
);
// Signup and Login routes
router.get('/signup', (req, res) => res.render('signup', { error: null }));
router.post('/signup', studentController.signup);
router.get('/login', (req, res) => res.render('login', { error: null }));
router.post('/login', studentController.login);
const spaceController = require('./controllers/spaceController');
const interviewController = require('./controllers/interviewController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Simple protection middleware
const protect = (req, res, next) => {
  if (!req.session.uniqueId) {
    return res.redirect('/');
  }
  next();
};

// Ensure 'Resumes' folder exists
const resumeFolderPath = path.join(__dirname, '../public/Resumes');
if (!fs.existsSync(resumeFolderPath)) {
  fs.mkdirSync(resumeFolderPath, { recursive: true });
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, resumeFolderPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Welcome page
router.get('/', (req, res) => {
  if (req.session.uniqueId) {
    return res.redirect('/dashboard');
  }
  res.render('home');
});

router.get('/welcome', (req, res) => {
  res.render('welcome');
}
);

// Add this to routes.js
router.get('/api/questions-answers/:roundId', protect, interviewController.getQuestionsAnswers);

// Also add a route to download resumes
router.get('/space/resume/download/:id', protect, spaceController.downloadResume);

// Add this route for AJAX session creation
router.post('/api/start-new', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    // Call the session controller function
    const session = await sessionController.createSession(name);
    
    // Store in session cookie
    req.session.uniqueId = session.uniqueId;
    req.session.name = session.name;
    
    // Return success with the session data
    return res.json({ 
      success: true, 
      uniqueId: session.uniqueId,
      redirectUrl: '/dashboard'
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return res.status(500).json({ error: 'Error creating session' });
  }
});

// Add this route for AJAX session continuation
router.post('/api/continue-session', async (req, res) => {
  try {
    const { uniqueId } = req.body;
    
    if (!uniqueId || uniqueId.trim() === '') {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    // Attempt to find the session
    const session = await sessionController.findSession(uniqueId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found. Please check your ID.' });
    }
    
    // Store in session cookie
    req.session.uniqueId = session.uniqueId;
    req.session.name = session.name;
    
    // Return success
    return res.json({ 
      success: true, 
      redirectUrl: '/dashboard'
    });
  } catch (error) {
    console.error('Error continuing session:', error);
    return res.status(500).json({ error: 'Error accessing session' });
  }
});

// Session routes
router.post('/start-new', sessionController.startNew);
router.post('/continue-session', sessionController.continueSession);
router.get('/end-session', sessionController.endSession);

// Dashboard routes (protected)
router.get('/dashboard', protect, spaceController.getSpaces);
router.get('/profile', protect, sessionController.getProfile);
router.post('/update-profile', protect, sessionController.updateProfile);

// Space routes
router.post('/spaces/create', [protect, upload.single('resume')], spaceController.createSpace);
router.get('/space/:id', protect, spaceController.getSpaceDetails);

// Interview routes
router.get('/space/:spaceId/round/:roundName/start', protect, (req, res) => {
  const { spaceId, roundName } = req.params;
  res.render('student/interview-screen', { spaceId, roundName });
});

router.get('/generate-questions/:spaceId/:roundName', protect, interviewController.startRound);
router.post('/finish-round/:spaceId/:roundName', protect, interviewController.finishRound);

module.exports = router;