# Gomoku Handbook (หมากห้าตัว)

คู่มือเกมหมากห้าตัวบนกระดาน 15×15 พร้อมกระดานเล่นสองคนบนเครื่องเดียว และตัวคำนวณ α–β + Eval สำหรับแนะนำตา
ต่อยอดจาก [Tic-Tac-Toe Handbook](https://github.com/Karnhh/Tic-Tac-Toe-Handbook)

## หน้าในเว็บ

| หน้า | เนื้อหา |
| --- | --- |
| `/play` | เล่นสองคนบนเครื่องเดียว: เลือกผู้เดินก่อน นาฬิกาคนละ 5 นาที ย้อนตา แตะสองครั้งเพื่อยืนยัน |
| `/theory` | ทำไมค้นทั้งต้นไม่ได้, จำกัดตาที่พิจารณา, cutoff + Eval, α–β + move ordering, iterative deepening |
| `/patterns` | คลังรูปแบบหมาก: สี่เปิด สามเปิด สามแยก และ fork 4-3 / 4-4 / 3-3 |
| `/analyze` | ตัวช่วยแนะนำตา + heatmap และ tree ย่อย 2 ชั้นพร้อมกิ่งที่ถูกตัด |
| `/references` | แหล่งอ้างอิง |

## กติกา

- กระดาน 15×15 วางหมากบนจุดตัดของเส้น หมากดำเดินก่อน
- เรียงได้ 5 ตัวติดกัน (แนวนอน แนวตั้ง แนวทแยง) ชนะและจบเกมทันที เรียงเกิน 5 ในตาเดียวก็นับว่าชนะ

## โครงโปรเจกต์ (monorepo, npm workspaces)

```
shared/   rules.ts            กติกา: checkWin, isValidMove (client และ server ใช้ร่วมกัน)
client/   Vite + React + TS
  src/engine/engine.ts        α–β + Eval + iterative deepening (ไม่แตะ DOM)
  src/engine/worker.ts        รันตัวคำนวณใน Web Worker
  src/pages/                  หน้าต่าง ๆ
server/   (ยังไม่มี) Express + MongoDB สำหรับโหมดออนไลน์ด้วยรหัสห้อง
```

## คำสั่ง

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit test ของกติกาและตัวคำนวณ
npm run build
```

## Deploy บน Vercel

สร้าง project จาก repo นี้ ตั้ง **Root Directory = `client`** และ Framework = **Vite**
(`client/vercel.json` มี rewrite สำหรับ SPA แล้ว)

## ยังไม่ได้ทำ

- โหมดออนไลน์ด้วยรหัสห้อง (Express + MongoDB Atlas + polling) ตามแผนในเอกสารออกแบบ
