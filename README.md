# Gomoku · หมากห้าตัว

[English](#english) · [ภาษาไทย](#ภาษาไทย)

---

## English

Five in a row (Gomoku) on a 15×15 board: a board to play on with a friend, an α–β + Eval engine that estimates where to play next, and a handbook that explains how it works.
The site is bilingual (Thai / English) and supports dark mode.

### Pages

| Page | Content |
| --- | --- |
| `/play` | Two players on one device: choose who moves first, clock, undo, tap-twice-to-confirm, and optional next-move advice during play |
| `/analyze` | Where should I play next: set up a board, get advice with a heatmap, and view a 2-ply sub-tree with its pruned branches |
| `/theory` | Why the full tree is out of reach, limiting candidate moves, cutoff + Eval, α–β + move ordering, iterative deepening |
| `/patterns` | Pattern library: open four, open three, split three, and the 4-3 / 4-4 / 3-3 forks |
| `/manual` | User manual |
| `/references` | Sources |
| `/room/:code` | Online room (off by default, see below) |

### Rules

- A 15×15 board; stones go on the line intersections. Black moves first.
- Five in a row (horizontal, vertical or diagonal) wins and ends the game at once. A single move that makes more than five also wins.
- If the board fills up with no five, the game is a draw.

### Getting started

Requires Node.js 22 or newer.

```bash
npm install
npm run dev          # frontend  http://localhost:5173
npm test             # unit tests for the rules, the engine and the server
npm run typecheck
npm run build
```

### Project layout (monorepo, npm workspaces)

```
shared/   rules.ts            the rules: checkWin, isValidMove (used by client and server)
          room.ts             types of the online-room API
client/   Vite + React + TypeScript
  src/engine/                 α–β + Eval + iterative deepening, run in a Web Worker
  src/components/             board, advice, sub-tree, theory demos
  src/pages/                  the pages
  src/online/                 room API calls and the online on/off flag
server/   Express + TypeScript
  src/game.ts                 all room logic as pure functions
  src/store.ts                room storage: MongoDB if MONGODB_URI is set, otherwise in memory
  src/rooms.ts                routes
  api/index.ts                Vercel entry point
```

### Deploying the frontend to Vercel

1. Push the repo to GitHub.
2. Vercel → Add New → Project → pick this repo.
3. Set **Root Directory = `client`** and Framework Preset = **Vite**.
4. No environment variables are needed. Deploy.

`client/vercel.json` already has the SPA rewrite, so direct links such as `/theory` work.

### Online mode (off by default)

The code is complete but hidden until a server and MongoDB exist. With no configuration, `/play` shows a "Coming soon" card and `/room/:code` redirects to `/play`.

What it offers once enabled:

- Create a room and send the 5-character code or the link to a friend. A third visitor becomes a spectator.
- The room creator chooses who moves first (me / my friend / random) and the thinking time.
- The server decides everything: whose turn it is, whether a point is free, who won and whose clock ran out.
- A player may ask to take back the move they just played; the opponent has to accept.
- A rematch needs both players to agree, and swaps colours.
- Next-move advice is available in a room: it is computed on the player's own device and shown on their own turns only; the opponent does not see it.
- No login: each browser keeps its room token in `localStorage`.
- It polls once a second, and rooms idle for 24 hours are deleted.

**Trying it locally**

1. Create `client/.env.local` containing `VITE_ONLINE=true`.
2. Run `npm run dev` and `npm run dev:server` (API on http://localhost:3000) side by side.
3. Without `server/.env` the server keeps rooms in memory, which is enough for a trial.
4. Use two browsers (or a normal and a private window): two tabs of the same browser share one token.

**Going live**

1. Create a MongoDB Atlas cluster (free M0), a database user, and allow Network Access from `0.0.0.0/0`.
2. A second Vercel project from the same repo: Root Directory = `server`, Framework = Other, env `MONGODB_URI` and `CLIENT_ORIGIN` (the frontend's origin, no trailing `/`).
3. On the frontend project set `VITE_API_URL` (the backend's URL) and `VITE_ONLINE=true`, then redeploy.

Not tested yet: the MongoDB store has never run against a real database, and the backend has never been deployed to Vercel.

**API** (the token goes in the `Authorization: Bearer <token>` header)

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/rooms` | Create a room `{ first, minutes }` → `{ code, token, color }` |
| POST | `/api/rooms/:code/join` | Join → `{ token, color }` or `{ spectator: true }` |
| GET | `/api/rooms/:code` | Room state (polled) |
| POST | `/api/rooms/:code/move` | `{ cell }` |
| POST | `/api/rooms/:code/undo` | `{ action: request / accept / decline / cancel }` |
| POST | `/api/rooms/:code/resign` | Resign |
| POST | `/api/rooms/:code/rematch` | Ask for a rematch |
| GET | `/api/health` | Check that the API is up |

### Sources

The theory is based on the Game playing (Chapter 6) lecture slides for Russell & Norvig's *Artificial Intelligence: A Modern Approach*; see the `/references` page for details. This site is educational and non-commercial.

---

## ภาษาไทย

เกมหมากห้าตัวบนกระดาน 15×15: กระดานสำหรับเล่นกับเพื่อน ตัวคำนวณ α–β + Eval ที่ประเมินว่าตาต่อไปควรวางตรงไหน และคู่มือที่อธิบายวิธีทำงานของมัน
เว็บมีสองภาษา (ไทย / อังกฤษ) และรองรับโหมดมืด

### หน้าในเว็บ

| หน้า | เนื้อหา |
| --- | --- |
| `/play` | เล่นสองคนบนเครื่องเดียว: เลือกผู้เดินก่อน นาฬิกา ย้อนตา แตะสองครั้งเพื่อยืนยัน และเปิดคำแนะนำตาต่อไประหว่างเล่นได้ |
| `/analyze` | ตาต่อไปควรวางตรงไหน: จัดกระดานเอง รับคำแนะนำพร้อม heatmap และดู tree ย่อย 2 ชั้นพร้อมกิ่งที่ถูกตัด |
| `/theory` | ทำไมค้นทั้งต้นไม่ได้, จำกัดตาที่พิจารณา, cutoff + Eval, α–β + move ordering, iterative deepening |
| `/patterns` | คลังรูปแบบหมาก: สี่เปิด สามเปิด สามแยก และ fork 4-3 / 4-4 / 3-3 |
| `/manual` | คู่มือการใช้งาน |
| `/references` | แหล่งอ้างอิง |
| `/room/:code` | ห้องออนไลน์ (ปิดไว้เป็นค่าเริ่มต้น ดูด้านล่าง) |

### กติกา

- กระดาน 15×15 วางหมากบนจุดตัดของเส้น หมากดำเดินก่อน
- เรียงได้ 5 ตัวติดกัน (แนวนอน แนวตั้ง แนวทแยง) ชนะและจบเกมทันที เรียงเกิน 5 ในตาเดียวก็นับว่าชนะ
- กระดานเต็มโดยไม่มีใครเรียงได้ ถือว่าเสมอ

### เริ่มใช้งาน

ต้องใช้ Node.js 22 ขึ้นไป

```bash
npm install
npm run dev          # frontend  http://localhost:5173
npm test             # unit test ของกติกา ตัวคำนวณ และ server
npm run typecheck
npm run build
```

### โครงโปรเจกต์ (monorepo, npm workspaces)

```
shared/   rules.ts            กติกา: checkWin, isValidMove (client และ server ใช้ร่วมกัน)
          room.ts             type ของ API ห้องออนไลน์
client/   Vite + React + TypeScript
  src/engine/                 α–β + Eval + iterative deepening รันใน Web Worker
  src/components/             กระดาน, คำแนะนำ, tree ย่อย, demo ของหน้าทฤษฎี
  src/pages/                  หน้าต่าง ๆ
  src/online/                 เรียก API ห้อง และ flag เปิด/ปิดโหมดออนไลน์
server/   Express + TypeScript
  src/game.ts                 ตรรกะห้องทั้งหมดเป็น pure function
  src/store.ts                ที่เก็บห้อง: MongoDB ถ้ามี MONGODB_URI ไม่งั้นเก็บในหน่วยความจำ
  src/rooms.ts                routes
  api/index.ts                จุดเข้าของ Vercel
```

### Deploy frontend บน Vercel

1. Push repo ขึ้น GitHub
2. Vercel → Add New → Project → เลือก repo นี้
3. ตั้ง **Root Directory = `client`** และ Framework Preset = **Vite**
4. ไม่ต้องใส่ Environment Variables แล้วกด Deploy

`client/vercel.json` มี rewrite สำหรับ SPA แล้ว ลิงก์ตรงอย่าง `/theory` จึงเปิดได้

### โหมดออนไลน์ (ปิดไว้เป็นค่าเริ่มต้น)

โค้ดพร้อมแล้ว แต่ซ่อนไว้จนกว่าจะมี server และ MongoDB ถ้าไม่ตั้งค่าอะไร หน้า `/play` จะแสดงการ์ด "เร็ว ๆ นี้" และ `/room/:code` จะพากลับไป `/play`

สิ่งที่มีเมื่อเปิดใช้:

- สร้างห้องแล้วส่งรหัส 5 ตัวหรือลิงก์ให้เพื่อน คนที่สามที่เปิดลิงก์จะเป็นคนดู
- คนสร้างห้องเลือกผู้เดินก่อน (ฉัน / เพื่อน / สุ่ม) และเวลาคิด
- server เป็นผู้ตัดสินทุกอย่าง: ตาใคร ช่องว่างไหม ใครชนะ และใครหมดเวลา
- ขอย้อนตาได้เฉพาะตาที่เพิ่งเดิน และอีกฝ่ายต้องยอมรับ
- ขอเล่นอีกครั้งได้ โดยต้องตอบรับทั้งสองฝ่าย แล้วสลับสีหมาก
- เปิดคำแนะนำตาต่อไปได้ในห้อง: คำนวณบนเครื่องของผู้เล่นเอง แสดงเฉพาะตาของตัวเอง อีกฝ่ายไม่เห็น
- ไม่ต้อง login: แต่ละเครื่องเก็บ token ของห้องไว้ใน `localStorage`
- ใช้ polling ทุก 1 วินาที และห้องที่เงียบเกิน 24 ชั่วโมงจะถูกลบ

**ลองบนเครื่อง**

1. สร้างไฟล์ `client/.env.local` ที่มีบรรทัด `VITE_ONLINE=true`
2. เปิด `npm run dev` และ `npm run dev:server` (API ที่ http://localhost:3000) คู่กัน
3. ถ้าไม่มี `server/.env` server จะเก็บห้องในหน่วยความจำ ซึ่งพอสำหรับทดลอง
4. ใช้สองเบราว์เซอร์ (หรือหน้าต่างปกติกับหน้าต่างไม่ระบุตัวตน) เพราะสองแท็บในเบราว์เซอร์เดียวกันจะถือ token เดียวกัน

**เปิดใช้จริง**

1. สร้าง MongoDB Atlas (cluster ฟรี M0) สร้าง database user และอนุญาต Network Access `0.0.0.0/0`
2. Vercel project ที่สอง จาก repo เดียวกัน: Root Directory = `server`, Framework = Other, env `MONGODB_URI` และ `CLIENT_ORIGIN` (origin ของ frontend ไม่มี `/` ปิดท้าย)
3. ที่ project frontend ใส่ env `VITE_API_URL` (URL ของ backend) และ `VITE_ONLINE=true` แล้ว Redeploy

ส่วนที่ยังไม่ได้ทดสอบ: ตัวเก็บข้อมูล MongoDB ยังไม่เคยรันกับฐานข้อมูลจริง และ backend ยังไม่เคย deploy บน Vercel

**API** (token ส่งผ่าน header `Authorization: Bearer <token>`)

| Method | Path | ทำอะไร |
| --- | --- | --- |
| POST | `/api/rooms` | สร้างห้อง `{ first, minutes }` → `{ code, token, color }` |
| POST | `/api/rooms/:code/join` | เข้าห้อง → `{ token, color }` หรือ `{ spectator: true }` |
| GET | `/api/rooms/:code` | สถานะห้อง (ใช้ polling) |
| POST | `/api/rooms/:code/move` | `{ cell }` |
| POST | `/api/rooms/:code/undo` | `{ action: request / accept / decline / cancel }` |
| POST | `/api/rooms/:code/resign` | ยอมแพ้ |
| POST | `/api/rooms/:code/rematch` | ขอเล่นอีกครั้ง |
| GET | `/api/health` | เช็คว่า API ทำงาน |

### ที่มาของเนื้อหา

ทฤษฎีอ้างอิงจากสไลด์ Game playing (บทที่ 6) ประกอบตำรา *Artificial Intelligence: A Modern Approach* ของ Russell & Norvig รายละเอียดอยู่ในหน้า `/references` เว็บนี้ทำเพื่อการศึกษา ไม่ใช่เชิงพาณิชย์
