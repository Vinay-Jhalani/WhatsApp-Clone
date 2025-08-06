import nodemailer from "nodemailer";

const formattedDate = new Date(Date.now())
  .toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
  .replace(/ /g, ", ");

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    transporter.verify((error, success) => {
      if (error) {
        console.error("Gmail service verification failed:", error);
      } else {
        console.log("Gmail configured properly and ready to send emails.");
      }
    });
  }
  return transporter;
};

const sendOtpToEmail = async (email, otp) => {
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Verify OTP</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        margin: 0;
        padding: 0;
        font-family: 'Poppins', sans-serif;
        background-color: #121212;
        color: #ffffff;
        font-size: 14px;
      }
      table {
        border-spacing: 0;
      }
      .container {
        max-width: 680px;
        margin: auto;
        background-color: #121212;
        background-image: url('https://cdn.discordapp.com/attachments/1170414652698669227/1278240350774755349/20240828_120003_0000.png');
        background-repeat: no-repeat;
        background-size: cover;
        background-position: top center;
        padding: 45px 30px 60px;
      }
      .card {
        padding: 60px 30px;
        background: #1e1e1e;
        border-radius: 20px;
        box-shadow: 0 5px 30px rgba(0,0,0,0.5);
        text-align: center;
        margin-top: 30px;
      }
      .otp {
        margin-top: 30px;
        font-size: 32px;
        font-weight: 700;
        letter-spacing: 12px;
        color: #00cec9;
      }
      .footer {
        margin-top: 60px;
        font-size: 13px;
        color: #888888;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <!-- Header -->
      <table width="100%">
        <tr>
          <td align="left">
            <h3 style="margin: 0; color: #fff;">WhatsApp Clone</h3>
          </td>
          <td align="right" style="color: #bbbbbb; font-size: 16px;">${formattedDate}</td>
        </tr>
      </table>

      <!-- OTP Card -->
      <div class="card">
        <h1 style="font-size: 26px; font-weight: 600; color: #ffffff; margin: 0;">Verify Your Email</h1>
        <p style="margin-top: 16px; font-size: 15px; color: #bbbbbb; line-height: 1.6;">
          Thank you for joining my <strong style="color: #ffffff;">Whatsapp Clone</strong>! Please use the OTP below to verify your email address. This code is valid for <strong style="color: #ffffff;">10 minutes</strong>. Do not share this code with anyone.
        </p>
        <div class="otp">${otp}</div>
      </div>

      <!-- Footer -->
      <div class="footer">
        Need Full-stack developer? Contact me at <a href="mailto:vinayjhalani.dev@gmail.com" style="color: #74b9ff; text-decoration: none;">Vinayjhalani.dev@gmail.com</a>
        <div style="margin-top: 30px; border-top: 1px solid #2d3436; padding-top: 20px;">
          <p style="font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 4px;">Vinay Jhalani</p>
          <p style="color: #888888; margin: 0;">❤ INDIA ❤</p>
          <div style="margin-top: 16px;">
            <a href="https://www.instagram.com/vinay_jhalani" target="_blank">
              <img src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661504218208_684135/email-template-icon-instagram" alt="Instagram" width="30" style="margin: 0 5px;" />
            </a>
            <a href="https://x.com/Vinay_Jhalani" target="_blank">
              <img src="https://archisketch-resources.s3.ap-northeast-2.amazonaws.com/vrstyler/1661503043040_372004/email-template-icon-twitter" alt="Twitter" width="30" style="margin: 0 5px;" />
            </a>
          </div>
          <p style="color: #636e72; margin-top: 16px; font-size: 12px;">&copy; 2025 - Vinay Jhalani - All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
</html>
`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"WhatsApp Clone" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify Your Email - WhatsApp Clone",
    html: html,
  });
};

export default sendOtpToEmail;
