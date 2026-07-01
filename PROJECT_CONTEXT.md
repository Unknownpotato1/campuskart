# CampusKart — Complete Project Context

> **📋 INSTRUCTIONS FOR STARTING A NEW CHAT:**
> 1. Copy this ENTIRE file (select all, copy)
> 2. Paste it as your FIRST message in the new chat
> 3. Then say what you want to build (e.g., "Add a favorites feature")
>
> **⚠️ CRITICAL SAFETY RULES FOR THE NEW CHAT (read these first):**
> - NEVER run `git reset --hard` — it destroys uncommitted work
> - NEVER run `git gc --prune=now` — it permanently deletes orphaned commits
> - NEVER run `git filter-branch` without backing up first
> - BEFORE making changes, always run `git log --oneline -5` to see current state
> - BEFORE starting, run `git pull origin main` to get the latest code from GitHub
> - Make SMALL commits frequently (one feature per commit), not one big commit
> - **PREVIEW-FIRST WORKFLOW:** Always deploy with `vercel` (NOT `vercel --prod`).
>   Give the user the preview URL to test. Only promote to production when approved.
> - After EVERY change: `bun run lint` → `bunx tsc --noEmit` → preview deploy → user tests → promote
> - If a deploy fails, DO NOT continue making changes — fix the build first
> - DO NOT touch auth/login files or Firebase config unless explicitly asked
> - DO NOT bulk-import data into Firestore (causes quota exhaustion)
> - Keep this file updated after major changes (bump the "Last updated" date)
>
> Last updated: July 2, 2026 · Status: ✅ Live in production on Vercel
> Current commit: `7260d5e` "feat: replace header avatar+theme toggle with menu button + settings dialog"

---

## 1. Project Overview

**CampusKart** is a full-stack college marketplace web app where students buy, sell, and collaborate on campus.

- **Live URL:** https://campuskart-seven.vercel.app
- **GitHub repo:** https://github.com/Unknownpotato1/campuskart
- **Vercel project:** `campuskart` (id: `prj_EZqCxkRDqyRqG5dWL2WORnIDvEcV`, account: `unknownpotato1`)
- **Firebase project:** `uni-olx-51ee4` (Spark/free plan)
- **Cloudinary cloud:** `drlmgjt6p`

---

## 2. Tech Stack

### Core
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5
- **Runtime:** React 19

### Frontend
- Tailwind CSS 4 + shadcn/ui (New York style)
- lucide-react icons, Framer Motion animations
- Zustand (auth state), next-themes (dark mode)
- browser-image-compression, date-fns

### Backend
- **Auth:** Firebase Auth (Google Sign-In)
- **Database:** Firestore (Firebase Admin SDK v12 — NOT v14)
- **Image storage:** Cloudinary (free tier)
- **Session:** Signed cookie (HMAC) in `src/lib/session.ts`
- **Real-time chat:** Firestore onSnapshot + polling fallback

### Deploy
- **Package manager:** bun
- **Deploy:** Vercel CLI (`vercel` for preview, `vercel --prod` for production)

---

## 3. Folder Structure

```
src/
├── app/
│   ├── api/                    # All API routes (each starts with runtime="nodejs")
│   │   ├── auth/{login,logout,me}/
│   │   ├── colleges/           # Returns hardcoded 37 colleges (no Firestore read)
│   │   ├── profile/{route,my-content}/
│   │   ├── upload/             # ?kind=listing|chat
│   │   ├── products/{route,[id]/{route,bump,report}}/
│   │   ├── writing/{route,[id]}/
│   │   └── conversations/{route,unread,[id]/{route,messages,read}}/
│   ├── globals.css             # Green theme (#33aa53 primary)
│   ├── layout.tsx              # Root layout + metadata + manifest
│   └── page.tsx                # ONLY route: / (view router)
├── components/
│   ├── ui/                     # shadcn/ui (do not modify)
│   ├── site/                   # header, footer, bottom-nav, auth-modal,
│   │                           # onboarding-modal, college-select, image-upload,
│   │                           # avatar-upload, theme-toggle, pwa-install-prompt
│   ├── marketplace/            # home-view, marketplace-view, product-card,
│   │                           # product-detail-view, new-listing-form, banner
│   ├── writing/                # writing-view, writing-card, new-writing-form
│   ├── chat/                   # chat-view (WhatsApp-style)
│   ├── profile/                # profile-view
│   ├── shared/                 # empty-state, loading-skeletons
│   └── view-router.tsx
├── hooks/                      # use-nav, use-mobile, use-toast
├── lib/                        # db, session, colleges, types, firebase-client,
│                               # firebase-admin, firebase-server, firestore, cloudinary
└── store/auth-store.ts
```

---

## 4. Database Schema (Firestore)

- `users/{uid}` — id, email, name, photo, phone, collegeId, collegeName, city, state, onboarded, createdAt, updatedAt
- `colleges/{id}` — name, city, state (NOT USED by app — colleges are hardcoded in src/lib/colleges.ts)
- `products/{id}` — title, description, price, images[], category, condition, sellerId, sellerName, collegeId, collegeName, status, bumpedAt, createdAt, updatedAt
- `writingPosts/{id}` — type (NEED_WRITER|CAN_WRITE), title, subject, description, pageCount, deadline, pricePerPage, totalPrice, subjects[], turnaround, userId, userName, collegeId, collegeName, status, createdAt, updatedAt
- `conversations/{id}` — participants[], contextType, contextId, contextTitle, lastMessage, lastMessageAt, lastSenderId
- `conversations/{id}/messages/{msgId}` — senderId, senderName, senderPhoto, content, type (text|image|file), attachment, read, createdAt
- `reports/{id}` — productId, reporterId, reason, createdAt

> **Note:** The Firestore `colleges` collection has ~53K junk documents from a previous bulk import. These are NOT used by the app (colleges are hardcoded). They can be deleted from the Firebase Console if desired.

---

## 5. Authentication Flow (RESILIENT)

1. User clicks Sign in → AuthModal → "Continue with Google"
2. `signInWithGoogle()` (firebase-client.ts) → popup → ID token
3. POST `/api/auth/login` with `{idToken}`
4. Server verifies via `admin.auth().verifyIdToken()`
5. Tries to upsert user in Firestore — if this FAILS (quota/network), still issues session cookie using verified Firebase user info
6. Sets signed httpOnly cookie `ck_session`
7. Client refetches `/api/auth/me`

**Key resilience features:**
- Login works even when Firestore is over quota (429)
- `getCurrentUser()` returns a fallback user from the session cookie if Firestore read fails
- User operations (`upsertUserFromFirebase`, `updateUser`) are WRITE-ONLY (no Firestore reads)

---

## 6. API Routes

All have `export const runtime = "nodejs"`.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/auth/login | Verify Google token, upsert user (write-only), set cookie |
| POST | /api/auth/logout | Clear session |
| GET | /api/auth/me | Current user (resilient to Firestore errors) |
| GET | /api/colleges | Returns 37 hardcoded colleges (NO Firestore read) |
| GET/PATCH | /api/profile | Read/update profile (write-only update) |
| GET | /api/profile/my-content | User's products + writing posts |
| POST | /api/upload?kind=listing\|chat | Upload to Cloudinary |
| GET/POST | /api/products | List/Create |
| GET/PATCH/DELETE | /api/products/[id] | CRUD (seller-only) |
| POST | /api/products/[id]/bump | Bump (24h cooldown) |
| POST | /api/products/[id]/report | Report |
| GET/POST | /api/writing | List/Create |
| GET/PATCH/DELETE | /api/writing/[id] | CRUD (author-only) |
| GET/POST | /api/conversations | List/Find-or-create |
| GET | /api/conversations/[id] | Single conversation |
| GET/POST | /api/conversations/[id]/messages | Messages/Send (text/image/file) |
| POST | /api/conversations/[id]/read | Mark read |
| GET | /api/conversations/unread | Unread count |

---

## 7. Environment Variables

In `.env` (local, gitignored) + Vercel project env vars. Template in `.env.example`.

- DATABASE_URL, SESSION_SECRET
- NEXT_PUBLIC_FIREBASE_* (6 client config keys)
- FIREBASE_SERVICE_ACCOUNT (secret JSON)
- CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
- VERCEL_TOKEN (for deploys)

> **Secrets live in `.env` (gitignored) — NOT in this file.**
> **The `.env` file gets wiped sometimes — if it happens, restore it with all tokens.**

---

## 8. Preview-First Deploy Workflow (IMPORTANT)

```bash
# 1. Make code changes
# 2. Lint + typecheck
bun run lint && bunx tsc --noEmit

# 3. Deploy PREVIEW (not production)
VERCEL_TOKEN=<token> vercel --yes
# → Returns a preview URL

# 4. Add the preview domain to Firebase authorized domains (for sign-in testing)
#    (Use the Identity Platform Admin API with the service account)

# 5. Give user the preview URL to test

# 6. User tests and approves

# 7. Promote to production (ONLY when approved)
VERCEL_TOKEN=<token> vercel --prod --yes
```

**Never deploy to production without user approval.**

---

## 9. Completed Features

- ✅ Firebase Google Sign-In (resilient to Firestore quota)
- ✅ Onboarding (37 hardcoded colleges, searchable — no Firestore read)
- ✅ Home page (slideshow banner, category boxes, quick actions)
- ✅ Marketplace (filters, infinite scroll, same-college grouping, product detail)
- ✅ Writing Hub (Need-a-Writer + I-Can-Write, tabs, filters)
- ✅ Chat (WhatsApp-style, full-screen, profile pictures, image/file attachments, real-time)
- ✅ Profile (avatar upload, my listings, my writing)
- ✅ Navigation (solid header, bottom nav with avatar, query-param routing)
- ✅ Custom logo image (public/logo.png)
- ✅ PWA install prompt (once-per-day) + manifest.json
- ✅ Green theme #33aa53 (exact logo green, raw hex)
- ✅ Dark mode
- ✅ Loading skeletons, toasts, empty states
- ✅ Write-only user operations (survives Firestore read quota exhaustion)
- ✅ Header menu (hamburger button → right-side Sheet with Browse / Account / Create sections)
- ✅ Settings dialog (Appearance: Light/Dark/System theme picker; About; Help/FAQ)

---

## 10. Important Decisions

- **firebase-admin v12** (not v14) — v14 has jose/jwks-rsa ESM conflict on Vercel
- **Cloudinary** (not Firebase Storage) — Firebase Storage needs paid Blaze plan
- **Hardcoded colleges** (not Firestore) — avoids quota issues, instant load
- **Write-only user operations** — `set` with `merge: true` instead of `get` + `update`
- **Resilient login** — if Firestore fails, still issues session cookie from verified Firebase token
- **Composite-index-free queries** — fetch filtered, sort in memory
- **Lazy-load firebase-admin** — `require()` inside `initAdmin()` + globalThis singleton
- **Chat full-screen** — header + bottom nav hidden when conversation open
- **Raw hex colors** (not OKLCH) — for exact logo green match (#33aa53)

---

## 11. Recovery Plan

If a chat breaks the code:
1. List deployments: `curl -s "https://api.vercel.com/v6/deployments?projectId=prj_EZqCxkRDqyRqG5dWL2WORnIDvEcV&limit=10" -H "Authorization: Bearer <TOKEN>"`
2. Find last READY deployment
3. Promote it: `curl -X POST "https://api.vercel.com/v2/deployments/<ID>/aliases?teamId=team_PfacJwxqcLCmknzCxhP5HrDy" -H "Authorization: Bearer <TOKEN>" -d '{"alias":"campuskart-seven.vercel.app"}'`
4. Restore local code: `git pull origin main` or recreate from this doc

---

## 12. Credentials (non-secret)

| Service | Value |
|---|---|
| Vercel project ID | `prj_EZqCxkRDqyRqG5dWL2WORnIDvEcV` |
| Vercel team ID | `team_PfacJwxqcLCmknzCxhP5HrDy` |
| Firebase project ID | `uni-olx-51ee4` |
| Cloudinary cloud | `drlmgjt6p` |
| GitHub repo | `Unknownpotato1/campuskart` |

> Secret tokens are in `.env` (gitignored). Get them from:
> - Vercel token: https://vercel.com/account/tokens
> - Cloudinary: https://console.cloudinary.com/console
> - Firebase service account: https://console.firebase.google.com/project/uni-olx-51ee4/settings/serviceaccounts/adminsdk

---

**End of context document.** Paste everything above into a new chat to continue.
