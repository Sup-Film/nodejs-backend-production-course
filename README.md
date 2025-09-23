# Node.js Backend Production Course

## ภาพรวม
โปรเจกต์ฝึกสร้าง Node.js/Express API พร้อมใช้งานจริงใน production จากคอร์สสอนบน YouTube โดยใช้ระบบสมาชิกแบบสมัครรับ (subscription) เป็นกรณีศึกษา จดบันทึกสถาปัตยกรรม เทคนิคสำคัญ และงานค้างสำหรับพัฒนาต่อ เช่น การส่งอีเมลแจ้งเตือนและการเขียนเทสต์อัตโนมัติ

## วัตถุประสงค์การเรียนรู้
- ทำความเข้าใจการจัดโครงสร้าง Express API แบบโมดูลาร์และการเชื่อม MongoDB ด้วย Mongoose
- ฝึกตั้งค่าระบบพิสูจน์ตัวตน JWT และการจัดการ environment variables ให้เหมาะกับ production
- ทดลองผสานบริการภายนอกอย่าง Upstash Workflow (QStash) สำหรับตั้งเวลาหรือประมวลผลงานเบื้องหลัง
- ทดลองใช้ Arcjet เพื่อรู้จักเครื่องมือป้องกันบอตและการควบคุมเรตลิมิตตั้งแต่ขอบเครือข่าย
- ระบุช่องว่างจากคลิปสอนที่ต้องพัฒนาต่อเอง เช่น การส่งอีเมลแจ้งเตือนจริงหรือการเขียนเทสต์อัตโนมัติ

## สถาปัตยกรรมและฟีเจอร์หลัก
- Express API แยกตามโมดูล (`auth`, `users`, `subscriptions`, `workflows`)
- Mongoose model `Subscription` พร้อมฮุคคำนวณวันต่ออายุอัตโนมัติและตรวจสถานะหมดอายุ
- ระบบพิสูจน์ตัวตนด้วย JWT และการเข้ารหัสรหัสผ่านด้วย bcrypt
- Upstash Workflow (QStash) ใช้จัดตารางและรันงานเตือนวันต่ออายุสมาชิก
- Arcjet Middleware ใช้กฎ `shield`, `detectBot`, `tokenBucket` เพื่อกันบอตและจำกัดอัตราคำขอ
- โครงสร้างไฟล์ `.env.<environment>.local` สำหรับแยกค่าคอนฟิกแต่ละสภาพแวดล้อม

## การทำงานของ Upstash Workflow
ฟีเจอร์เตือนต่ออายุสมาชิกอาศัยแพลตฟอร์ม Upstash Workflow (บริการคิวและ scheduling ของ QStash) โดยมีลำดับดังนี้:
1. ฝั่งเซิร์ฟเวอร์เปิด endpoint ผ่าน `sendReminders` ใน `controllers/workflow.controller.js` ซึ่งถูกห่อด้วย `serve` จาก `@upstash/workflow/express` ทำให้ใช้งานร่วมกับ Express ได้ทันที.
2. เมื่อมีการ trigger workflow (เช่น สร้างงานผ่าน Upstash หรือ API อื่นที่ยิงเข้า endpoint นี้) payload ต้องมี `subscriptionId`. Handler จะโหลดข้อมูลจาก MongoDB ผ่าน `fetchSubscription` โดยเรียกผ่าน `context.run` เพื่อให้ Upstash จัดการ retry/logging ให้อัตโนมัติ.
3. ระบบตรวจสอบว่าสมาชิกยัง active อยู่และยังไม่หมดอายุ จากนั้นใช้ Day.js คำนวณวันที่ต้องส่งแจ้งเตือนล่วงหน้าตามอาร์เรย์ `REMINDERS = [7, 5, 2, 1]` ซึ่งหมายถึงเตือนก่อน 7, 5, 2 และ 1 วัน.
4. ภายในลูปสามารถต่อยอดเพื่อตั้งงานส่งอีเมลหรือ push notification ให้เกิดขึ้นจริงในวันที่ตรงกับ `reminderDate` เช่น สั่งให้ QStash ยิง HTTP call ไปยัง service ส่งอีเมล หรือเช็กว่า `dayjs().isSame(reminderDate, "day")` แล้วส่งทันที.

### การตั้งค่า Upstash
- สร้าง QStash Workspace และรับค่า `QSTASH_TOKEN` และ `QSTASH_URL`
- ตั้งค่า endpoint ของ workflow ให้ชี้ไปยังเส้นทาง `POST /api/v1/workflows/...` (เพิ่มเส้นทางจริงตามที่เปิดใช้งาน)
- สามารถใช้ Upstash Scheduler ตั้งเวลาเรียก workflow ตามรอบที่ต้องการ หรือ trigger ด้วยเหตุการณ์อื่น เช่น การสร้าง subscription ใหม่.

## การป้องกันด้วย Arcjet
Arcjet ใช้สำหรับป้องกันการโจมตีและควบคุมปริมาณคำขอที่ผิดปกติ ก่อนที่คำขอจะไปถึง business logic:
- ไฟล์ `config/arcjet.js` สร้างอ็อบเจ็กต์ Arcjet ด้วย API key (`ARCJET_KEY`) และกำหนดชุดกฎ
  - `shield({ mode: "LIVE" })` ใช้ baseline protection ต่อภัยทั่วไป
  - `detectBot({ mode: "LIVE", allow: [...] })` คัดกรองบอตและอนุญาตเฉพาะบอตที่เชื่อถือ เช่น เสิร์ชเอนจิน
  - `tokenBucket({ refillRate: 5, interval: 10, capacity: 10 })` จำกัดคำขอซ้ำ ๆ จากไอพีเดียวกัน
- มิดเดิลแวร์ `middlewares/arcjet.middleware.js` เรียก `aj.protect(req, { requested: 1 })` หากถูกปฏิเสธจะตอบกลับด้วยสถานะ 429 หรือ 403 ตามเหตุผล (เรตลิมิต/บอต)
- ต้องตั้งค่า `ARCJET_ENV` ให้ตรงกับ environment ของ Arcjet เพื่อดูรายงานการโจมตีและการบล็อกในแดชบอร์ด

## การเตรียมระบบ
- Node.js 18 ขึ้นไป
- อินสแตนซ์ MongoDB (โลคอลหรือ Atlas)
- บัญชี Upstash พร้อมเปิดใช้ QStash/Workflow
- บัญชี Arcjet พร้อมสร้าง Environment และ API Key

## Environment Variables
เก็บไว้ในไฟล์ `.env.development.local`, `.env.production.local` เป็นต้น

| ตัวแปร | รายละเอียด |
| --- | --- |
| `PORT` | พอร์ตที่ Express server ใช้งาน (ตัวอย่าง 3000) |
| `NODE_ENV` | โหมดการทำงาน เช่น `development`, `production` |
| `DB_URI` | MongoDB connection string |
| `JWT_SECRET` | คีย์ลับสำหรับเซ็น JWT |
| `JWT_EXPIRES_IN` | อายุของ JWT เช่น `7d` |
| `ARCJET_KEY` | Arcjet API Key ต่อ environment |
| `ARCJET_ENV` | ชื่อ environment ใน Arcjet (เช่น `development`) |
| `QSTASH_TOKEN` | Bearer token สำหรับเรียก Upstash Workflow/QStash |
| `QSTASH_URL` | Base URL ของ QStash (ส่วนใหญ่เป็น `https://qstash.upstash.io/v2`) |

## การติดตั้งและรันโครงการ
1. ติดตั้ง dependency: `npm install`
2. สร้างไฟล์ `.env.development.local` แล้วตั้งค่าตัวแปรตามตารางด้านบน
3. รันโหมดพัฒนา: `npm run dev` (ใช้ nodemon รีโหลดอัตโนมัติ)
4. รันในโหมด production (เมื่อ build แล้ว): `npm start`
5. เปิดเบราว์เซอร์หรือเครื่องมืออย่าง Postman ทดสอบ endpoint ต่าง ๆ เช่น `GET /api/v1/subscriptions`

## คำสั่งที่ใช้บ่อย
- `npm run dev` รันเซิร์ฟเวอร์พร้อม hot reload
- `npm start` รันเซิร์ฟเวอร์แบบปกติ
- สามารถเพิ่มสคริปต์ lint/test ตามต้องการ (โปรเจกต์เตรียม ESLint แล้ว)