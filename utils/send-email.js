import dayjs from "dayjs";
import { emailTemplates } from "./email-template.js";
import transporter, { accountEmail } from "../config/nodemailer.js";

export const sendReminderEmail = async ({ to, type, subscription }) => {
  if (!to || !type) {
    throw new Error("Missing required parameters");
  }
  // หา template ที่ตรงกับ type ที่ส่งมา เช่น "7 days before", "5 days before", "2 days before", "1 day before"
  const template = emailTemplates.find((t) => t.label === type);

  if (!template) {
    throw new Error("Template not found");
  }

  const mailInfo = {
    userName: subscription.user.name,
    subscriptionName: subscription.name,
    renewalDate: dayjs(subscription.renewalDate).format("DD MMM YYYY"),
    planName: subscription.name,
    price: `${subscription.currency} ${subscription.price} (${subscription.frequency})`,
    paymentMethod: subscription.paymentMethod,
  };

  const message = template.generateBody(mailInfo);
  const subject = template.generateSubject(mailInfo);

  const mailOptions = {
    from: accountEmail,
    to: to,
    subject: subject,
    html: message,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.log("Error while sending email: ", error);
    }

    console.log("Email sent: " + info.response);
  });
};
