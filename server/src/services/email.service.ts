import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const isMock = !resendApiKey || resendApiKey === "mock" || resendApiKey === "re_xxxxxxxxxxxx";

const resend = isMock ? null : new Resend(resendApiKey);

export async function sendOTP(email: string, otpCode: string): Promise<void> {
  const isMock = !resendApiKey || resendApiKey === "mock" || resendApiKey === "re_xxxxxxxxxxxx";

  if (process.env.NODE_ENV === "production" && isMock) {
    throw new Error("Email service is not configured for production! Set a valid RESEND_API_KEY.");
  }

  if (isMock) {
    console.log(`
┌────────────────────────────────────────────────────────┐
│               🕹️  KL CONNECT SYSTEM  🕹️                  │
├────────────────────────────────────────────────────────┤
│  📧 Verification Code Dispatched                      │
│  📧 To: ${email.padEnd(46)} │
│                                                        │
│  ✨ Your 6-Digit OTP Verification Code is:              │
│  👾 >>>>>  ${otpCode.split("").join(" ")}  <<<<<             │
│                                                        │
│  ⏳ Code expires in 10 minutes.                        │
└────────────────────────────────────────────────────────┘
`);
    return;
  }

  try {
    if (!resend) throw new Error("Resend API key not configured");
    
    await resend.emails.send({
      from: "KL Connect <onboarding@resend.dev>",
      to: email,
      subject: "Your KL Connect Verification Code",
      html: `
        <div style="font-family: monospace; max-width: 400px; margin: 0 auto; border: 3px double #2A3FE5; padding: 20px; background-color: #000; color: #fff;">
          <h2 style="text-align: center; color: #2A3FE5; text-transform: uppercase;">🎮 KL Connect 🎮</h2>
          <p style="text-align: center; text-transform: uppercase; font-size: 12px; color: #6b7280;">Academic Messaging Verification</p>
          <div style="border: 2px dashed #F4B9B0; padding: 15px; margin: 20px 0; text-align: center;">
            <p style="font-size: 11px; margin: 0 0 10px 0; text-transform: uppercase; color: #F4B9B0;">Your Verification Code</p>
            <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 0; color: #fff;">${otpCode}</p>
          </div>
          <p style="color: #6b7280; font-size: 10px; text-align: center; text-transform: uppercase;">This code will expire in 10 minutes.</p>
          <p style="color: #6b7280; font-size: 8px; text-align: center; margin-top: 20px; border-top: 1px dotted #2A3FE5; padding-top: 10px;">
            If you did not request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    });
  } catch (error: any) {
    if (process.env.NODE_ENV !== "production") {
      // Only log OTP fallback in development
      console.warn("🔴 Failed to send email via Resend, falling back to console logging:", error.message || error);
      console.log(`
┌────────────────────────────────────────────────────────┐
│           🕹️  KL CONNECT SYSTEM (FALLBACK)  🕹️           │
├────────────────────────────────────────────────────────┤
│  📧 Verification Code (Email Failed, Logged Here)      │
│  To: ${email.padEnd(46)} │
│                                                        │
│  ✨ Your 6-Digit OTP Verification Code is:              │
│  👾 >>>>>  ${otpCode.split("").join(" ")}  <<<<<             │
│                                                        │
│  ⏳ Code expires in 10 minutes.                        │
└────────────────────────────────────────────────────────┘
`);
    } else {
      console.error("❌ Failed to send OTP email. OTP NOT logged for security.");
      throw error;
    }
  }
}

