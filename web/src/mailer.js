// Sends the verification code by e-mail. If SMTP is not configured, the code is
// printed in the terminal instead (dev mode) so the project still works offline.
const nodemailer = require('nodemailer');

async function sendResetCode(to, username, code) {
  const { SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) {
    console.log('\n==============================================');
    console.log(` [DEV MODE] Password reset code for "${username}": ${code}`);
    console.log(` (would have been e-mailed to ${to})`);
    console.log('==============================================\n');
    return { dev: true };
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: (process.env.SMTP_PORT || '465') === '465',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM || `EchoNotes <${SMTP_USER}>`,
    to,
    subject: 'EchoNotes password reset code',
    text: `Hi ${username},\n\nYour EchoNotes verification code is ${code}.\nIt expires in 10 minutes. If you did not ask for this, ignore this e-mail.\n`,
  });
  return { dev: false };
}
module.exports = { sendResetCode };
