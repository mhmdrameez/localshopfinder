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

export const sendBilledHitChargeEmail = async (
    to: string,
    billedHitCount: number,
    chargedAmountRs: number,
    payNowLink: string,
    _upiPayLink: string,
    rawUpiLink: string
) => {
    const mailOptions = {
        from: `"Local Shop Finder" <${process.env.GMAIL_USER}>`,
        to,
        subject: `Usage Charge Notice: Rs ${chargedAmountRs} billed`,
        html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background:#ffffff;">
        <h2 style="color: #4F46E5; margin-top: 0; margin-bottom: 8px;">Local Shop Finder Billing</h2>
        <p style="margin:0 0 12px 0; color:#334155;">Your account used one billed fetch.</p>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:16px;">
          <p style="margin:0 0 6px 0;"><strong>Charge:</strong> Rs ${chargedAmountRs}</p>
          <p style="margin:0;"><strong>Total billed hits:</strong> ${billedHitCount}</p>
        </div>
        <div style="margin: 14px 0 18px 0;">
          <a href="${payNowLink}" style="display:inline-block;background:#1a73e8;color:#fff;text-decoration:none;padding:12px 16px;border-radius:8px;font-weight:700;">Pay Now</a>
        </div>
        <p style="color:#475569;font-size:13px; margin-bottom:6px;">If your mail app blocks app links, copy this UPI link:</p>
        <p style="word-break: break-all; color:#374151; font-size:12px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:8px; padding:8px;">${rawUpiLink}</p>
      </div>
    `,
    };

    await transporter.sendMail(mailOptions);
};
