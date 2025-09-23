import arcjet, { shield, detectBot, tokenBucket } from "@arcjet/node";
import { ARCJET_KEY } from "./env.js";

const aj = arcjet({
  key: ARCJET_KEY,
  rules: [
    shield({ mode: "LIVE" }),
    // สร้างกฎสำหรับตรวจจับบอต
    detectBot({
      mode: "LIVE", // บล็อกคำขอ ใช้ "DRY_RUN" หากต้องการแค่บันทึก
      // บล็อกบอตทั้งหมดยกเว้นรายการต่อไปนี้
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Google, Bing ฯลฯ
        "POSTMAN",
      ],
    }),
    // สร้างเรตลิมิตแบบ token bucket วิธีอื่นก็รองรับเช่นกัน
    tokenBucket({
      mode: "LIVE",
      // โดยปกติจะติดตามด้วยที่อยู่ IP แต่สามารถปรับแต่งได้
      // ดูรายละเอียดที่ https://docs.arcjet.com/fingerprints
      //characteristics: ["ip.src"],
      refillRate: 5, // เติมโทเคน 5 หน่วยในแต่ละรอบ
      interval: 10, // เติมทุก 10 วินาที
      capacity: 10, // ความจุถัง 10 โทเคน
    }),
  ],
});

export default aj;
