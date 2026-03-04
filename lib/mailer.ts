import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

export const sendOTP = async (to: string, otp: string) => {
    const mailOptions = {
        from: `"Local Shop Finder" <${process.env.GMAIL_USER}>`,
        to,
        subject: 'Your Local Shop Finder Verification Code',
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; max-width: 500px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4F46E5;">Local Shop Finder</h2>
        <p>Thank you for registering! Please use the 6-digit verification code below to verify your email address. It expires in 5 minutes.</p>
        <div style="background-color: #f3f4f6; font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #666; font-size: 14px;">If you did not request this code, you can safely ignore this email.</p>
      </div>
    `,
    };

    await transporter.sendMail(mailOptions);
};

export const sendPasswordResetOTP = async (to: string, otp: string) => {
    const mailOptions = {
        from: `"Local Shop Finder" <${process.env.GMAIL_USER}>`,
        to,
        subject: 'Reset Your Local Shop Finder Password',
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center; max-width: 500px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #4F46E5;">Local Shop Finder</h2>
        <p>Use this 6-digit OTP to reset your password. It expires in 5 minutes.</p>
        <div style="background-color: #f3f4f6; font-size: 32px; font-weight: bold; letter-spacing: 5px; padding: 20px; border-radius: 8px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #666; font-size: 14px;">If you did not request this reset, you can ignore this email.</p>
      </div>
    `,
    };

    await transporter.sendMail(mailOptions);
};
