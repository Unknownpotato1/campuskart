# CampusKart 🎓

A full-stack **college marketplace** web app where students buy, sell, and
collaborate on campus. Built with **Next.js 16**, **TypeScript**, **Tailwind
CSS**, and **shadcn/ui**.

> **Stack note:** The original brief specified Firebase. This repository ships
> with a **fully-working Prisma + SQLite** backend (cookie-based sessions,
> local image uploads with compression, polling-based real-time chat) so it
> runs end-to-end with **zero external credentials**. The data model mirrors
> the requested Firestore collections, and `README.md` documents how to swap
> to Firebase. A `.env.example` with all Firebase keys is included.

## ✨ Features

### Authentication
- Simulated **Google Sign-In** (one-click demo accounts + custom name/email)
- One-time **onboarding modal** — pick your **State → University/College**
  from a searchable dropdown (36 real Indian colleges pre-seeded)
- Profile stored with name, email, photo, college, city, state, phone

### Section 1 — Marketplace (OLX for students)
- List a product: title, description, price (₹), category, condition, up to
  **4 images** (auto-compressed with `browser-image-compression`), college
  (auto-filled, editable)
- Listings marked **Active / Sold**
- Students from the **same college** see listings first, others below under a
  **"From other colleges"** label
- Search + filter by category, condition, college
- Product cards: image, title, price, condition, seller's college, posted date
- Product detail page with image gallery, seller info, **Chat with Seller**
- **My Listings**: mark Sold / delete / Bump (max once / 24h)
- **Infinite scroll** (12 at a time), **Share** (copy link), **Report** listing

### Section 2 — Writing Hub
- **"I Need a Writer"** posts: title, subject, description, page count,
  deadline, price/page (default ₹8), auto-calculated total price
- **"I Can Write"** posts: title, subjects (multi-select tags), description,
  rate, turnaround
- Two tabs: **Need a Writer** | **Writers Available**
- **"I'll Write This"** / **"Hire This Writer"** buttons start a chat
- Status: Open / In Progress / Completed
- Filter by college, subject, deadline
- "Payment to be settled directly between students" note

### Section 3 — Real-time Chat
- Conversations tied to a product or writing post (shown as context at top)
- **Unread badge** on the Chat nav icon
- Conversations list (left) + messages (right), responsive stacking on mobile
- Polling-based live updates (no Socket.io, per the brief)

### UI / UX
- Clean, modern design with a **green campus** primary color
- **Dark mode** toggle
- Loading skeletons, toast notifications, empty-state illustrations
- Smooth **Framer Motion** tab transitions
- Fully mobile-responsive, sticky footer

## 🚀 Getting started

```bash
# 1. Install dependencies
bun install

# 2. Copy env and set the DB URL / session secret
cp .env.example .env

# 3. Push the database schema & seed colleges
bun run db:push
bun run scripts/seed.ts

# 4. Start the dev server
bun run dev
```

Open the app via the preview panel (the dev server runs on port 3000).

## 🗂 Project structure

```
prisma/schema.prisma        # User, College, Product, WritingPost,
                            # Conversation, Message, ConversationRead, Report
src/lib/
  db.ts                     # Prisma client
  session.ts                # signed cookie sessions
  colleges.ts               # 36 Indian colleges seed data
  types.ts                  # shared TS types + parsers
src/app/api/                # auth, colleges, profile, upload, products,
                            # writing, conversations
src/components/
  site/                     # header, footer, auth/onboarding modals,
                            # college select, image upload, theme toggle
  marketplace/              # marketplace view, product card/detail, forms
  writing/                  # writing hub view, cards, forms
  chat/                     # chat view
  profile/                  # profile + my listings + my writing posts
  shared/                   # empty state, loading skeletons
src/hooks/use-nav.ts        # query-param navigation (shareable URLs)
src/store/auth-store.ts     # zustand auth state
```

## 🔌 API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | simulated Google sign-in → sets session cookie |
| POST | `/api/auth/logout` | clear session |
| GET | `/api/auth/me` | current user |
| GET | `/api/colleges` | list colleges |
| GET/PATCH | `/api/profile` | read / update profile |
| GET | `/api/profile/my-content` | my listings + writing posts |
| POST | `/api/upload` | image upload (compressed client-side) |
| GET/POST | `/api/products` | list/create products (filters, pagination) |
| GET/PATCH/DELETE | `/api/products/[id]` | product CRUD |
| POST | `/api/products/[id]/bump` | bump (max once / 24h) |
| POST | `/api/products/[id]/report` | report a listing |
| GET/POST | `/api/writing` | list/create writing posts |
| GET/PATCH/DELETE | `/api/writing/[id]` | writing post CRUD |
| GET/POST | `/api/conversations` | list / find-or-create conversation |
| GET | `/api/conversations/[id]` | single conversation |
| GET/POST | `/api/conversations/[id]/messages` | messages |
| POST | `/api/conversations/[id]/read` | mark read |
| GET | `/api/conversations/unread` | total unread count (for badge) |

## 🔁 Migrating to Firebase (optional)

The Prisma layer maps 1:1 to the requested Firestore structure:

| Prisma model | Firestore collection |
| --- | --- |
| User | `users/{userId}` |
| College | `colleges/{collegeId}` |
| Product | `products/{productId}` |
| WritingPost | `writingPosts/{postId}` |
| Conversation | `conversations/{convId}` |
| Message | `conversations/{convId}/messages/{msgId}` |
| Report | `reports/{reportId}` |

To migrate:
1. Install the Firebase JS SDK and `firebase-admin`.
2. Fill in the `NEXT_PUBLIC_FIREBASE_*` env vars (see `.env.example`).
3. Replace `src/lib/session.ts` + `/api/auth/*` with Firebase Auth (Google
   provider) and verify the ID token in a server-side session cookie.
4. Replace Prisma queries in `/api/**` with Firestore SDK calls. Keep the same
   JSON response shapes so the UI needs no changes.
5. Replace `/api/upload` with Firebase Storage uploads.
6. Swap the chat polling in `src/components/chat/chat-view.tsx` for Firestore
   `onSnapshot` listeners.
7. Deploy Firestore security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
    match /products/{id} {
      allow read: if true;
      allow create: if request.auth.uid == request.resource.data.sellerId;
      allow update, delete: if request.auth.uid == resource.data.sellerId;
    }
    match /writingPosts/{id} {
      allow read: if true;
      allow create: if request.auth.uid == request.resource.data.userId;
      allow update, delete: if request.auth.uid == resource.data.userId;
    }
    match /conversations/{convId} {
      allow read, write: if request.auth.uid in resource.data.participants;
      match /messages/{msgId} {
        allow read: if request.auth.uid in
          get(/databases/$(db)/documents/conversations/$(convId)).data.participants;
        allow create: if request.auth.uid == request.resource.data.senderId;
      }
    }
  }
}
```

## 🛠 Tech stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** (New York)
- **Prisma** + **SQLite**
- **Zustand** (auth state), **Framer Motion** (transitions)
- **next-themes** (dark mode), **sonner** / radix toast (notifications)
- **browser-image-compression**, **date-fns**, **lucide-react**

## 📦 Deploy to Vercel

1. Push the repo to GitHub.
2. Import it in Vercel.
3. Add env vars (`DATABASE_URL`, `SESSION_SECRET`, and the Firebase keys if
   using Firebase).
4. For SQLite on Vercel, switch to a hosted DB (Postgres via Prisma) or use
   Firebase — see "Migrating to Firebase".

---

Made with 💚 for students.
