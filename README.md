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
  scripts/bundle.mjs          bundles the server into one file for Vercel
  api/index.js                Vercel entry point (imports the bundle)
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

1. **MongoDB Atlas.** Create a free M0 cluster and a database user, and allow Network Access from `0.0.0.0/0` (Vercel's addresses change). Nothing has to be created inside the cluster: the server makes the `gomoku` database, its collections and indexes on first use.
2. **Backend project on Vercel.** Add New → Project → the same repo, then:
   - Root Directory = `server`, Framework Preset = **Other**; leave the build, output and install settings at their defaults
   - Environment Variables: `MONGODB_URI` (the Atlas connection string) and `CLIENT_ORIGIN` (the frontend's address, exactly, with `https://` and no trailing `/`; several can be separated by commas)
3. **Check the backend** by opening `https://<backend>/api/health`. It must answer `{"ok":true,"store":"mongodb"}`. If it says `"store":"memory"`, `MONGODB_URI` did not reach the function.
4. **Frontend project.** Add `VITE_API_URL` (the backend's address, no trailing `/`) and `VITE_ONLINE=true`, then **Redeploy**: `VITE_` variables are baked in at build time.

How the backend is built: Vercel's function builder cannot run this TypeScript as it is (it imports `.ts` files and the `shared/` workspace), so `npm run vercel-build` first bundles everything into one file, `server/dist/app.cjs`, with `server/scripts/bundle.mjs`; `server/api/index.js` imports it. `server/vercel.json` runs the function in Singapore (`sin1`) to sit next to the database; change it if your cluster is elsewhere.

To try the exact bundle before deploying: `cd server && npm run bundle && npm start` runs it on http://localhost:3001.

If something goes wrong:

| Symptom | Likely cause |
| --- | --- |
| The browser console shows a CORS error | `CLIENT_ORIGIN` does not match the frontend's address character for character |
| Creating a room hangs, then fails | Atlas Network Access does not allow `0.0.0.0/0`, or the password in `MONGODB_URI` is wrong |
| The page still says "Coming soon" | the frontend was not redeployed after `VITE_ONLINE=true` was added |
| Preview deployments cannot reach the API | their address is not in `CLIENT_ORIGIN`; only the listed origins are allowed |

Tested: the bundle, run the way Vercel runs it, against a real Atlas cluster. Not tested: an actual Vercel deployment of the backend.

### Logging

Online games are logged so that play can be analysed later. Local games (two players on one device) and the "Next move" page run entirely in the browser, never reach the server, and are not logged.

**What is never stored:** names, accounts, e-mail addresses, IP addresses, user agents or device details, and player tokens. A log entry is tied only to a random 5-character room code. The site says so on the `/manual#privacy` section and under the "Create room" button.

**Where:** two collections in the `gomoku` database, written by `server/src/log.ts` through `server/src/store.ts`.

| Collection | One document per | Deleted automatically |
| --- | --- | --- |
| `events` | thing that happened, in time order | never |
| `games` | finished game | never |
| `rooms` | room in play (live state, not a log) | 24 hours after the last change |

**When it is written:** right after the room change is saved, inside the same request. A rejected action (wrong turn, occupied point) is not logged. If a log write fails, the error is printed and the game carries on: logging never blocks play.

#### Event types

| `type` | When | `color` | Extra fields |
| --- | --- | --- | --- |
| `create` | a room is created | the creator's colour | `minutes`, `first` (`me` / `opponent` / `random`) |
| `join` | the second player sits down; the game and the clock start | the joiner's colour | |
| `move` | a stone is placed (every stone, without exception) | the mover | `ply`, `cell`, `label`, `thinkMs`, `clock`, `advice`, `adviceBest` |
| `undo_request` | a player asks to take back their last move | the asker | `ply` |
| `undo_accept` | the opponent agrees; one move is rewound | the one who answered | `ply` (before rewinding) |
| `undo_decline` | the opponent refuses | the one who answered | `ply` |
| `undo_cancel` | the asker withdraws the request | the asker | `ply` |
| `resign` | a player resigns | the one who resigned | `ply` |
| `timeout` | the server finds that a clock has run out | the side that ran out | `ply` |
| `rematch_request` | the first player asks for another game | the asker | `ply` |
| `rematch_start` | the second player agrees; colours swap | the one who agreed | `game` is already the new game number |
| `finish` | a game ends, for any reason (exactly one per game) | `null` (written by the server) | `ply`, `winner`, `reason`, `clock` |

#### Fields common to every event

| Field | Meaning |
| --- | --- |
| `type` | one of the types above |
| `code` | room code, such as `JARZ5` |
| `game` | game number inside the room; starts at 1 and goes up on each rematch |
| `at` | when it happened, as a UTC date (Thailand is UTC+7) |
| `color` | `1` = black, `2` = white, `null` = the server |

#### Fields of a `move` event

| Field | Meaning |
| --- | --- |
| `ply` | number of stones on the board after this move (1 = the first stone) |
| `cell` | the point as a number 0–224: `row × 15 + column`, counted from the top-left |
| `label` | the same point as a board label: column `A`–`O`, row `1`–`15` from the bottom (`H8` is the centre) |
| `thinkMs` | time from the start of this player's turn to the move, in ms, measured by the server |
| `clock` | ms left for `[black, white]` after the move |
| `advice.on` | was "Show next-move advice" switched on |
| `advice.timeMs` | the thinking time selected at the moment of the move (the latest choice) |
| `advice.rank` | rank of the played point among the suggestions on screen (1 = the top one); `null` if it was not among them |
| `advice.shown` | how many suggestions were on screen; `0` means the player moved before any appeared |
| `advice.depth` | search depth the suggestions came from |
| `advice.best` | the top suggestion, as a cell number |
| `advice.score` | engine score of the top suggestion (40000 and above mean a forced line was found) |
| `advice.changes` | how many times the player changed the thinking time since their previous move |
| `advice.stops` | how many times the player pressed "Stop" since their previous move |
| `advice.done` | had the latest search run its full time when the stone was placed |
| `adviceBest` | `advice.best` as a board label, such as `H9` |

When advice is off, `advice.on` is `false` and every other `advice` field is `null`.

#### A `games` document

| Field | Meaning |
| --- | --- |
| `code`, `game` | which room and which game in it (unique together) |
| `minutes` | thinking time per player; `0` = no clock |
| `moves`, `labels` | the final move list, as cell numbers and as labels; moves that were taken back are not in it |
| `plies` | number of moves |
| `winner` | `1` = black, `2` = white, `0` = draw |
| `reason` | `five`, `time`, `resign` or `draw` |
| `startedAt`, `endedAt`, `durationMs` | when the game started and ended, and its length |

#### Example

```json
{"type":"create","code":"JARZ5","game":1,"at":"2026-11-13T18:19:52.268Z","color":1,"minutes":5,"first":"me"}
{"type":"join","code":"JARZ5","game":1,"at":"2026-11-13T18:19:54.704Z","color":2}
{"type":"move","code":"JARZ5","game":1,"at":"2026-11-13T18:19:56.539Z","color":1,"ply":1,"cell":112,"label":"H8","thinkMs":1835,"clock":[298165,300000],"advice":{"on":false,"timeMs":null,"rank":null,"shown":null,"depth":null,"best":null,"score":null,"changes":null,"stops":null,"done":null},"adviceBest":null}
{"type":"move","code":"JARZ5","game":1,"at":"2026-11-13T18:20:07.622Z","color":1,"ply":5,"cell":96,"label":"G9","thinkMs":5566,"clock":[288589,298493],"advice":{"on":true,"timeMs":30000,"rank":3,"shown":14,"depth":8,"best":97,"score":247,"changes":2,"stops":1,"done":false},"adviceBest":"H9"}
{"type":"resign","code":"JARZ5","game":1,"at":"2026-11-13T18:20:42.000Z","color":1,"ply":7}
{"type":"finish","code":"JARZ5","game":1,"at":"2026-11-13T18:20:42.000Z","color":null,"ply":7,"winner":2,"reason":"resign","clock":[283044,269660]}
```

The fourth line reads: Black placed the 5th stone on G9 after 5.6 s. Advice was on with 30 s selected; the player had changed the time twice and pressed Stop once, moved before the search finished, and picked the 3rd suggestion while the top one was H9.

#### Things to know before analysing

- **The `advice` block is reported by the browser.** The server keeps only well-formed values but cannot check that they are true. Everything else (`thinkMs`, `clock`, the moves, the result) is decided by the server.
- **`rank: null` has two causes:** the player ignored the list, or moved before it appeared. `advice.shown` tells them apart.
- **`advice.done` can be `true` before the time is up**, when the search ends early because it found a forced result or reached its depth limit.
- **Undo rewrites the game, not the log.** The `move` event of a move that was taken back stays in `events`; only `games.moves` reflects the final game.
- **Count games with `finish`,** not `resign` or `timeout`: every finished game has exactly one. A game still in progress, or abandoned, has none.
- **Advice is per player.** Each player switches it on for themselves; filter by `color` to follow one side.
- **Size.** A `move` event is about 400 bytes, so a 40-move game is roughly 20 KB. The free 512 MB cluster holds on the order of 25,000 games.

#### Looking at the data

In Atlas: Data Explorer → `gomoku` → `events` or `games`. The Aggregations tab, or `mongosh`, runs queries such as:

```js
// How often is advice used?
db.events.aggregate([{ $match: { type: 'move' } }, { $group: { _id: '$advice.on', moves: { $sum: 1 } } }])

// When advice is on, which rank do players pick?
db.events.aggregate([
  { $match: { type: 'move', 'advice.on': true } },
  { $group: { _id: '$advice.rank', moves: { $sum: 1 } } },
  { $sort: { _id: 1 } },
])

// Per thinking time: how often is the top suggestion followed, and how often do players wait for it?
db.events.aggregate([
  { $match: { type: 'move', 'advice.on': true } },
  { $group: {
      _id: '$advice.timeMs',
      moves: { $sum: 1 },
      followedTop: { $sum: { $cond: [{ $eq: ['$advice.rank', 1] }, 1, 0] } },
      waited: { $sum: { $cond: ['$advice.done', 1, 0] } },
      avgThinkMs: { $avg: '$thinkMs' },
  } },
  { $sort: { _id: 1 } },
])

// Who wins, and how do games end?
db.games.aggregate([{ $group: { _id: { winner: '$winner', reason: '$reason' }, games: { $sum: 1 } } }])

// Replay one game, event by event
db.events.find({ code: 'JARZ5', game: 1 }).sort({ at: 1 })
```

To export for Python or a spreadsheet, use Atlas's export button on a collection, or `mongoexport --uri "$MONGODB_URI" --db gomoku --collection events --out events.json`. To start over, drop the `events` and `games` collections; they are recreated on the next game.

### API

The token goes in the `Authorization: Bearer <token>` header.

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
  scripts/bundle.mjs          รวม server เป็นไฟล์เดียวสำหรับ Vercel
  api/index.js                จุดเข้าของ Vercel (import ไฟล์ที่ bundle แล้ว)
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

1. **MongoDB Atlas** สร้าง cluster ฟรี M0 สร้าง database user และอนุญาต Network Access `0.0.0.0/0` (IP ของ Vercel เปลี่ยนตลอด) ไม่ต้องสร้างอะไรใน cluster เอง server จะสร้างฐานข้อมูล `gomoku` พร้อม collection และ index ให้ตอนใช้ครั้งแรก
2. **Project backend บน Vercel** Add New → Project → repo เดิม แล้วตั้งค่า:
   - Root Directory = `server`, Framework Preset = **Other** ส่วน build, output และ install ปล่อยตามค่าเริ่มต้น
   - Environment Variables: `MONGODB_URI` (connection string ของ Atlas) และ `CLIENT_ORIGIN` (ที่อยู่ของ frontend ตรงทุกตัวอักษร มี `https://` และไม่มี `/` ปิดท้าย ใส่หลายค่าได้โดยคั่นด้วยจุลภาค)
3. **ตรวจ backend** โดยเปิด `https://<backend>/api/health` ต้องตอบ `{"ok":true,"store":"mongodb"}` ถ้าขึ้น `"store":"memory"` แปลว่า `MONGODB_URI` ไปไม่ถึงฟังก์ชัน
4. **Project frontend** เพิ่ม `VITE_API_URL` (ที่อยู่ของ backend ไม่มี `/` ปิดท้าย) และ `VITE_ONLINE=true` แล้วกด **Redeploy** เพราะตัวแปร `VITE_` ถูกฝังตอน build

วิธี build ของ backend: ตัว build ฟังก์ชันของ Vercel รัน TypeScript ชุดนี้ตรง ๆ ไม่ได้ (เพราะ import ไฟล์ `.ts` และ workspace `shared/`) `npm run vercel-build` จึงรวมทุกอย่างเป็นไฟล์เดียว `server/dist/app.cjs` ด้วย `server/scripts/bundle.mjs` ก่อน แล้ว `server/api/index.js` import ไฟล์นั้น ส่วน `server/vercel.json` ตั้งให้ฟังก์ชันรันที่สิงคโปร์ (`sin1`) เพื่ออยู่ใกล้ฐานข้อมูล ถ้า cluster อยู่ที่อื่นให้แก้ตาม

ลองไฟล์ที่ bundle แล้วก่อน deploy ได้ด้วย `cd server && npm run bundle && npm start` จะรันที่ http://localhost:3001

ถ้ามีปัญหา:

| อาการ | สาเหตุที่น่าจะเป็น |
| --- | --- |
| console ของเบราว์เซอร์ขึ้น CORS error | `CLIENT_ORIGIN` ไม่ตรงกับที่อยู่ของ frontend ทุกตัวอักษร |
| กดสร้างห้องแล้วค้าง จากนั้นล้มเหลว | Network Access ของ Atlas ไม่ได้อนุญาต `0.0.0.0/0` หรือรหัสผ่านใน `MONGODB_URI` ผิด |
| หน้าเว็บยังขึ้น "เร็ว ๆ นี้" | ยังไม่ได้ Redeploy frontend หลังเพิ่ม `VITE_ONLINE=true` |
| Preview deployment เรียก API ไม่ได้ | ที่อยู่ของ preview ไม่อยู่ใน `CLIENT_ORIGIN` ระบบอนุญาตเฉพาะ origin ที่ระบุ |

ทดสอบแล้ว: ไฟล์ที่ bundle รันแบบเดียวกับ Vercel และต่อกับ Atlas จริง ยังไม่ได้ทดสอบ: การ deploy backend บน Vercel จริง

### การเก็บ log

เกมออนไลน์ถูกบันทึกไว้เพื่อวิเคราะห์การเล่นภายหลัง ส่วนเกมบนเครื่องเดียว (สองคนบนจอเดียว) และหน้า "ตาต่อไป" ทำงานในเบราว์เซอร์ทั้งหมด ไม่ผ่าน server จึงไม่ถูกบันทึก

**สิ่งที่ไม่เก็บเด็ดขาด:** ชื่อ บัญชีผู้ใช้ อีเมล IP address ข้อมูลเบราว์เซอร์หรืออุปกรณ์ และ token ของผู้เล่น รายการใน log ผูกกับรหัสห้องสุ่ม 5 ตัวเท่านั้น เว็บแจ้งเรื่องนี้ไว้ที่หัวข้อ `/manual#privacy` และใต้ปุ่ม "สร้างห้อง"

**เก็บที่ไหน:** สอง collection ในฐานข้อมูล `gomoku` เขียนโดย `server/src/log.ts` ผ่าน `server/src/store.ts`

| Collection | หนึ่งเอกสารต่อ | ถูกลบอัตโนมัติ |
| --- | --- | --- |
| `events` | หนึ่งเหตุการณ์ เรียงตามเวลา | ไม่ลบ |
| `games` | หนึ่งเกมที่จบ | ไม่ลบ |
| `rooms` | หนึ่งห้องที่กำลังเล่น (สถานะปัจจุบัน ไม่ใช่ log) | 24 ชั่วโมงหลังการเปลี่ยนแปลงครั้งสุดท้าย |

**เขียนตอนไหน:** ทันทีหลังบันทึกการเปลี่ยนแปลงของห้องสำเร็จ ภายในคำขอเดียวกัน การกระทำที่ถูกปฏิเสธ (เดินผิดตา วางช่องที่มีหมากแล้ว) ไม่ถูกบันทึก ถ้าเขียน log ไม่สำเร็จ ระบบจะพิมพ์ข้อผิดพลาดแล้วเล่นต่อได้ตามปกติ การเก็บ log ไม่ทำให้เกมสะดุด

#### ประเภทของเหตุการณ์

| `type` | เกิดเมื่อ | `color` | ฟิลด์เพิ่ม |
| --- | --- | --- | --- |
| `create` | สร้างห้อง | สีของผู้สร้าง | `minutes`, `first` (`me` / `opponent` / `random`) |
| `join` | ผู้เล่นคนที่สองเข้าห้อง เกมและนาฬิกาเริ่ม | สีของผู้เข้า | |
| `move` | วางหมาก (ทุกตา ไม่มีข้อยกเว้น) | ผู้วาง | `ply`, `cell`, `label`, `thinkMs`, `clock`, `advice`, `adviceBest` |
| `undo_request` | ขอย้อนตาล่าสุดของตัวเอง | ผู้ขอ | `ply` |
| `undo_accept` | อีกฝ่ายยอมรับ เกมย้อนหนึ่งตา | ผู้ตอบ | `ply` (ก่อนย้อน) |
| `undo_decline` | อีกฝ่ายปฏิเสธ | ผู้ตอบ | `ply` |
| `undo_cancel` | ผู้ขอยกเลิกคำขอเอง | ผู้ขอ | `ply` |
| `resign` | ยอมแพ้ | ผู้ยอมแพ้ | `ply` |
| `timeout` | server พบว่านาฬิกาหมด | ฝ่ายที่หมดเวลา | `ply` |
| `rematch_request` | คนแรกขอเล่นอีกครั้ง | ผู้ขอ | `ply` |
| `rematch_start` | คนที่สองตอบรับ สลับสีหมาก | ผู้ตอบรับ | `game` เป็นเลขเกมใหม่แล้ว |
| `finish` | เกมจบ ไม่ว่าด้วยเหตุใด (หนึ่งรายการต่อเกมเสมอ) | `null` (server เป็นผู้บันทึก) | `ply`, `winner`, `reason`, `clock` |

#### ฟิลด์ที่มีในทุกเหตุการณ์

| ฟิลด์ | ความหมาย |
| --- | --- |
| `type` | ประเภทตามตารางข้างบน |
| `code` | รหัสห้อง เช่น `JARZ5` |
| `game` | เกมที่เท่าไรในห้อง เริ่มที่ 1 และเพิ่มขึ้นทุกครั้งที่เล่นอีกครั้ง |
| `at` | เวลาที่เกิด เป็นเวลาสากล UTC (เวลาไทยคือ UTC+7) |
| `color` | `1` = ดำ, `2` = ขาว, `null` = server |

#### ฟิลด์ของเหตุการณ์ `move`

| ฟิลด์ | ความหมาย |
| --- | --- |
| `ply` | จำนวนหมากบนกระดานหลังตานี้ (1 = หมากตัวแรก) |
| `cell` | ตำแหน่งเป็นเลข 0–224: `แถว × 15 + คอลัมน์` นับจากมุมซ้ายบน |
| `label` | ตำแหน่งเดียวกันเป็นชื่อช่อง: คอลัมน์ `A`–`O` แถว `1`–`15` นับจากล่าง (`H8` คือกลางกระดาน) |
| `thinkMs` | เวลาตั้งแต่เริ่มตาของผู้เล่นจนวาง หน่วยมิลลิวินาที วัดโดย server |
| `clock` | เวลาคงเหลือ `[ดำ, ขาว]` หลังวาง หน่วยมิลลิวินาที |
| `advice.on` | เปิด "แสดงคำแนะนำตาต่อไป" อยู่หรือไม่ |
| `advice.timeMs` | เวลาคิดที่เลือกอยู่ ณ ตอนวาง (ค่าล่าสุด) |
| `advice.rank` | อันดับของช่องที่วางในรายการแนะนำบนจอ (1 = อันดับแรก) เป็น `null` ถ้าไม่อยู่ในรายการ |
| `advice.shown` | จำนวนตาที่แนะนำบนจอ ถ้าเป็น `0` แปลว่าวางก่อนที่คำแนะนำจะขึ้น |
| `advice.depth` | ความลึกของการค้นที่ให้คำแนะนำชุดนั้น |
| `advice.best` | ตาที่แนะนำอันดับแรก เป็นเลขช่อง |
| `advice.score` | คะแนนของตาอันดับแรก (ตั้งแต่ 40000 ขึ้นไปแปลว่าเจอแนวบังคับ) |
| `advice.changes` | จำนวนครั้งที่เปลี่ยนเวลาคิด นับจากตาก่อนหน้าของผู้เล่นคนนั้น |
| `advice.stops` | จำนวนครั้งที่กด "หยุดคิด" นับจากตาก่อนหน้าของผู้เล่นคนนั้น |
| `advice.done` | ตอนวางหมาก การคิดรอบล่าสุดครบเวลาแล้วหรือยัง |
| `adviceBest` | `advice.best` ในรูปชื่อช่อง เช่น `H9` |

เมื่อปิดคำแนะนำ `advice.on` เป็น `false` และฟิลด์อื่นของ `advice` เป็น `null` ทั้งหมด

#### เอกสารใน `games`

| ฟิลด์ | ความหมาย |
| --- | --- |
| `code`, `game` | ห้องไหน และเกมที่เท่าไรในห้อง (คู่นี้ไม่ซ้ำกัน) |
| `minutes` | เวลาคิดต่อคน `0` = ไม่จับเวลา |
| `moves`, `labels` | ลำดับตาเดินสุดท้าย เป็นเลขช่องและเป็นชื่อช่อง ไม่รวมตาที่ถูกย้อน |
| `plies` | จำนวนตา |
| `winner` | `1` = ดำ, `2` = ขาว, `0` = เสมอ |
| `reason` | `five` (เรียงห้า), `time` (หมดเวลา), `resign` (ยอมแพ้) หรือ `draw` (เสมอ) |
| `startedAt`, `endedAt`, `durationMs` | เวลาเริ่ม เวลาจบ และความยาวของเกม |

ตัวอย่าง log จริงอยู่ในส่วนภาษาอังกฤษด้านบน (หัวข้อ Example)

#### สิ่งที่ควรรู้ก่อนวิเคราะห์

- **ข้อมูล `advice` ส่งมาจากเบราว์เซอร์** server เก็บเฉพาะค่าที่รูปแบบถูกต้อง แต่ตรวจไม่ได้ว่าเป็นความจริง ส่วนค่าอื่นทั้งหมด (`thinkMs`, `clock`, ตาเดิน, ผลเกม) server เป็นผู้ตัดสิน
- **`rank: null` มีสองสาเหตุ:** ผู้เล่นไม่ทำตามรายการ หรือวางก่อนที่รายการจะขึ้น ใช้ `advice.shown` แยกได้
- **`advice.done` เป็น `true` ได้ก่อนครบเวลา** เมื่อการค้นจบเร็วเพราะเจอผลบังคับหรือถึงความลึกสูงสุด
- **การย้อนตาแก้เกม แต่ไม่แก้ log** เหตุการณ์ `move` ของตาที่ถูกย้อนยังอยู่ใน `events` มีเพียง `games.moves` ที่แสดงเกมสุดท้าย
- **นับจำนวนเกมจาก `finish`** ไม่ใช่ `resign` หรือ `timeout` เพราะทุกเกมที่จบมีหนึ่งรายการเสมอ เกมที่ยังเล่นอยู่หรือถูกทิ้งกลางคันจะไม่มี
- **คำแนะนำเป็นของแต่ละคน** ผู้เล่นแต่ละฝ่ายเปิดปิดเอง ใช้ `color` กรองเพื่อดูทีละฝ่าย
- **ขนาด** เหตุการณ์ `move` ราว 400 ไบต์ เกม 40 ตาจึงราว 20 KB cluster ฟรี 512 MB เก็บได้ประมาณ 25,000 เกม

#### การดูข้อมูล

ใน Atlas: Data Explorer → `gomoku` → `events` หรือ `games` ตัวอย่างคำสั่งวิเคราะห์อยู่ในส่วนภาษาอังกฤษ (หัวข้อ Looking at the data) ใช้ได้ทั้งในแท็บ Aggregations และใน `mongosh`

ถ้าจะนำไปใช้กับ Python หรือสเปรดชีต ใช้ปุ่ม export ของ Atlas หรือคำสั่ง `mongoexport --uri "$MONGODB_URI" --db gomoku --collection events --out events.json` ถ้าต้องการเริ่มเก็บใหม่ ให้ลบ collection `events` และ `games` ระบบจะสร้างใหม่เองเมื่อมีเกมถัดไป

### API

token ส่งผ่าน header `Authorization: Bearer <token>`

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
