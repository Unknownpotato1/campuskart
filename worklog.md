# CampusKart — Work Log

This file is the shared worklog for all agents building CampusKart.
Each agent MUST read this file before starting, and append a new section
(separated by `---`) after finishing.

## Project Overview

CampusKart is a full-stack college marketplace web app. **Note on stack:**
The user requested Firebase, but the sandbox is preconfigured with
Prisma + SQLite and has no real Firebase credentials. We therefore build a
fully-functional equivalent on the available stack:

- **Auth** → cookie-based session (`src/lib/session.ts`) with a *simulated*
  Google Sign-In modal (`src/components/site/auth-modal.tsx`). The
  `/api/auth/login` endpoint creates/finds a user by email and sets an
  httpOnly signed session cookie.
- **Database** → Prisma + SQLite (`prisma/schema.prisma`), mirroring the
  requested Firestore collections as tables (User, College, Product,
  WritingPost, Conversation, Message, ConversationRead, Report).
- **Storage** → local file uploads to `public/uploads/` via `/api/upload`,
  with client-side compression via `browser-image-compression`.
- **Real-time chat** → polling (every ~3s) instead of Firestore listeners.

All functional requirements are met. A README + `.env.example` will be added
documenting how to migrate to Firebase.

## Architecture / Conventions (READ THIS)

- **Single user-visible route**: only `/` is shown to the user. Navigation is
  done via query params using the `useNav()` hook
  (`src/hooks/use-nav.ts`):
  - `?view=marketplace` (default)
  - `?view=product&id=<productId>`
  - `?view=writing`
  - `?view=chat&conv=<conversationId>`
  - `?view=profile`
  - `?view=new-listing`, `?view=new-writing`
  - Extra params allowed (e.g. `tab=listings`).
- **Theme**: green primary color already configured in `globals.css`.
  Use `bg-primary`, `text-primary`, etc. Do NOT use indigo/blue.
- **Sticky footer**: the root wrapper in `page.tsx` uses
  `min-h-screen flex flex-col`; the `<Footer>` has `mt-auto`.
- **Auth**: `useAuth()` zustand store (`src/store/auth-store.ts`) holds the
  current user. `user.loading` is true until first `/api/auth/me` resolves.
  When `user` is null → show `AuthModal`. When `user.onboarded === false` →
  show `OnboardingModal`.
- **Toasts**: use `const { toast } = useToast()` from `@/hooks/use-toast` for
  all user actions.
- **API helper**: there is no shared client fetch helper; use `fetch` directly.
  All API routes return JSON. Mutations return the updated entity.
- **Image URLs**: stored as JSON string in `Product.images` /
  `WritingPost` (n/a). Parse with `JSON.parse` on read. Empty → `[]`.
- **Date formatting**: use `date-fns` (already installed). e.g.
  `format(new Date(x), "d MMM yyyy")`.

## Prisma Schema (final)

Defined in `prisma/schema.prisma`. Models:
- `User { id, email, name, photo, phone, collegeId, collegeName, city, state, onboarded, createdAt, updatedAt }`
- `College { id, name, city, state, createdAt }` (36 seeded)
- `Product { id, title, description, price, images(JSON string), category, condition, sellerId, sellerName, collegeId, collegeName, status(ACTIVE|SOLD), bumpedAt, createdAt, updatedAt }`
- `WritingPost { id, type(NEED_WRITER|CAN_WRITE), title, subject, description, pageCount?, deadline?, pricePerPage, totalPrice?, subjects(JSON string), turnaround?, userId, userName, collegeId, collegeName, status(OPEN|IN_PROGRESS|COMPLETED), createdAt, updatedAt }`
- `Conversation { id, participants(JSON string), contextType(PRODUCT|WRITING), contextId, contextTitle, lastMessage, lastMessageAt, lastSenderId, createdAt, updatedAt }`
- `Message { id, conversationId, senderId, senderName, content, read, createdAt }`
- `ConversationRead { id, conversationId, userId, lastReadAt }` unique on `[conversationId, userId]`
- `Report { id, productId, reporterId, reason, createdAt }`

## Existing API routes (foundation)

- `POST /api/auth/login` body `{name,email,photo?}` → `{user}`, sets cookie
- `POST /api/auth/logout` → `{ok:true}`
- `GET /api/auth/me` → `{user|null}`
- `GET /api/colleges` → `{colleges[]}`
- `GET /api/profile` → `{user}` ; `PATCH /api/profile` body
  `{name?,phone?,photo?,collegeId?}` → `{user}`
- `POST /api/upload` multipart `file` → `{url}`
- `GET /api/conversations/unread` → `{count}`

## Existing components (foundation)

- `src/components/site/header.tsx` — `<Header onSignIn={()=>...} />`
- `src/components/site/footer.tsx` — `<Footer />`
- `src/components/site/theme-toggle.tsx`
- `src/components/site/theme-provider.tsx`
- `src/components/site/auth-modal.tsx` — `<AuthModal open onOpenChange />`
- `src/components/site/onboarding-modal.tsx` — `<OnboardingModal open onOpenChange dismissable? />`
- `src/components/site/college-select.tsx` — `<CollegeSelect value onChange placeholder />`
- `src/components/site/image-upload.tsx` — `<ImageUpload value=urls[] onChange=urls[] max=4 />`
- `src/components/shared/empty-state.tsx` — `<EmptyState icon title description action />`
- `src/components/shared/loading-skeletons.tsx` — `ProductGridSkeleton`,
  `WritingListSkeleton`, `ChatSkeleton`, etc.

## What each subsequent Task ID must build

- **Task 2-a (Marketplace)**: API routes under `/api/products`, and
  components under `src/components/marketplace/`. Export:
  `MarketplaceView`, `ProductDetailView`, `NewListingForm` (used as a full
  page view), plus any internal components.
- **Task 2-b (Writing Hub)**: API routes under `/api/writing`, and components
  under `src/components/writing/`. Export: `WritingView`, `NewWritingForm`.
- **Task 2-c (Chat)**: API routes under `/api/conversations`, and component
  `src/components/chat/chat-view.tsx` exporting `ChatView`.
- **Task 2-d (Profile)**: component `src/components/profile/profile-view.tsx`
  exporting `ProfileView`. Reuses products/writing APIs.

---
Task ID: 1
Agent: main (orchestrator)
Task: Foundation — theme, schema, colleges seed, auth/session, layout, header, footer, shared components, navigation hook, auth/colleges/profile/upload APIs.

Work Log:
- Configured green campus theme in `src/app/globals.css` (light + dark).
- Rewrote `prisma/schema.prisma` with all 8 models; ran `bun run db:push`.
- Created `src/lib/colleges.ts` with 36 real Indian colleges across 9 states.
- Ran `scripts/seed.ts` → 36 colleges seeded into SQLite.
- Built cookie session system in `src/lib/session.ts` (signed token, httpOnly).
- Created auth APIs: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`.
- Created `/api/colleges`, `/api/profile` (GET+PATCH), `/api/upload`, `/api/conversations/unread`.
- Installed `browser-image-compression`.
- Built `useAuth` zustand store and `useNav` query-param navigation hook.
- Built shared/site components: Header, Footer, ThemeToggle, ThemeProvider,
  AuthModal (simulated Google login + demo accounts), OnboardingModal,
  CollegeSelect (searchable, grouped by state), ImageUpload (compression).
- Built EmptyState + loading skeletons.
- Updated `layout.tsx` with ThemeProvider + CampusKart metadata.
- Created logo.svg + placeholder.svg in public/.

Stage Summary:
- Foundation is complete. The dev server is running on port 3000.
- Subagents can now build Marketplace / Writing Hub / Chat / Profile against
  the documented API contracts and component conventions above.
- IMPORTANT for subagents: you MUST create your own API route files and
  component files. Do NOT modify `page.tsx` — the orchestrator will wire your
  exports into it in the final phase. Read this worklog fully first.

---
Task ID: 2-a
Agent: marketplace-builder
Task: Build the Marketplace feature — product API routes (list/create/get/patch/delete/bump/report) and the Marketplace UI components (MarketplaceView, ProductCard, ProductDetailView, NewListingForm).

Work Log:
- Read worklog.md foundation: theme (green primary), schema (Product/Report models), auth (`getCurrentUser`), navigation (`useNav`), shared types (`parseProduct`, `Product`, `ProductCategory`, `ProductCondition`), shared components (ImageUpload, CollegeSelect, EmptyState, ProductGridSkeleton), toast hook.

API routes created (all under `src/app/api/products/**`):
1. `route.ts`
   - `GET /api/products` — filters via query params: `q` (case-insensitive contains on title+description via OR), `category`, `condition`, `collegeId`, `limit` (default 12, capped at 24), `cursor` (ISO date string). Keyset pagination by `bumpedAt desc` with `where.bumpedAt = { lt: cursor }` combined via AND. Takes `limit+1` to detect next page. Returns `{ products, nextCursor }` with each row parsed via `parseProduct`.
   - `POST /api/products` — protected. Validates title/description/price≥0/category/condition. Stores images as `JSON.stringify`. Sets `sellerId`/`sellerName` from session. If a `collegeId` is supplied, looks up the canonical college name; otherwise falls back to the seller's college. `status="ACTIVE"`, `bumpedAt=now()`. Returns parsed product (201).
2. `[id]/route.ts`
   - `GET` → 404 if missing, else `{ product }`.
   - `PATCH` — only seller. Accepts optional `status`, `title`, `description`, `price`, `category`, `condition`, `images`, `collegeId`. College change re-looks up the canonical name.
   - `DELETE` — only seller. Hard delete. Returns `{ ok: true }`.
3. `[id]/bump/route.ts`
   - `POST` — only seller. Computes elapsed ms since `bumpedAt`; if < 24h returns 400 with hours remaining message ("You can bump a listing at most once every 24 hours. Try again in ~Nh."). Else sets `bumpedAt=now()` and returns updated product.
4. `[id]/report/route.ts`
   - `POST` — protected. Body `{ reason }` (required). Checks existing report by `(productId, reporterId)`; if exists returns 409 with "You have already reported this listing." Else creates a `Report`. Returns `{ ok: true }`.

Components created (all under `src/components/marketplace/**`):
5. `product-card.tsx` — `ProductCard({ product, onClick })`. Accessible button wrapping a card. `aspect-[4/3]` cover image (or `/placeholder.svg`), SOLD badge (top-left, destructive) + condition badge (top-right, secondary). Body shows title (line-clamp-1), price (`₹{toLocaleString("en-IN")}`) in primary, then a row with college name (Building2 icon, truncate) and `format(createdAt, "d MMM yyyy")`. Hover scales image. Whole card keyboard-focusable.
6. `marketplace-view.tsx` — `MarketplaceView`. Header (title + subtitle + "Sell something" → `navigate("new-listing")`). Filters bar (responsive, stacks on mobile): debounced search input with Search icon + clear button, category Select (with "All categories"), condition Select, CollegeSelect (null = "All colleges"). Fetches `/api/products?…&limit=12` and uses IntersectionObserver on a sentinel div for infinite scroll, appending via `nextCursor`. **College grouping**: when no college filter active, splits loaded products into same-college (header "From {college}") and others ("From other colleges"); otherwise shows single grid. Skeleton on initial load; EmptyState with Store icon when no matches; "Sell something" CTA in empty state. Cards wrapped in `motion.div` with `whileHover={{ y: -4 }}`.
7. `product-detail-view.tsx` — `ProductDetailView`. Reads `id` from `useNav`. Fetches `GET /api/products/{id}`; 404 → EmptyState with back button. Two-column on desktop (`grid lg:grid-cols-2 gap-8`): image gallery (main + 4 thumbnails, state-driven active image) on the left; on the right: category/condition badges, title, price (primary, ₹), description, seller card (avatar initials, name, college, posted date). Buttons: if NOT seller → "Chat with Seller" (POST `/api/conversations` → `navigate("chat", { conv })`), "Share" (clipboard copy of `origin/?view=product&id=…` + toast), "Report" (Dialog with Textarea → POST `/api/products/{id}/report`). If seller → seller-controls panel: "Mark as Sold/Active" toggle (PATCH status), "Bump listing" (POST bump with toast/error), "Edit" (navigate to `new-listing` with `extra.edit=id`), "Delete" (AlertDialog confirm → DELETE → navigate back). Loading skeleton mirrors layout. Uses motion for entrance.
8. `new-listing-form.tsx` — `NewListingForm`. Centered max-w-2xl Card with title "Post a listing" (or "Edit listing" when `extra.edit` present). Fields: Title (Input), Description (Textarea), Price (Input type=number with ₹ prefix), Category (Select with the 6 options), Condition (RadioGroup horizontal, 4 options styled as selectable chips), Images (`<ImageUpload max={4} />`), College (`<CollegeSelect />` initialized from `user.collegeId`, editable). Inline validation errors (title, description, price>0, category, condition). Submit → POST `/api/products` (or PATCH when editing). On success toast + `navigate("product", { id })`. Loading state on submit button (Loader2 spin). Cancel → `navigate("marketplace")`. Edit mode prefills from `GET /api/products/{editId}` and rejects non-sellers.

Quality checks:
- All API routes use `import { db } from "@/lib/db"` and `import { getCurrentUser } from "@/lib/session"`.
- Used shared `parseProduct`/`Product` types throughout — no duplicated type defs.
- Green primary tokens only (`text-primary`, `bg-primary/10`, `border-primary/30`). No indigo/blue.
- Indian Rupee formatting everywhere (`₹${price.toLocaleString("en-IN")}`).
- `line-clamp-1`/`line-clamp-2` for truncation.
- Mobile-first responsive: grids use `sm:`, `lg:`, `xl:` prefixes; filters stack on mobile; gallery stacks below details on mobile.
- Accessible: labels on every field, `aria-label` on icon-only buttons, `aria-invalid` on inputs with errors, keyboard-focusable cards, AlertDialog for destructive action, Dialog for report.
- Used framer-motion for card entrance + page transitions (whileHover y:-4, initial opacity/y animate).
- Verified end-to-end against the running dev server: created a product, listed it, fetched by id, attempted bump (correctly rejected within 24h window), submitted a report, submitted duplicate report (correctly 409), PATCHed status to SOLD, DELETEd — all returned expected shapes and status codes.

Lint:
- Ran `bun run lint`. The 4 errors + 1 warning remaining are all in **foundation files** outside this task's scope (`src/app/page.tsx`, `src/components/site/header.tsx`, `src/components/site/theme-toggle.tsx`, `src/components/site/image-upload.tsx`) — pre-existing `react-hooks/set-state-in-effect` and unused-disable-directive issues. Ran `bunx eslint src/components/marketplace src/app/api/products` to confirm: **zero errors and zero warnings in my files**.
- TypeScript: `bunx tsc --noEmit` reports no errors in any of my files (only pre-existing errors in `examples/` and `skills/`).
- `@next/next/no-img-element` rule is OFF in `eslint.config.mjs`, so I removed the unused `eslint-disable` comments from my `<img>` tags to keep the lint output clean.

Stage Summary:
- Marketplace feature is complete and wired via `view-router.tsx` (orchestrator-owned; my exports are `MarketplaceView`, `ProductDetailView`, `NewListingForm`, `ProductCard`).
- API surface for products: `GET/POST /api/products`, `GET/PATCH/DELETE /api/products/[id]`, `POST /api/products/[id]/bump`, `POST /api/products/[id]/report`. All contract-compliant with the spec (filtering, keyset pagination, 24h bump cooldown, duplicate-report prevention, seller-only mutations).
- Subsequent tasks (2-c Chat, 2-d Profile) can reuse `GET /api/products?sellerId=…` style filters if needed (note: `sellerId` filter is not implemented in this task — Profile can fetch via a separate query or add a `sellerId` filter). `POST /api/conversations` is invoked from `ProductDetailView` per the contract; the Chat agent (2-c) must implement that endpoint accepting `{ contextType, contextId, contextTitle, participantId }` and returning `{ conversation }`.
- No files outside `src/app/api/products/**` and `src/components/marketplace/**` were modified.

---
Task ID: 2-c
Agent: chat-builder
Task: Build the Real-time Chat feature — conversation/message API routes (list, create/find-or-create, single-get, messages list/send, mark-read) and the ChatView UI component (conversation list pane + messages pane with polling, optimistic send, mobile responsive, framer-motion entrance).

Work Log:
- Read worklog.md foundation + marketplace (2-a) sections: green primary theme, schema (Conversation / Message / ConversationRead models), `getCurrentUser` session, `useNav` (`view==="chat"`, `conv` = selected conversation id), shared types (`parseConversation`, `Conversation`, `ConversationRaw`, `Message`), `EmptyState`, `ChatSkeleton`, `useToast`, framer-motion installed, no Socket.io (use polling per explicit requirement to simulate Firestore listeners).
- Read the marketplace's `ProductDetailView` "Chat with Seller" implementation to confirm the contract: `POST /api/conversations { contextType:"PRODUCT", contextId, contextTitle, participantId }` → `{ conversation }` (or `{ conversation: {...} }` accepted) → `navigate("chat", { conv: conv.id })`. My endpoint returns `{ conversation }` exactly as specified.

API routes created (all under `src/app/api/conversations/**`):

1. `src/app/api/conversations/route.ts`
   - `GET /api/conversations` — protected (401 if no session). Returns `{ conversations: Array<Conversation & { unread: number; otherName?: string }> }`. Query: `where: { participants: { contains: user.id } }` (substring match on the JSON-stringified participants works because cuid ids never appear as substrings of each other), ordered by `lastMessageAt desc`. For each conversation, computes `unread` = count of messages where `senderId != user`, `read = false`, AND `createdAt > user's ConversationRead.lastReadAt` (or all such unread if no read row). `otherName` is resolved by bulk-fetching the "other" participant's name from `User` (single `findMany` with `id IN (...)`, then map). `ConversationRead` rows are also bulk-fetched in one query to avoid N+1.
   - `POST /api/conversations` — protected. Body `{ contextType, contextId, contextTitle, participantId }`. Validates `contextType ∈ {PRODUCT, WRITING}`, requires `contextId` and `participantId`, rejects self-conversations (400 "Cannot start a conversation with yourself.") and non-existent participants (404). Find-or-create: queries conversations by `contextId`, then filters in JS (SQLite can't do JSON array membership) for one whose parsed `participants` includes both `user.id` and `participantId`. Returns existing (200) or creates new with `participants: JSON.stringify([user.id, participantId])`, `lastMessage: ""`, `lastMessageAt: now`, `lastSenderId: null` (201). Idempotent — verified end-to-end that a second POST with the same contextId+participantId returns the original conversation.

2. `src/app/api/conversations/[id]/route.ts`
   - `GET` — protected. Verifies the current user is a participant (404 if not found OR not a participant — never reveals existence to non-participants). Returns `{ conversation }` parsed, with `otherName` resolved from the `User` table.

3. `src/app/api/conversations/[id]/messages/route.ts`
   - `GET` — protected; verify participant. Returns `{ messages: Message[] }` ordered by `createdAt asc`, capped at 200 for safety.
   - `POST` — protected; verify participant. Body `{ content }` (required, max 4000 chars). Creates the message (`senderId`/`senderName` from session, `read:false`). Updates the conversation: `lastMessage = content`, `lastMessageAt = now`, `lastSenderId = senderId`. Upserts `ConversationRead` for the sender with `lastReadAt = now` (so the sender's own unread badge stays 0). Also flips `read=true` on all messages in this conversation sent by the OTHER party that are older — nice-to-have so the recipient's read flags flip when the sender replies. Returns `{ message }` (201). A small `authorize()` helper centralizes the participant check and is reused by both handlers.

4. `src/app/api/conversations/[id]/read/route.ts`
   - `POST` — protected; verify participant. Runs a Prisma `$transaction` that (a) upserts `ConversationRead` for the current user with `lastReadAt = now`, and (b) `updateMany` flips `read=true` on all messages in this conversation where `senderId != currentUserId` and `read = false`. Returns `{ ok: true }`.

Component created:

5. `src/components/chat/chat-view.tsx` — exports `ChatView`.
   - Reads `conv` (selected conversation id, may be null) and `navigate` from `useNav()`. Uses `useIsMobile()` to drive mobile list↔messages switching.
   - Layout: `grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-9rem)]` (fixed-height chat shell). On mobile, `showMessagesOnMobile = isMobile && !!conv` toggles the two panes via `cn(... ? "hidden":"block", "md:block")` — when a conversation is selected, the list is hidden and the messages pane is shown with a back button; otherwise the list is shown. On desktop both panes are always visible.
   - **ConversationList** (left pane):
     - Fetches `GET /api/conversations` on mount; polls every 5s (cleared on unmount).
     - Renders a search box (Input with Search icon) that filters client-side by `contextTitle` or `otherName`.
     - Each list item: avatar with initials, bold context title, last-message preview (truncate, muted), `formatDistanceToNow(lastMessageAt, { addSuffix: true })` time-ago, "with {otherName}" subline, and a primary unread badge (`{unread > 9 ? "9+" : unread}`) when `unread > 0`. Active conversation is highlighted with `bg-primary/10`. Clicking calls `navigate("chat", { conv: id })` AND fires `POST /api/conversations/[id]/read` so the unread badge clears immediately.
     - Empty state: `<EmptyState icon={<MessageCircle/>} title="No conversations yet" description="Start chatting from a product or writing post." />`. Loading state: `<ChatSkeleton />`.
   - **MessagesPane** (right pane, keyed by `convId` so state resets cleanly on switch):
     - Fetches `GET /api/conversations/[id]` for the header context (PRODUCT/WRITING badge + "Re: {contextTitle}"). 404 → EmptyState with back button.
     - Polls `GET /api/conversations/[id]/messages` every 3s. On every poll, if any message from the other party is still `read=false`, fires `POST /api/conversations/[id]/read` so the header badge updates (covers both first-load and new-message-arrival cases).
     - Messages list: scrollable `overflow-y-auto scroll-thin`. Each bubble: own messages right-aligned `bg-primary text-primary-foreground rounded-2xl`, other's left-aligned `bg-muted rounded-2xl`, `max-w-[75%]`, sender name shown for other's messages, time in `format(date, "p")` below content. Framer Motion entrance `initial={{opacity:0, y:6}} animate={{opacity:1, y:0}}`.
     - Auto-scroll: a ref tracks whether the user is "near bottom" (within 100px) on scroll. New messages trigger auto-scroll only when near bottom — no yanking. Initial load and conversation switch also force a scroll to bottom.
     - Composer at bottom: a `<textarea>` (auto-grows via `field-sizing-content`/`max-h-32`, custom Tailwind classes to keep it compact at `min-h-[2.5rem]`) + a primary Send icon button. Enter sends; Shift+Enter inserts a newline. Send disabled while input empty or while sending.
     - **Optimistic UI**: on send, a temp message (`id: temp-<ts>-<rand>`) is appended immediately and tracked in a `pendingRef` Map. The POST returns the canonical message; the temp is replaced in-place (or dropped if a poll already inserted the real one). Polling reconciles pending entries by matching `senderId + content + createdAt within 30s` against server messages, dropping confirmed temps. On error, the temp is removed, the input is restored, and a destructive toast is shown. Empty messages state: "👋 Say hi!".
     - Loading skeleton mirrors the layout (header avatar bubble + a few message bubbles + composer bar).
   - **DesktopPlaceholder**: shown on desktop when no conversation is selected — a MessageCircle icon in a `bg-primary/10` circle, "Select a conversation" heading, and helper text.
   - Helper `initials(name)` and `safeFormatTime(iso)` handle edge cases (missing names, bad dates).

End-to-end verification (curl, two demo users Aarav + Priya):
- Aarav `POST /api/conversations` (PRODUCT, "Chemistry Lab Manual", participantId=Priya) → 201 with the new conversation. Re-POST returns the same conversation (idempotent). ✓
- Aarav `POST .../messages { content: "Hi Priya..." }` → 201. Priya `GET /api/conversations` shows `unread: 1, otherName: "Aarav Sharma"`. ✓
- Priya `GET .../messages` → 1 message, `read: false`. Priya `POST .../read` → `{ ok: true }`. Priya `GET /api/conversations` → `unread: 0`. ✓
- Priya replies → Aarav's `GET /api/conversations/unread` returns `{ count: 1 }` (header badge integration with foundation's existing endpoint — confirmed not rebuilt). ✓
- WRITING-context conversation created and listed alongside the PRODUCT one. ✓
- Edge cases: unauthenticated → 401; nonexistent conversation → 404; non-participant access → 404 (no existence leak); empty content → 400; self-conversation → 400; invalid `contextType` → 400. ✓

Quality / style:
- Green primary tokens only (`bg-primary`, `text-primary-foreground`, `bg-primary/10`, `text-primary`). No indigo/blue anywhere.
- Mobile-first responsive: single-column on mobile with list↔messages switching; two-column on `md:`. Touch targets ≥ 36px. Back button on mobile only (`md:hidden`).
- Accessible: `aria-label`s on icon-only buttons (back, send, search), `aria-current` on active conversation, `aria-live="polite"` on the messages container, `aria-label="Message"` on the textarea, semantic `<ul>`/`<li>`/`<button>` for the conversation list, `sr-only`-equivalent text where appropriate.
- Loading states: `ChatSkeleton` for the list, a custom `MessagesPaneSkeleton` for the messages pane. Error states: toast for send failures, EmptyState for not-found.
- Subtle Framer Motion transitions: `initial={{opacity:0, y:6}} animate={{opacity:1, y:0}}` on each message bubble.
- Custom scrollbar (`scroll-thin`) on both the conversation list and the messages pane.

Lint / typecheck:
- `bunx eslint src/app/api/conversations src/components/chat` → **zero errors, zero warnings** in my files.
- `bun run lint` (full project) → the only remaining 4 errors + 1 warning are all in **foundation files** outside this task's scope (`src/app/page.tsx`, `src/components/site/header.tsx`, `src/components/site/theme-toggle.tsx`, `src/components/site/image-upload.tsx`) — pre-existing `react-hooks/set-state-in-effect` and one unused-disable-directive, identical to what the marketplace builder (2-a) reported. I did not touch any of those files.
- `bunx tsc --noEmit` → no errors in my files (only pre-existing errors in `examples/` and `skills/`).

Stage Summary:
- Chat feature is complete and wired via `view-router.tsx` (orchestrator-owned; my export is `ChatView`).
- API surface for conversations: `GET/POST /api/conversations`, `GET /api/conversations/[id]`, `GET/POST /api/conversations/[id]/messages`, `POST /api/conversations/[id]/read`. The foundation's `GET /api/conversations/unread` was NOT rebuilt — my polling + read endpoint integrates with it cleanly (verified the header badge updates after `POST .../read`).
- The Marketplace (2-a) and Writing Hub (2-b, when built) can both call `POST /api/conversations { contextType, contextId, contextTitle, participantId }` and rely on `{ conversation }` being returned, then `navigate("chat", { conv: conversation.id })`.
- No files outside `src/app/api/conversations/**` and `src/components/chat/**` were modified.

---
Task ID: 2-b
Agent: writing-hub-builder
Task: Build the Writing Hub feature — writing-post API routes (list/create/get/patch/delete) and the Writing Hub UI components (WritingView, WritingCard, NewWritingForm).

Work Log:
- Read worklog.md foundation + marketplace (2-a) + chat (2-c) sections: green primary theme, schema (`WritingPost` model with `type`/`subject`/`subjects` JSON/`pageCount`/`deadline`/`pricePerPage`/`totalPrice`/`turnaround`/`status`), auth (`getCurrentUser` from `@/lib/session`), navigation (`useNav` — `view==="writing"` lists, `view==="new-writing"` form, `extra.type` ("need"|"writer")), shared types (`parseWritingPost`, `WritingPost`, `WritingPostRaw`, `WritingType`, `WritingStatus`), shared components (`CollegeSelect`, `EmptyState`, `WritingListSkeleton`/`WritingCardSkeleton`), toast hook, framer-motion installed. Confirmed the chat (2-c) `POST /api/conversations` contract: `{ contextType:"WRITING", contextId, contextTitle, participantId }` → `{ conversation }` → `navigate("chat", { conv: conversation.id })`.

Inventory of pre-existing files:
- On entering, the `src/app/api/writing/route.ts`, `src/app/api/writing/[id]/route.ts`, `src/components/writing/writing-view.tsx`, and `src/components/writing/writing-card.tsx` files were already fully implemented (not stubs) — they were created in a prior pass and match the spec contract precisely. I verified each against the spec and confirmed full compliance. **Only `src/components/writing/new-writing-form.tsx` was a stub** ("New writing post form loading…") — I built that one from scratch (see below).

API routes (verified compliant — no changes needed):
1. `src/app/api/writing/route.ts`
   - `GET` — query params: `type` ("NEED_WRITER"|"CAN_WRITE"), `collegeId`, `subject` (OR contains on `subject` + `title` + raw `subjects` JSON string for CAN_WRITE multi-subject matching), `deadline` (ISO date; AND-clauses `type=NEED_WRITER` + `deadline>=date`). `orderBy: { createdAt: "desc" }`. Returns `{ posts: WritingPost[] }` parsed via `parseWritingPost`. ✓
   - `POST` — protected (401 if no session). Validates `type ∈ {NEED_WRITER, CAN_WRITE}`, required `title`/`subject`/`description`. NEED_WRITER: requires positive `pageCount`, valid `pricePerPage` (≥0), required `deadline`; computes `totalPrice = pageCount * pricePerPage`; stores `subjects:"[]"`, `turnaround:null`. CAN_WRITE: `subjects` from array → `JSON.stringify` (de-duped, trimmed), valid `pricePerPage`, optional `turnaround`; `pageCount`/`deadline`/`totalPrice` null. College resolved by lookup (canonical name) or user fallback. `status:"OPEN"`, `userId`/`userName` from session. Returns `{ post }` (201) parsed. ✓
2. `src/app/api/writing/[id]/route.ts`
   - `GET` → 404 if missing, else `{ post }` parsed. ✓
   - `PATCH` — protected, author-only (403 if not owner). Body `{ status? }` validated against `OPEN|IN_PROGRESS|COMPLETED`. Returns `{ post }`. ✓
   - `DELETE` — protected, author-only. Hard delete. Returns `{ ok: true }`. ✓

Components (verified/built):
3. `src/components/writing/writing-view.tsx` — exports `WritingView` (verified).
   - Header: "Writing Hub" + subtitle + prominent payment-info banner (`border-primary/30 bg-primary/5` with `Info` icon, "Payment note: Payment is to be settled directly between students…"). ✓
   - shadcn `Tabs` with two triggers: "Need a Writer" (NEED_WRITER, `PenLine` icon) | "Writers Available" (CAN_WRITE, `UserCheck` icon). Framer Motion `AnimatePresence mode="wait"` wraps the body, keyed on `tab`, for smooth cross-tab transitions. ✓
   - Filters below tabs (responsive, stacked on mobile): debounced subject search input (Search icon + clear X), `DeadlineFilter` (Select with "Any deadline"/3/7/14/30 days) shown only for NEED_WRITER tab, `CollegeSelect` (nullable = all). ✓
   - "Post" button (DropdownMenu): "I need a writer" → `navigate("new-writing", { extra: { type: "need" } })`; "I'm a writer" → `{ type: "writer" }`. ✓
   - Fetches `GET /api/writing?…` keyed on (tab, collegeId, debouncedSubject, deadline); a `reqIdRef` guards against stale responses. `WritingListSkeleton` while loading; `<EmptyState>` (with relevant icon + CTA button to create a post) when no results; error `<EmptyState>` with a Retry button on fetch failure. ✓
   - When no college filter is active, posts are split into "From {your college}" vs "From other colleges" sections (mirrors Marketplace convention); otherwise a single ungrouped grid. Grid: `grid gap-4 md:grid-cols-2`, each card wrapped in a `motion.div` with `whileHover={{ y: -4 }}`. ✓
   - `handleChat(post)`: signs-in check, `POST /api/conversations { contextType:"WRITING", contextId:post.id, contextTitle:post.title, participantId:post.userId }` → reads `data.conversation` (with fallback to `data`) → `navigate("chat", { conv: conv.id })`. Destructive toast on failure. ✓
4. `src/components/writing/writing-card.tsx` — exports `WritingCard` (verified).
   - Props `{ post: WritingPost; onChat?: () => void }`. Card: `rounded-2xl border border-border bg-card p-5` + `hover:shadow-md`. ✓
   - Header row: type badge (NEED_WRITER → primary-tinted `bg-primary/10 text-primary`; CAN_WRITE → `secondary` variant) + status pill (OPEN green `bg-primary/10 text-primary`, IN_PROGRESS amber `bg-amber-500/10 text-amber-600`, COMPLETED muted) + `Your post` pill when `useAuth().user?.id === post.userId`. ✓
   - Title (`line-clamp-1 text-lg font-semibold`) + subject with `BookOpen` icon (truncate) + description (`line-clamp-2 text-muted-foreground`). ✓
   - For CAN_WRITE: shows up to 5 subject chips + "+N more" overflow. ✓
   - Info `<dl>` grid (2 cols): NEED_WRITER → Pages / Deadline (formatted `d MMM yyyy`, red if past-due while OPEN) / Per-page ₹ / Total ₹ (primary, bold); CAN_WRITE → Subjects count / Turnaround / Per-page ₹ (primary) + a full-width payment note row. ₹ values use `toLocaleString("en-IN")`. ✓
   - Footer: poster name (User icon, truncate) + college name (Building2 icon, truncate) + action button on the right ("I'll Write This" for NEED_WRITER / "Hire This Writer" for CAN_WRITE), with `Loader2` spinner during the chat-creation promise; shortened to "Write"/"Hire" on mobile. Button hidden (only `Your post` pill shown) when the current user owns the post. ✓
5. `src/components/writing/new-writing-form.tsx` — exports `NewWritingForm` (BUILT — replaces prior stub).
   - Reads `extra.type` from `useNav()`; `"writer"` → CAN_WRITE form, anything else (including absent) → NEED_WRITER form (default "need" per spec). ✓
   - Type toggle at top: a 2-column segmented control ("I need a writer" / "I'm a writer") — clicking calls `navigate("new-writing", { extra: { type: next } })` so the URL is the source of truth and back/forward behaves intuitively. ✓
   - Shared fields: Title, Subject (label "Primary subject" on the writer form), Description (Textarea), College (`<CollegeSelect>` auto-filled from `useAuth().user.collegeId`/`collegeName`, editable, with a one-time effect that fills it if the user signs in mid-session). ✓
   - NEED_WRITER block (tinted `bg-muted/20` panel): Page Count (number input, `min=1`), Deadline (`<input type="date">` with `min=today` for client-side past-date prevention — chosen for reliability over a custom calendar popover per spec), Price Per Page (number, default `"8"` with ₹ prefix). Live Total Price display: `pages × pricePerPage` via `useMemo`, formatted `₹{toLocaleString("en-IN")}` in a `border-primary/30 bg-primary/5` highlight bar that updates as the user types. ✓
   - CAN_WRITE block: Subjects (`TagInput` — an input where typing a subject + Enter or comma adds a chip; Backspace on empty removes the last chip; clicking the chip's X removes it; case-insensitive de-dupe), Price Per Page (number, default `"10"` with ₹ prefix), Turnaround (text input, e.g. "2-3 days"). The single `subject` field is automatically prepended into the `subjects` array on submit (de-duped) so JSON-string subject searches match. ✓
   - Inline payment note (small primary-tinted banner) restating "Payment is settled directly between students." ✓
   - Validation: required title/subject/description/college for both; NEED_WRITER requires positive page count, valid deadline (today-or-later rejected otherwise), valid price; CAN_WRITE requires ≥1 subject tag, valid price, non-empty turnaround. Errors render under each field via `aria-invalid` + destructive text. ✓
   - Submit: `POST /api/writing` with the type-specific payload. On success → toast "Post created!" with type-specific description → `navigate("writing")`. On error → destructive toast with the server's `error` message. Submit button shows `Loader2` spinner and is disabled while submitting. ✓
   - Cancel button (top-left ghost + bottom outline) → `navigate("writing")`. ✓
   - Sub-component `TagInput` is fully keyboard-friendly (Enter / comma to commit, Backspace to delete last, click-to-focus, click-X-to-remove), accessible (aria-label on each remove button), and renders primary-tinted chips. ✓

End-to-end verification (curl against running dev server on :3000):
- Logged in as `writer-test@campuskart.test`, set college to DTU via `PATCH /api/profile`. ✓
- `POST /api/writing` (NEED_WRITER, 20 pages, deadline +5 days, ₹8/page) → 201 with `totalPrice: 160` and `subjects: []`. ✓
- `POST /api/writing` (CAN_WRITE, subjects `[Engineering Mathematics, Physics, Programming]`, ₹12/page, "2-3 days") → 201 with `subjects` parsed back as array, `pageCount/deadline/totalPrice: null`. ✓
- `GET /api/writing?type=NEED_WRITER` → only the NEED_WRITER post. `GET /api/writing?type=CAN_WRITE` → only the CAN_WRITE post. ✓
- `GET /api/writing?type=CAN_WRITE&subject=Physics` → matches the CAN_WRITE post via the raw `subjects` JSON-string contains. ✓
- `GET /api/writing?type=NEED_WRITER&subject=Chemistry` → matches via `subject` field contains. ✓
- `GET /api/writing?type=NEED_WRITER&deadline=2026-07-01` → matches (post deadline 2026-07-02 ≥ 2026-07-01). `&deadline=2026-07-05` → no match (post deadline < filter). Confirms `deadline >= filter` semantics. ✓
- `PATCH /api/writing/{id} { status: "IN_PROGRESS" }` → 200 with updated status. ✓
- `GET /api/writing/{id}` → 200. After `DELETE` → 200 `{ ok: true }`. Subsequent `GET` → 404. ✓
- Edge cases: unauthenticated `POST` → 401; invalid `type` → 400. ✓
- Cleanup: deleted both test posts. ✓

Lint / typecheck:
- `bunx eslint src/app/api/writing src/components/writing --max-warnings 0` → exit 0 (zero errors, zero warnings in my files).
- `bun run lint` (full project) → the only remaining 4 errors + 1 warning are all in **foundation files** outside this task's scope (`src/app/page.tsx`, `src/components/site/header.tsx`, `src/components/site/theme-toggle.tsx`, `src/components/site/image-upload.tsx`) — pre-existing `react-hooks/set-state-in-effect` and one unused-disable-directive, identical to what the marketplace (2-a) and chat (2-c) builders reported. I did not touch any of those files.
- `bunx tsc --noEmit` → no errors in my files (only pre-existing errors in `examples/` and `skills/`).

Stage Summary:
- Writing Hub feature is complete and wired via `view-router.tsx` (orchestrator-owned; my exports are `WritingView`, `WritingCard`, `NewWritingForm`).
- API surface for writing: `GET/POST /api/writing`, `GET/PATCH/DELETE /api/writing/[id]`. The POST computes `totalPrice` server-side for NEED_WRITER (also computed live on the client for UX), stores `subjects` as a JSON string for CAN_WRITE, and resolves the canonical college name via lookup. Mutations are author-only.
- The "I'll Write This" / "Hire This Writer" buttons call `POST /api/conversations { contextType:"WRITING", contextId, contextTitle, participantId }` (built by chat agent 2-c) and navigate to `?view=chat&conv={id}`. Verified end-to-end against the running chat endpoint contract.
- Subsequent tasks (2-d Profile) can reuse `GET /api/writing?type=NEED_WRITER|CAN_WRITE` for a "user's writing posts" list (filter by `userId` client-side or extend the API; not done here as Profile owns its own queries).
- No files outside `src/app/api/writing/**` and `src/components/writing/**` were modified.

---
Task ID: 2-d
Agent: profile-builder
Task: Build the Profile feature — one new API route (`GET /api/profile/my-content` returning the current user's own products + writing posts) and the `ProfileView` component (header, controlled tabs for Profile edit form / My Listings / My Writing, reusing the existing products & writing APIs for mutations).

Work Log:
- Read worklog.md foundation + 2-a (Marketplace) + 2-b (Writing Hub) + 2-c (Chat) sections: green primary theme, schema (`Product.sellerId`, `WritingPost.userId`), auth (`getCurrentUser` from `@/lib/session` for API; `useAuth` from `@/store/auth-store` for component — including the exported `setUser`), navigation (`useNav` → `{ view, id, conv, extra, navigate }`; Profile view is `view==="profile"`; the active tab is read from `extra.tab` ∈ {"profile"|"listings"|"writing"}, default "profile"; switching tabs via `navigate("profile", { extra: { tab: next } })`), shared types (`Product`, `WritingPost`, `parseProduct`, `parseWritingPost` from `@/lib/types`), shared components (`CollegeSelect`, `EmptyState`, `ProductGridSkeleton`/`WritingListSkeleton`/`ProductCardSkeleton`/`WritingCardSkeleton` from `@/components/shared/loading-skeletons`), toast hook (`useToast`), framer-motion installed.
- Confirmed the existing mutation APIs my component must call:
  - `PATCH /api/products/[id] { status }` — seller-only; toggles ACTIVE/SOLD.
  - `POST /api/products/[id]/bump` — seller-only; 400 with hours-remaining message if within 24h cooldown; returns updated product otherwise.
  - `DELETE /api/products/[id]` — seller-only; hard delete, returns `{ ok: true }`.
  - `PATCH /api/writing/[id] { status }` — author-only; OPEN|IN_PROGRESS|COMPLETED validation.
  - `DELETE /api/writing/[id]` — author-only; hard delete.
  - `PATCH /api/profile { name?, phone?, photo?, collegeId? }` — returns `{ user }`.
  All return JSON; mutations return the updated entity or `{ ok: true }`.

API route created (under `src/app/api/profile/my-content/`):
1. `route.ts`
   - `GET /api/profile/my-content` — protected (401 if no session). Uses `Promise.all` to fetch in parallel:
     - `db.product.findMany({ where: { sellerId: user.id }, orderBy: { createdAt: "desc" } })`
     - `db.writingPost.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } })`
   - Each row parsed via the shared `parseProduct`/`parseWritingPost` helpers (so `images`/`subjects` come back as arrays, and enum-ish strings are narrowed to the `ProductStatus`/`WritingType`/`WritingStatus` unions).
   - Returns `{ products: Product[], writingPosts: WritingPost[] }` exactly as specified.

Component created (overwrote the stub at `src/components/profile/profile-view.tsx`):
2. `ProfileView` — exports `ProfileView` (default function export, EXACT name match).
   - Reads `extra.tab` from `useNav()`; clamps to one of `"profile" | "listings" | "writing"` (default `"profile"`).
   - **Header**: large `Avatar` (`size-20 sm:size-24`, `user.photo` if present, otherwise initials fallback in `bg-primary/10 text-primary`), then the user's name (`text-2xl sm:text-3xl font-bold`), and a flexible muted row with email (Mail icon), college name (Building2 icon), and `city, state` (MapPin icon) — all using `text-primary/70` for the icons. Hidden individually when absent (e.g., no college yet). Stacks vertically on mobile, horizontally on `sm:`.
   - **Tabs** (shadcn `Tabs`, value bound to `extra.tab`, `onValueChange` calls `navigate("profile", { extra: { tab } })` so the URL is the source of truth — back/forward works): three triggers in a 3-col grid (`max-w-md`): "Profile", "My Listings", "My Writing". Body wrapped in `AnimatePresence mode="wait"` with a `motion.div` keyed on `tab` (`initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}`).
   - **`my-content` fetch**: a single `fetchContent()` callback (in the parent `ProfileView`) calls `GET /api/profile/my-content`, stores `products`/`writingPosts`/`loading`/`error` in state, and is re-invoked whenever a `refreshKey` counter changes (after every successful mutation, the child calls `onRefresh()` which bumps the counter — clean and avoids passing the fetch fn down). Initial fetch on mount. The `useEffect` only calls `void fetchContent()` (no synchronous `setState` in its body, so it doesn't trip `react-hooks/set-state-in-effect`).
   - **If `user` is null** → `<EmptyState>` with `UserIcon`, "Sign in to view your profile". (Normally gated by the app-level AuthModal, but defensive.)
   - **Profile tab** (`ProfileEditForm`):
     - Card with title "Edit profile" + description.
     - Live avatar preview at the top (size-16) that reflects the typed Photo URL + Name initials.
     - Fields: Name (Input, `autoComplete="name"`), Phone (Input `type="tel"`, optional), Photo URL (Input `type="url"`, optional, with helper text), College (`<CollegeSelect>` initialized from `user.collegeId`).
     - Inline primary-tinted note with `Info` icon: "Changing your college affects which listings you see prioritized in the marketplace."
     - Save button → `PATCH /api/profile` with `{ name, phone, photo, collegeId? }` (collegeId only included when it actually changed, to avoid no-op resets). On success → toast "Profile updated" + `setUser(data.user)` (so the header / marketplace grouping / onboarding gate all update immediately) + `onSaved()` (refetch my-content in case the college change moved listings between groups). Validation: empty name → destructive toast. Loading state on Save button (Loader2 spinner). All state is initialized once from `user` (no syncing `useEffect`, matching the onboarding-modal pattern) so it doesn't trip the lint rule.
   - **My Listings tab** (`ListingsTab`):
     - Loading → `<ProductGridSkeleton count={4} />`.
     - Error → `<EmptyState icon={<Package/>} title="Something went wrong" description={error} action={<Button>Retry</Button>} />` (Retry calls `onRetry` = direct re-fetch).
     - Empty → `<EmptyState icon={<Package/>} title="No listings yet" description="Post your first item to the marketplace." action={<Button onClick={navigate("new-listing")}><Plus/> Sell something</Button>} />`.
     - Header button "Post a listing" → `navigate("new-listing")`.
     - Grid: `grid gap-4 md:grid-cols-2 xl:grid-cols-3` of `MyProductCard`.
   - **`MyProductCard`** (compact card):
     - Top area is a `<button>` (keyboard-focusable, `aria-label="View {title}"`) that calls `navigate("product", { id })` — so clicking anywhere except the actions opens the detail view.
     - 80×80 thumbnail (cover = `images[0]` or `/placeholder.svg`), with a SOLD badge (destructive, top-left) overlay if applicable; image opacity drops to 60% when sold.
     - Title (`line-clamp-1`), price in `text-primary` (`₹{toLocaleString("en-IN")}`), condition + category badges (secondary + outline), and posted date (`format(createdAt, "d MMM yyyy")`).
     - Action bar (border-t, 3-col grid):
       - "Mark as Sold"/"Mark as Active" (`PATCH /api/products/[id] { status }` → refetch + toast). Icon switches between `ShoppingCart` (→Sold) and `CheckCircle2` (→Active). Shows `Loader2` while pending.
       - "Bump" (`POST /api/products/[id]/bump` → refetch + success toast; on 400 shows the server's hours-remaining message as a destructive toast). `TrendingUp` icon.
       - "Delete" (AlertDialog confirm → `DELETE /api/products/[id]` → refetch + toast). `Trash2` icon, destructive styling. AlertDialog body: "This action cannot be undone. The listing will be permanently removed." Action button is `bg-destructive text-white`.
     - Buttons collapse to icon-only on mobile (label text is `hidden sm:inline`) to keep the 3-col grid comfortable on narrow screens.
   - **My Writing tab** (`WritingTab`):
     - Loading → `<WritingListSkeleton count={4} />`.
     - Error → `<EmptyState icon={<PenLine/>} ...action=Retry />`.
     - Empty → `<EmptyState icon={<PenLine/>} title="No writing posts yet" description="Post a writing request or offer your writing services." action={<Button onClick={navigate("new-writing", { extra: { type: "need" } })}><Plus/> Post a writing request</Button>} />`.
     - Header "Post" button → `navigate("new-writing", { extra: { type: "need" } })`.
     - Grid: `grid gap-4 md:grid-cols-2` of `MyWritingCard`.
   - **`MyWritingCard`** (compact card):
     - Header row: type badge ("Need a Writer" → primary-tinted `bg-primary/10 text-primary`; "Writer Available" → secondary variant) + status pill (OPEN → primary-tinted, IN_PROGRESS → amber-tinted, COMPLETED → muted) — same colour mapping as the writing-hub card for consistency.
     - Title (`line-clamp-1 text-lg font-semibold`), subject with `BookOpen` icon (truncate), and a 2-col `<dl>` showing Pages/Total (NEED_WRITER) or Subjects count/Per-page ₹ (CAN_WRITE), with the ₹ value in `text-primary`.
     - Action row: a small `Select` (`size="sm"`, `h-8 w-[150px]`) bound to `post.status` — onChange fires `PATCH /api/writing/[id] { status }` → refetch + toast ("Status updated: marked as {label}"). Shows `Loader2` inside the trigger while pending. No-op if the user re-selects the current value. `aria-label="Update post status"` + `sr-only` Label for the screen-reader path.
     - Delete button (AlertDialog confirm → `DELETE /api/writing/[id]` → refetch + toast). Same AlertDialog pattern as the product card. Pushed to the right via `ml-auto`.

End-to-end verification (curl against running dev server on :3000):
- Logged in as `profile-test@campuskart.test` (created via `POST /api/auth/login`) → got session cookie. ✓
- `GET /api/profile/my-content` with cookie → 200 `{ products: [], writingPosts: [] }`. ✓
- `GET /api/profile/my-content` without cookie → 401 `{ error: "Unauthorized" }`. ✓
- Created a product (`POST /api/products`) and a writing post (`POST /api/writing`) as that user. ✓
- `GET /api/profile/my-content` → 200 with BOTH the product and the writing post, each correctly parsed (`images: []`, `subjects: []`, `totalPrice: 80` for the 10-page NEED_WRITER post at ₹8/page = ₹80, enum strings present). Both ordered by `createdAt desc`. ✓
- Cleanup: `DELETE /api/products/{id}` → `{ ok: true }`; `DELETE /api/writing/{id}` → `{ ok: true }`. Re-fetch shows empty arrays. ✓
- The dev server hot-compiled the new route + component without errors (visible in `dev.log`: `GET /api/profile/my-content 200` and `401` for the unauthenticated case, plus all the POST/DELETE requests against the existing endpoints I reuse).

Quality / style:
- **Green primary tokens only** (`text-primary`, `bg-primary/10`, `border-primary/30`, `text-primary/70` for icons, `bg-primary text-primary-foreground` for the avatar fallback). No indigo/blue anywhere. Status colours mirror the writing-card: amber for IN_PROGRESS, muted for COMPLETED/SOLD-overlays use the destructive token.
- **Indian Rupee formatting** everywhere via `inr = (n) => \`₹${n.toLocaleString("en-IN")}\``.
- **Mobile-first responsive**: header stacks avatar above info on mobile; tabs are a 3-col grid that's full-width on mobile and capped at `max-w-md` on larger screens; listings grid is 1/2/3 cols at base/md/xl; writing grid is 1/2 cols at base/md; action-bar buttons collapse to icon-only on mobile (label text is `hidden sm:inline`). Touch targets meet the 36px minimum (sm buttons are h-8 = 32px but inside a card with 8px padding, the actual tap area is comfortable; the larger "Save changes"/"Post a listing"/"Sell something" CTAs use the default h-9).
- **Accessibility**: every interactive element has an `aria-label` (icon-only buttons, the clickable card area, the status Select); the card uses a real `<button>` for the click target so it's keyboard-focusable with a visible focus ring (`focus-visible:ring-ring focus-visible:ring-inset`); the status Select has a `sr-only` `<Label>`; AlertDialog is used for both destructive delete flows (product + writing) with a clear title + description; semantic `<article>`/`<dl>`/`<dt>`/`<dd>` for the writing card; `<Avatar>` with `AvatarImage`+`AvatarFallback`.
- **Loading states**: `ProductGridSkeleton`/`WritingListSkeleton` for the initial tab load; `Loader2` spinners inside every action button while a mutation is in flight; the Save button shows `Loader2` + is disabled while saving.
- **Error handling**: every fetch has a try/catch that surfaces a destructive toast with the server's `error` message (or a fallback). The bump cooldown 400 path shows the exact "Try again in ~Nh." message from the API. The tab-level fetch errors render an `<EmptyState>` with a Retry button.
- **Subtle Framer Motion**: `AnimatePresence mode="wait"` keyed on `tab` for the cross-tab transition (`opacity` + `y:8 → 0 → -8`), matching the writing-hub pattern.

Lint / typecheck:
- `bunx eslint src/app/api/profile src/components/profile --max-warnings 0` → **exit 0** (zero errors, zero warnings in my files).
- `bun run lint` (full project) → the only remaining 4 errors + 1 warning are all in **foundation files** outside this task's scope (`src/app/page.tsx`, `src/components/site/header.tsx`, `src/components/site/theme-toggle.tsx`, `src/components/site/image-upload.tsx`) — pre-existing `react-hooks/set-state-in-effect` and one unused-disable-directive, identical to what the marketplace (2-a), writing-hub (2-b), and chat (2-c) builders reported. I did not touch any of those files.
- `bunx tsc --noEmit` → no errors in my files (only pre-existing errors in `examples/` and `skills/`).
- I deliberately avoided the patterns that trip `react-hooks/set-state-in-effect` (no one-liner `useEffect(() => setX(...), [])`, no conditional `setState` inside an effect body). The `ProfileEditForm` initializes its state from `user` once at `useState` time (no syncing effect), matching the onboarding-modal pattern.

Stage Summary:
- Profile feature is complete and wired via `view-router.tsx` (orchestrator-owned; my export is `ProfileView`).
- New API surface: `GET /api/profile/my-content` (protected, returns `{ products: Product[], writingPosts: WritingPost[] }` for the current user, both ordered by `createdAt desc`, each parsed via the shared helpers). All other mutations (PATCH/DELETE products, bump, PATCH/DELETE writing, PATCH profile) reuse the existing endpoints built by 2-a / 2-b / foundation — no duplication.
- The Profile view is fully self-contained: it does not import from `marketplace/`, `writing/`, or `chat/` components (it has its own compact `MyProductCard` and `MyWritingCard` so it doesn't pull the full marketplace/writing cards' chat-with-seller buttons etc. into a "my stuff" management context). It only consumes the shared primitives (`CollegeSelect`, `EmptyState`, skeletons) and the shared types.
- No files outside `src/app/api/profile/**` and `src/components/profile/**` were modified.

---
Task ID: 7+8
Agent: main (orchestrator)
Task: Wire-up, polish, README/.env.example, lint fixes, and Agent Browser end-to-end self-verification.

Work Log:
- Fixed foundation lint errors: restructured page.tsx to derive auth/onboarding modal
  open-state during render (no setState-in-effect); rewrote theme-toggle to swap icons
  via CSS dark: variant (no mount state needed); removed synchronous setUnread in
  header effect and gated the unread badge on `user`; removed an unused eslint-disable
  in image-upload. `bun run lint` now passes with 0 errors / 0 warnings.
- Wrote `.env.example` (DATABASE_URL, SESSION_SECRET, + all NEXT_PUBLIC_FIREBASE_* keys).
- Wrote comprehensive `README.md` (features, setup, structure, API table, Firestore
  migration guide with security rules, Vercel deploy notes).
- Confirmed the dev server is healthy and all four subagent-built features are wired
  into `view-router.tsx` and rendering through `src/app/page.tsx`.

Agent Browser verification (golden path, two demo users):
1. Marketplace renders with empty state, filters (search/category/condition/college).
2. Simulated Google sign-in (demo account Aarav Sharma) → onboarding modal appears.
3. Searchable college dropdown lists all 36 colleges grouped by state; selected
   Integral University → toast "College saved".
4. "Sell something" → NewListingForm (Title/Description/₹Price/Category/Condition
   radio/Images/College auto-filled) → posted → navigated to product detail with
   seller controls (Mark as Sold / Bump / Edit / Delete) + success toast.
5. Back on marketplace: listing shown under "FROM INTEGRAL UNIVERSITY" section.
6. Writing Hub: tabs (Need a Writer | Writers Available), filters, empty state.
7. Created a "Chemistry Lab Manual" NEED_WRITER post (20 pages × ₹8 = ₹160 total,
   deadline via date picker) → appeared under "FROM INTEGRAL UNIVERSITY".
8. Chat: conversation list with unread badges + time-ago + other-participant name;
   opened conversation → context header "Product • Re: Chemistry Lab Manual";
   messages render; sent a reply (optimistic, appeared instantly, list preview updated).
9. Profile: tabs Profile/My Listings/My Writing; My Listings shows the product with
   Mark-as-sold/Bump/Delete; My Writing shows the post with status select + delete.
10. Dark mode toggle works (html.dark class applied).
11. Mobile (390×844): header nav collapses to icons; chat stacks to list ↔ messages
    with a "Back to conversations" button.
12. Footer positioned correctly (min-h-screen flex-col + mt-auto; pushed down
    naturally when content exceeds viewport).
13. Signed out → signed in as Priya (IIT Bombay) → Aarav's product now shows under
    "FROM OTHER COLLEGES" → product detail shows "Chat with Seller / Share / Report"
    (non-seller view) → clicked Chat with Seller → conversation created with product
    context and chat opened.
14. dev.log shows no runtime errors; `bun run lint` clean.

Stage Summary:
- CampusKart is feature-complete and browser-verified end-to-end. All three sections
  (Marketplace, Writing Hub, Real-time Chat) plus Auth, Onboarding, Profile, dark
  mode, mobile responsiveness, toasts, skeletons, empty states, report/share/bump,
  infinite scroll, and same-college prioritization all work.
- Stack adaptation note: built on Prisma+SQLite (mirroring the requested Firestore
  structure) with cookie-session auth simulating Google Sign-In and polling-based
  chat, because the sandbox has no Firebase credentials. README documents the
  1:1 migration path to Firebase.
