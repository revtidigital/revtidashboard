import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

function getInviteEmailHtml(actionLink: string, email: string, origin: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to Revti Workspace</title>
  <style>
    body {
      background-color: #07090F;
      color: #E2E8F0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .email-wrapper {
      width: 100%;
      background-color: #07090F;
      padding: 40px 0;
    }
    .email-container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #0F1629;
      border: 1px solid #1E2D47;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }
    .email-header {
      background: linear-gradient(135deg, #1E1B4B 0%, #0F1629 100%);
      padding: 30px;
      text-align: center;
      border-bottom: 1px solid #1E2D47;
    }
    .logo-text {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 2px;
      color: #FFFFFF;
      margin: 0;
      text-transform: uppercase;
    }
    .logo-subtitle {
      font-size: 11px;
      color: #38BDF8;
      font-weight: 600;
      letter-spacing: 3px;
      margin-top: 5px;
      text-transform: uppercase;
    }
    .email-body {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
      margin-top: 0;
      margin-bottom: 15px;
    }
    .description {
      font-size: 15px;
      line-height: 1.6;
      color: #94A3B8;
      margin-bottom: 30px;
    }
    .btn-container {
      text-align: center;
      margin-bottom: 30px;
    }
    .btn-primary {
      display: inline-block;
      background-color: #7C5CFC;
      color: #FFFFFF !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 30px;
      border-radius: 8px;
    }
    .meta-info {
      background-color: #07090F;
      border: 1px solid #1E2D47;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 30px;
    }
    .meta-item {
      font-size: 13px;
      color: #94A3B8;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    .meta-item:last-child {
      margin-bottom: 0;
    }
    .meta-label {
      font-weight: 600;
      color: #38BDF8;
    }
    .link-fallback {
      font-size: 12px;
      color: #64748B;
      word-break: break-all;
      line-height: 1.5;
      border-top: 1px solid #1E2D47;
      padding-top: 20px;
    }
    .link-fallback a {
      color: #38BDF8;
      text-decoration: none;
    }
    .email-footer {
      padding: 20px 30px 30px;
      text-align: center;
      border-top: 1px solid #1E2D47;
    }
    .footer-text {
      font-size: 12px;
      color: #64748B;
      line-height: 1.5;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <h1 class="logo-text">Revti Workspace</h1>
        <div class="logo-subtitle">Operating System</div>
      </div>
      <div class="email-body">
        <h2 class="greeting">You've Been Invited!</h2>
        <p class="description">
          You have been invited to join <strong>Revti Workspace</strong>, the centralized operations hub for Revti Digital. Click the button below to set up your account and get started.
        </p>
        
        <div class="btn-container">
          <a href="${actionLink}" class="btn-primary" style="color: #FFFFFF;">Accept Invitation & Setup Account</a>
        </div>
        
        <div class="meta-info">
          <div class="meta-item">
            <span class="meta-label">Workspace URL:</span> ${origin}
          </div>
          <div class="meta-item">
            <span class="meta-label">Invited Email:</span> ${email}
          </div>
          <div class="meta-item">
            <span class="meta-label">Expiration:</span> This link will expire in 24 hours.
          </div>
        </div>
        
        <div class="link-fallback">
          If the button doesn't work, copy and paste this URL into your browser:
          <br>
          <a href="${actionLink}">${actionLink}</a>
        </div>
      </div>
      <div class="email-footer">
        <p class="footer-text">
          © 2026 Revti Digital. All rights reserved.
          <br>
          This is an automated operational email. If you did not expect this invitation, please ignore it.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export async function POST(req: NextRequest) {
  try {
    const { email, role = "view" } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      return NextResponse.json({ 
        error: "SMTP configuration is missing. Please set SMTP_USER and SMTP_PASS environment variables on the server." 
      }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Supabase is not configured on the server" }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Generate the invite action link from Supabase without sending the email
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "invite",
      email: email,
      options: {
        redirectTo: `${req.nextUrl.origin}/login`,
        data: { role, full_name: email.split("@")[0] }
      }
    });

    if (linkError || !linkData) {
      return NextResponse.json({ error: linkError?.message || "Failed to generate invite link" }, { status: 400 });
    }

    const actionLink = linkData.properties.action_link;

    // Send the email directly using custom SMTP settings
    const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
    const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const mailOptions = {
      from: `"Revti Workspace" <${smtpUser}>`,
      to: email,
      subject: "Invitation to join Revti Workspace",
      html: getInviteEmailHtml(actionLink, email, req.nextUrl.origin),
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, user: linkData.user });
  } catch (error: any) {
    console.error("Failed to process invitation:", error);
    return NextResponse.json({ error: error?.message || "An unexpected error occurred" }, { status: 500 });
  }
}
