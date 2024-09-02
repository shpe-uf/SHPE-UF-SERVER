const nodemailer = require("nodemailer");
const nodemailerSendgrid = require("nodemailer-sendgrid");
const resolvers = require("../graphql/resolvers/users");
require("dotenv").config();

const transport = nodemailer.createTransport(
  nodemailerSendgrid({
    apiKey: process.env.SENDGRID_API_KEY,
  })
);

async function sendEmails() {
  try {
    const users = await resolvers.Query.getUsers();
    
    if (!users || users.length === 0) {
      return;
    }

    for (const user of users) {
      const { email, firstName } = user;
      const subject = "SHPE Information Update Request";
      const message = `
        <p>Dear ${firstName},</p>
        <p>We are updating our records and would love to ensure your information is current.</p>
        <p>Please update your details on our website or, if you have graduated, consider joining our alumni database.</p>
        <p>To update your information or join our alumni network, click <a href="https://www.shpeuf.com/profile">here</a> and edit your profile.</p>
        <p>Best regards,</p>
        <p>SHPE UF</p>
      `;
      try {
        await transport.sendMail({
          from: process.env.EMAIL,
          to: email,
          subject: subject,
          html: message,
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
      }
    }
  } catch (error) {
    console.error("Error fetching users:", error);
  }
}

module.exports = sendEmails;
