const { Resend } = require('resend');

// Only instantiate Resend if the key exists to prevent crashing the server on startup
let resend;
if (!process.env.RESEND_API_KEY) {
  console.error('[Email] ✗ RESEND_API_KEY is not set in environment variables — emails will fail to send!');
  console.error('[Email] Add RESEND_API_KEY in the Render Dashboard -> Environment variables.');
} else {
  resend = new Resend(process.env.RESEND_API_KEY);
  console.log('[Email] ✓ Resend email client ready — emails will be sent via', process.env.EMAIL_FROM || 'onboarding@resend.dev');
}

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
    console.log(`Purpose: ${purpose === 'verification' ? 'Email Verification' : purpose === 'reset' ? 'Password Reset' : purpose === 'delete' ? 'Account Deletion' : 'Unknown'}`);
    console.log(`OTP: ${otp}`);
    console.log(`Expires: 10 minutes from now`);
    console.log('==========================================\n');
    return true;
  }

  const subject = purpose === 'verification' 
    ? 'CodeQuest - Email Verification OTP' 
    : purpose === 'reset'
    ? 'CodeQuest - Password Reset OTP'
    : purpose === 'delete'
    ? 'CodeQuest - Account Deletion OTP'
    : 'CodeQuest - OTP Verification';
  
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
    : purpose === 'reset'
    ? `
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
    `
    : purpose === 'delete'
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">CodeQuest</h1>
        </div>
        <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin-top: 0;">Account Deletion Request</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
            We received a request to permanently delete your CodeQuest account. If you proceed, all your data will be permanently lost.
          </p>
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px solid #fee2e2;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Registration Number:</p>
            <p style="margin: 5px 0 15px 0; color: #1f2937; font-size: 18px; font-weight: bold;">${registrationNo}</p>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Your Deletion OTP:</p>
            <p style="margin: 5px 0 0 0; color: #ef4444; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${otp}</p>
          </div>
          <p style="color: #ef4444; font-size: 14px; margin: 20px 0; font-weight: bold;">
            ⚠️ This action is irreversible. The OTP will expire in 10 minutes.
          </p>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
            If you did not request to delete your account, please ignore this email and your account will remain secure.
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
          <h2 style="color: #1f2937; margin-top: 0;">OTP Verification</h2>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Your OTP:</p>
            <p style="margin: 5px 0 0 0; color: #667eea; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${otp}</p>
          </div>
        </div>
      </div>
    `;

  const fromAddress = process.env.EMAIL_FROM || 'CodeQuest <onboarding@resend.dev>';

  if (!resend) {
    console.error('[Email] ✗ Cannot send email: RESEND_API_KEY is missing in environment variables.');
    throw new Error('Email service is not configured properly on the server.');
  }

  try {
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject: subject,
      html: message,
    });

    if (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send email');
    }

    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send email');
  }
};

module.exports = { generateOTP, sendOTPEmail };
