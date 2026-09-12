import nodemailer from "nodemailer";

function zohoConfig() {
  const user = process.env.ZOHO_MAIL_USER?.trim();
  const pass = process.env.ZOHO_MAIL_APP_PASSWORD?.trim();
  const from = process.env.ZOHO_MAIL_FROM?.trim() || user;
  const host = process.env.ZOHO_SMTP_HOST?.trim() || "smtp.zoho.com";
  const port = Number(process.env.ZOHO_SMTP_PORT ?? 465);

  if (!user || !pass || !from) return null;
  return { user, pass, from, host, port };
}

export function isZohoMailConfigured() {
  return zohoConfig() !== null;
}

export async function sendLoginCodeEmail(to: string, code: string) {
  const config = zohoConfig();
  if (!config) {
    throw new Error("Zoho mail is not configured.");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: `Reel Stash <${config.from}>`,
    to,
    subject: `${code} is your Reel Stash sign-in code`,
    text: `Your Reel Stash sign-in code is ${code}.\n\nIt expires in about an hour. Enter it in the app — you don’t need to open any link.`,
    html: `<p>Your Reel Stash sign-in code is:</p>
<p style="font-size:28px;letter-spacing:0.2em;font-weight:600">${code}</p>
<p>It expires in about an hour. Enter it in the app — you don’t need to open any link.</p>`,
  });
}
