import dayjs from "dayjs";

// อนุญาตให้ใช้ CommonJS ในไฟล์ ES Module
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { serve } = require("@upstash/workflow/express");

import Subscription from "../models/subscription.model.js";
import { sendReminderEmail } from "../utils/send-email.js";

// กำหนดช่วงเวลาที่ต้องการส่งแจ้งเตือนล่วงหน้า (หน่วยเป็นวัน)
// ตัวอย่าง: หากวันหมดอายุตรงกับ 22 ก.พ. ระบบจะตั้งคิวแจ้งเตือนวันที่ 15, 17, 20 และ 21 ก.พ.
const REMINDERS = [7, 5, 2, 1];

export const sendReminders = serve(async (context) => {
  // `serve` จะสร้าง Express handler สำหรับ Workflow ของ Upstash
  // payload ที่ส่งเข้ามาต้องประกอบด้วย subscriptionId ของสมาชิกที่ต้องการตรวจสอบ
  const { subscriptionId } = context.requestPayload;
  const subscription = await fetchSubscription(context, subscriptionId);

  if (!subscription || subscription.status !== "active") return;

  const renewalDate = dayjs(subscription.renewalDate);

  if (renewalDate.isBefore(dayjs())) {
    console.log(
      `Renewal date has passed for subscription ${subscriptionId}. Stopping workflow.`
    );
    return;
  }

  for (const daysBefore of REMINDERS) {
    // คำนวณวันที่ต้องส่งแจ้งเตือนล่วงหน้าตามค่าที่ระบุใน REMINDERS
    // ตัวอย่าง: renewalDate = 22 ก.พ. กับ daysBefore = 7 จะได้ reminderDate = 15 ก.พ.
    const reminderDate = renewalDate.subtract(daysBefore, "day");

    if (reminderDate.isAfter(dayjs())) {
      await sleepUntilReminder(
        context,
        `Reminder ${daysBefore} days before`,
        reminderDate
      );
    }

    if (dayjs().isSame(reminderDate, "day")) {
      await triggerReminder(
        context,
        `${daysBefore} days before reminder`,
        subscription
      );
    }
  }
});

// ดึงข้อมูลการสมัครสมาชิก
const fetchSubscription = async (context, subscriptionId) => {
  // ใช้ context.run เพื่อให้ Upstash จัดการ retry และ logging ให้อัตโนมัติเมื่อ query ล้มเหลว
  return await context.run("get subscription", async () => {
    // ดึงข้อมูลสมาชิกพร้อมแนบข้อมูลผู้ใช้ (ชื่อและอีเมล) เพื่อนำไปแสดงผลในข้อความแจ้งเตือน
    return Subscription.findById(subscriptionId).populate("user", "name email");
  });
};

// ฟังก์ชันช่วยเหลือสำหรับการหน่วงเวลาจนถึงวันที่ตรงกับเงื่อนไขการแจ้งเตือน
// เช่น หากต้องการแจ้งเตือนล่วงหน้า 7 วัน และวันหมดอายุคือ 22 ก.พ. แปลว่าเราจะต้องแจ้งเตือนในวันที่ 15 ก.พ. ระบบจึงจะหน่วงเวลาจนถึงวันที่ 15 ก.พ. ก่อนส่งแจ้งเตือน
const sleepUntilReminder = async (context, label, date) => {
  console.log(`Sleeping until ${label} reminder at ${date}`);
  await context.sleepUntil(label, date.toDate());
};

// ฟังก์ชันช่วยเหลือสำหรับการส่งอีเมลแจ้งเตือนสมาชิก
const triggerReminder = async (context, label, subscription) => {
  return await context.run(label, async () => {
    console.log(`Triggering ${label}`);

    await sendReminderEmail({
      to: subscription.user.email,
      type: label,
      subscription,
    });
  });
};
