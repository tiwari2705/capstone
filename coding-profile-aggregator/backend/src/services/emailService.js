const nodemailer = require('nodemailer');

// Gmail SMTP transporter — uses EMAIL_USER + EMAIL_PASSWORD (App Password)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL on port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  connectionTimeout: 10000, // 10 s — fail fast instead of hanging the request
  greetingTimeout: 10000,
  socketTimeout: 15000
});

// Verify SMTP connection at startup
transporter.verify((err) => {
  if (err) {
    console.error('[Email] ✗ SMTP connection failed:', err.message);
    console.error('[Email] Check EMAIL_USER and EMAIL_PASSWORD in your environment variables.');
  } else {
    console.log('[Email] ✓ SMTP connection ready — emails will be sent via', process.env.EMAIL_USER);
  }
});

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, otp, registrationNo, purpose = 'verification') => {
  // Development mode - log OTP to console instead of sending email
  if (process.env.NODE_ENV === 'development' && process.env.EMAIL_DEV_MODE === 'true') {
    console.log('\n========== OTP EMAIL (DEV MODE) ==========');
    console.log(`To: ${email}`);
    console.log(`Registration No: ${registrationNo}`);
    console.log(`Purpose: ${purpose === 'verification' ? 'Email Verification' : 'Password Reset'}`);
    console.log(`OTP: ${otp}`);
    console.log(`Expires: 10 minutes from now`);
    console.log('==========================================\n');
    return true;
  }

  const subject = purpose === 'verification' 
    ? 'CodeQuest - Email Verification OTP' 
    : 'CodeQuest - Password Reset OTP';
  
  const message = purpose === 'verification'
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">CodeQuest</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Email Verification</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            Thank you for registering with CodeQuest! Please use the following OTP to verify your email address.
          </p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Registration Number:</p>
            <p style="margin: 5px 0 15px 0; color: #1f2937; font-size: 18px; font-weight: bold;">${registrationNo}</p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Your OTP:</p>
            <p style="margin: 5px 0 0 0; color: #667eea; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${otp}</p>
          </div>
          <p style="color: #ef4444; font-size: 14px; margin: 20px 0;">
            ⚠️ This OTP will expire in 10 minutes.
          </p>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            If you didn't request this verification, please ignore this email.
          </p>
        </div>
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© 2024 CodeQuest. All rights reserved.</p>
        </div>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">CodeQuest</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password. Please use the following OTP to proceed.
          </p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Registration Number:</p>
            <p style="margin: 5px 0 15px 0; color: #1f2937; font-size: 18px; font-weight: bold;">${registrationNo}</p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Your OTP:</p>
            <p style="margin: 5px 0 0 0; color: #667eea; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${otp}</p>
          </div>
          <p style="color: #ef4444; font-size: 14px; margin: 20px 0;">
            ⚠️ This OTP will expire in 10 minutes.
          </p>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            If you didn't request a password reset, please ignore this email and your password will remain unchanged.
          </p>
        </div>
        <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>© 2024 CodeQuest. All rights reserved.</p>
        </div>
      </div>
    `;

  const mailOptions = {
    from: `"CodeQuest" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: subject,
    html: message
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};

module.exports = { generateOTP, sendOTPEmail };
