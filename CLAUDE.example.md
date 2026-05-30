# CLAUDE.md — KilobaRealty

## Dự án

**KilobaRealty** — Hệ thống quản lý xuyên suốt quy trình kinh doanh BĐS cho Công ty CP Tài chính và Bất động sản NobleX.

## Monorepo Structure

```
├── apps/web/           → Next.js 15, TypeScript, admin dashboard (:33000)
├── apps/portal/        → Next.js 15, TypeScript, sales portal public-facing (:33001)
├── apps/mobile/        → Flutter 3.41, Sales App (Riverpod 3 + GoRouter + Dio)
├── services/api/       → Golang 1.23+, modular monolith (:33080)
│   ├── cmd/server/     → Entry point
│   ├── internal/       → Business modules: auth, inventory, sales, crm, transaction, commission, chat, report
│   ├── pkg/            → Shared utilities
│   └── migrations/     → PostgreSQL migration files (SQL)
├── packages/shared/    → TypeScript enums, types, constants (dùng chung web/portal/mobile)
├── packages/ui/        → Shared React UI components
└── docs/               → Technical docs + database schema
```

## Tech Stack

- **Backend**: Golang (pure Go, NO CGO, NO C, NO GCC)
- **Web/Portal**: Next.js 15 + TypeScript + Tailwind CSS
- **Mobile**: Flutter 3.41 + Riverpod 3 + GoRouter + Dio
- **Database**: PostgreSQL 17
- **Auth**: Zitadel (OAuth/OIDC — Gmail login, SSO)
- **File storage**: MinIO (S3-compatible)
- **Cache/PubSub**: Redis
- **Realtime**: WebSocket (coder/websocket — pure Go)
- **Push**: Firebase FCM
- **API Docs**: Swagger/OpenAPI (swaggo/swag + http-swagger)
- **Monorepo**: Turborepo (JS/TS) + pnpm workspaces + Makefile (Go)

## Commands

```bash
# JS/TS
pnpm install              # Install dependencies
pnpm dev                  # Start web + portal dev servers
pnpm build                # Build all JS apps
pnpm lint                 # Lint all JS apps

# Go API
make api-dev              # Run API server (dev)
make api-build            # Build binary → bin/api-server
make api-test             # Run tests with race detection
make api-lint             # golangci-lint
make api-swagger          # Regenerate Swagger docs (swag init)

# Database
make migrate-up           # Apply migrations
make migrate-down         # Rollback
make migrate-create       # Create new migration (interactive)

# Full stack
make dev                  # Start everything
make build                # Build everything

# Mobile — Run by flavor
cd apps/mobile
flutter run --flavor dev -t lib/main_dev.dart       # Dev (localhost, standalone auth)
flutter run --flavor uat -t lib/main_uat.dart       # UAT (zitadel auth)
flutter run --flavor prod -t lib/main_prod.dart     # Prod (api.kiloba.ai, zitadel)
flutter build apk --flavor prod -t lib/main_prod.dart   # Build APK prod
flutter build ios --flavor prod -t lib/main_prod.dart   # Build iOS prod

# Mobile — App Icon, Splash, Store Listing
cd apps/mobile
python3 scripts/generate_icon.py            # Regenerate app icon (all sizes)
python3 scripts/generate_splash.py          # Regenerate splash screen (all sizes)
python3 scripts/generate_store_listing.py   # Generate store screenshots + descriptions từ ảnh có sẵn
python3 scripts/generate_store_listing.py --capture -d <device_id>  # Chụp ảnh mới + generate

# Mobile — Integration Test Screenshots
cd apps/mobile
flutter test integration_test/screenshot_test.dart -d <device_id>   # Chụp screenshots UI → apps/web/public/images/showcase/
```

## Ports

| Service | Dev Port | URL (Cloudflare Tunnel) |
|---------|----------|------------------------|
| Web (admin) | 33000 | https://dev-kilobarealty.xdigi.cloud |
| Portal (public) | 33001 | https://dev-kilobarealty-portal.xdigi.cloud |
| API (Go) | 33080 | — |

## Database Schema

16 modules, 59 tables — docs tại `docs/schema/`:

| Module | Tables | File |
|--------|--------|------|
| COMMON | administrative_units, audit_logs | `docs/schema/01-common.md` |
| AUTH | users, roles, permissions, role_permissions | `docs/schema/02-auth.md` |
| ORG | departments, employees, employee_assignments | `docs/schema/03-org.md` |
| INVENTORY | projects, project_zones, product_layouts, products, product_price_versions, import_logs, import_log_details, project_files | `docs/schema/04-inventory.md` |
| CRM | customers, leads, interactions, customer_products | `docs/schema/05-crm.md` |
| TRANSACTION | bookings, deposits, contracts, payments, transaction_discounts, transaction_files | `docs/schema/06-transaction.md` |
| COMMISSION | commission_policies, commission_accruals, commission_payouts, salary_configs, allowance_configs, payroll_records | `docs/schema/07-commission.md` |
| CHAT | chat_rooms, chat_room_members, chat_messages, notifications | `docs/schema/08-chat.md` |
| PORTAL | sale_profiles, portal_analytics | `docs/schema/09-portal.md` |
| PARTNERS | partners, partner_groups, partner_group_members, partner_contracts, product_allocations | `docs/schema/11-partners.md` |
| MORTGAGE & LEGAL | mortgages, mortgage_products, mortgage_documents, product_legal_records, legal_documents | `docs/schema/12-mortgage-legal.md` |
| SALE CONFIG | sale_types, sale_type_pipelines, sale_type_configs | `docs/schema/13-sale-config.md` |
| ALLOCATION | sale_rounds, sale_round_partners, sale_round_products, allocation_baskets, allocation_batches | `docs/schema/15-allocation.md` |
| DIPLOMATIC LOCK | diplomatic_locks | `docs/schema/16-diplomatic-lock.md` |
| DOCS | doc_categories, doc_documents, doc_attachments, doc_views | `docs/schema/20-docs.md` |
| EMAIL | email_templates, email_logs (partitioned) | `migrations/init/24-email.sql` |

DBA review: `docs/schema/10-dba-review.md`
Changelog: `docs/schema/CHANGELOG.md`

## Development Principles (Karpathy-inspired)

> Nguồn: [Andrej Karpathy's observations on LLM coding pitfalls](https://x.com/karpathy/status/2015883857489522876). Bias toward caution over speed — for trivial tasks, use judgment.

### 1. Think Before Coding
- **Nêu rõ assumptions** trước khi implement. Nếu không chắc chắn — hỏi, đừng đoán
- Nếu có nhiều cách hiểu yêu cầu — trình bày các lựa chọn, không pick silently
- Nếu có cách đơn giản hơn — đề xuất. Push back khi cần thiết
- Nếu thấy mơ hồ — dừng lại, nêu rõ điều gì chưa rõ, hỏi

### 2. Simplicity First
- Không thêm feature ngoài yêu cầu. Không abstraction cho code dùng 1 lần
- Không thêm "flexibility" hoặc "configurability" chưa được yêu cầu
- Không xử lý error cho kịch bản không thể xảy ra
- Nếu 200 dòng có thể viết trong 50 dòng → viết lại
- **Kiểm tra**: Senior engineer có nói code này overcomplicated không? Nếu có → simplify

### 3. Surgical Changes
- **Chỉ sửa đúng cái cần sửa**. Không "improve" code, comments, formatting lân cận
- Không refactor thứ chưa hỏng. Match existing style dù bạn muốn viết khác
- Nếu thấy dead code không liên quan — mention, đừng xoá
- Khi thay đổi tạo orphan imports/vars → xoá. Nhưng KHÔNG xoá dead code có sẵn trừ khi được yêu cầu
- **Kiểm tra**: Mỗi dòng thay đổi phải trace trực tiếp về yêu cầu của user

### 4. Goal-Driven Execution
- Biến yêu cầu mơ hồ thành mục tiêu kiểm chứng được:
  - "Thêm validation" → "Viết test cho invalid input, rồi làm pass"
  - "Fix bug" → "Viết test reproduce bug, rồi fix cho pass"
  - "Refactor X" → "Đảm bảo test pass trước và sau refactor"
- Cho multi-step tasks, nêu plan ngắn gọn:
  ```
  1. [Bước] → verify: [kiểm tra]
  2. [Bước] → verify: [kiểm tra]
  ```
- Success criteria rõ ràng → có thể loop độc lập. Criteria mơ hồ → cần clarification liên tục

## Coding Conventions

### Chung (tất cả apps)
- **Tiếng Việt có dấu**: Mọi chuỗi hiển thị cho người dùng (UI text, placeholder, thông báo lỗi, toast, dialog) PHẢI dùng tiếng Việt có dấu đầy đủ. KHÔNG dùng tiếng Việt không dấu (ví dụ: "Mất kết nối" chứ KHÔNG phải "Mat ket noi"). Log messages (chỉ developer đọc) có thể dùng tiếng Anh.

### Golang (services/api/)
- Pure Go only — **NO CGO, NO C, NO GCC**
- Standard project layout: `cmd/`, `internal/`, `pkg/`
- Mỗi module trong `internal/` có boundary rõ ràng, giao tiếp qua interface
- Error handling: wrap errors với context (`fmt.Errorf("action: %w", err)`)
- Logging: structured logging (slog)
- Testing: table-driven tests, `_test.go` cùng package
- **Swagger**: Mọi handler function PHẢI có swaggo annotation (`@Summary`, `@Description`, `@Tags`, `@Router`, ...). Docs viết bằng **tiếng Anh**. Khi thêm/sửa handler → thêm/sửa annotation → chạy `make api-swagger` để regenerate. Swagger UI: `http://localhost:33080/swagger/index.html`. Generated files tại `services/api/docs/` (committed, không gitignore)
- **Data scope per-partner**: Admin bị partner-scope (isolation per đại lý), CHỈ `SUPER_ADMIN` bypass filter. Pattern: `isSuperAdmin(scope)` helper, list params có field `PartnerID uuid.UUID // server-set`, service method **overwrite** params.PartnerID/EmployeeID từ `scope` cho non-super_admin (không trust client query param). Mutation gate dùng `verifyEmployeeBelongsToPartner` / `verifyProjectBelongsToPartner` — load row trước, check `partner_id` match scope trước khi UPDATE. Project ownership resolve qua `prtn_contracts` active grants (projects không có `partner_id` trực tiếp)
- **State machine ở SQL**: Mọi state transition là `UPDATE tx_... SET status='X' WHERE id = ? AND status IN (<valid sources>)`. Zero rows affected → trả sentinel `ErrInvalidTransition` (HTTP 409). Giữ SQL atomic — không có TOCTOU window. Pattern dùng chung ở transaction + commission + kpi modules
- **List endpoint envelope**: Dùng `PaginatedResult[T]{Data, Total, Limit, Offset}` cho mọi list có thể phân trang. Chỉ return bare array `[]T` khi dataset nhỏ cố định (vd config templates). Khi đã chọn envelope nào, FE hook PHẢI match — mismatch là class bug khó debug (response có data nhưng UI rỗng)
- **Cross-module hooks via interface**: Khi module A cần trigger side-effect ở module B (vd transaction `CompleteContract` → commission `CreateAccrual`), define interface trong module A (nil-safe), `SetXxxHook(impl)` từ `cmd/server/main.go`, adapter implementation sống trong main.go — KHÔNG import module B trong module A (tránh cycle)
- **Effective-dated config pattern**: Configs thay đổi theo thời gian (salary, allowance, point value, commission rate) → insert row mới với `effective_from`, auto-close row cũ bằng `UPDATE ... SET effective_to = new.effective_from - INTERVAL '1 day' WHERE (effective_to IS NULL OR effective_to >= new.effective_from) AND effective_from < new.effective_from` trong cùng transaction. KHÔNG UPDATE giá trị row cũ — giữ nguyên lịch sử cho audit
- **Idempotent generate pattern**: Methods dạng `GeneratePayroll / GenerateXxx` recompute từ source nhưng **preserve manual fields** (deductions do kế toán nhập). Dùng `ON CONFLICT (a, b) DO UPDATE SET ... WHERE status = 'DRAFT'` — CONFLICT hit nhưng WHERE filter → `RETURNING` trả no rows → trả `ErrInvalidTransition` cho row đã locked
- **Proof-required gate**: State transitions cần external evidence (confirm payment cần chứng từ) → pre-check service layer `HasProofFile()` trước UPDATE, trả sentinel riêng (vd `ErrProofRequired` → 400). FE disable action button sớm bằng cách gọi list files hook + `hasProof = files.some(f => category in VALID_SET)`, hiển thị tooltip khi disabled
- **Email module** (`internal/email/`): SMTP qua `go-mail`, template engine dùng stdlib `html/template`. Pattern fire-and-forget giống notification (goroutine detached context). Noop client khi `EMAIL_ENABLED=false`. Templates lưu DB (`email_templates`), render bằng `{{.Variable}}`. Logs ghi vào `email_logs` (partitioned). Queue processing qua scheduler (`ClaimPendingEmails` với `FOR UPDATE SKIP LOCKED`, multi-instance safe). 11 template codes: `BOOKING_CONFIRM`, `PAYMENT_REMINDER`, `DEPOSIT_CONFIRM`, `CONTRACT_SIGNED`, `LEAD_ASSIGNED`, `WELCOME_CUSTOMER`, `PAYMENT_CONFIRMED`, `ACCOUNT_WELCOME`, `EMPLOYEE_APPROVED`, `PASSWORD_RESET`, `PASSWORD_CHANGED`. HTML templates tại `migrations/seed/email_templates/`. Cross-module: dùng `email.EmailSender` interface. MCP tools: `send_email`, `send_email_batch`. Permissions: `email.view`, `email.send`, `email.manage`
- **Scheduler** (`internal/scheduler/`): Centralized cron job runner dùng gocron v2 + `pkg/dlock` (Redis distributed lock). Mỗi job chỉ chạy trên 1 instance, execution log ghi vào `job_executions` (partitioned). Cron expressions cấu hình qua env (`SCHEDULER_*`). Khi thêm job mới → register trong `cmd/server/main.go`, thêm env var vào `SchedulerConfig`
- **Environment variables**: Khi thêm biến env mới, PHẢI cập nhật **tất cả** các nơi sau: (1) `internal/config/config.go` — struct + Load(), (2) `services/api/.env` — giá trị dev, (3) `services/api/.env.example` — giá trị mẫu + comment, (4) `infra-uat/docker-compose.yml` — environment section của container tương ứng, (5) `infra-uat/.env` — giá trị UAT, (6) `infra-uat/.env.example` — giá trị mẫu. Thiếu bất kỳ nơi nào sẽ gây lỗi khi deploy

### TypeScript (apps/, packages/)
- Strict mode (`"strict": true`)
- Path alias: `@/*` → `./src/*`
- Shared types import từ `@kilobarealty/shared`
- UI components import từ `@kilobarealty/ui`

### Frontend Components & Patterns

> **⚠ BẮT BUỘC — Select với value không human-readable (UUID, code, enum):**
> MỌI `<Select>` có `value` là UUID, ID, hoặc code PHẢI có `items` prop trên Select root (`Record<string, string>` map value→label). Không có `items` → `SelectValue` hiển thị raw UUID/code thay vì tên.
>
> ```tsx
> // ✅ ĐÚNG — items prop cho phép SelectValue resolve label
> <Select value={projectId || null} items={Object.fromEntries(projects.map(p => [p.id, p.name]))} onValueChange={setProjectId}>
>
> // ❌ SAI — SelectValue sẽ hiện UUID vì không có items
> <Select value={projectId} onValueChange={setProjectId}>
> ```
>
> Checklist trước khi viết `<Select>`:
> 1. `value` có phải UUID/ID/code? → Thêm `items` prop
> 2. Có option "Tất cả"? → Include trong `items`: `{ all: "Tất cả dự án", ...}`
> 3. Placeholder cần hiện khi chưa chọn? → `value={stateValue || null}`

- **Dialog** cho forms (KHÔNG dùng Drawer). `DialogContent` là scroll container: `max-h-[calc(100dvh-4rem)] overflow-y-auto p-4` — KHÔNG wrap thêm scroll div bên trong. `DialogFooter` sticky ở đáy bằng `-mx-4 -mb-4 border-t bg-muted/50 p-4`, thoát padding content để flush với mép dialog. Pattern: `<DialogContent><DialogHeader/>{body — có thể dài, sẽ tự scroll}<DialogFooter>{actions}</DialogFooter></DialogContent>`
- **Confirm/Alert — KHÔNG dùng `window.confirm()` / `window.alert()`**. Dùng `useConfirm()` từ `@/components/confirm-dialog` trả về `Promise<boolean>` (Provider đã mount ở `AppShell`). Callback cần `async () => { const ok = await askConfirm({title, description, confirmText, variant}); if (!ok) return; ... }`. Variants: `success` (duyệt, xác nhận), `warning` (hành động irreversible như lock), `destructive` (xoá), `default` (còn lại). Error/info toast dùng `toast.error/success/info` từ `sonner` — KHÔNG dùng `window.alert` cho lỗi. Nếu component đã có biến `confirm` (vd `useConfirmPayment`), import hook dưới tên `askConfirm` để tránh shadowing
- **PaginationBar** (`components/pagination.tsx`): Component phân trang dùng chung, 1-based page. Props: `page`, `total`, `pageSize`, `onPageChange`, `itemLabel`. Desktop 7 buttons + range text, mobile 5 buttons + "Trang x/y". Tự ẩn khi ≤1 page
- **Pagination luôn server-side, 1-based**: Mọi list endpoint PHẢI nhận `limit` + `offset` và trả `{data, total, limit, offset}` envelope. FE: `const [page, setPage] = useState(1); offset = (page-1) * PAGE_SIZE;` + `<PaginationBar page={page} total={data.total} pageSize={PAGE_SIZE} onPageChange={setPage}/>`. KHÔNG dùng `limit` không kèm offset state + PaginationBar — cap hidden + data bị mất khi >limit rows
- **List endpoint envelope consistency**: Khi FE hook khai báo response type, phải match chính xác backend shape. Backend `httputil.WriteJSON(w, files)` trả **bare array** (không envelope), nhưng FE `api.get<{data: T[]}>` sẽ đọc `data?.data === undefined` → list luôn rỗng dù backend trả data. Default rule: mọi list endpoint MỚI trả `PaginatedResult[T]` envelope; chỉ dùng bare array khi dataset nhỏ cố định (vd config templates). Khi có mismatch với endpoint cũ, normalize trong hook (`return { data: list ?? [] }`) thay vì sửa tất cả consumer
- **TanStack Table**: Desktop table + mobile card view. Server-side pagination `PAGE_SIZE=20`
- **Filter bar layout**: Mobile 3 rows (search → filter full-width → group), desktop 1 row
- **Action buttons**: Full text labels (không icon-only)
- **Bo góc**: `rounded-lg border` cho content wrappers
- **Base UI anchor-width bug**: Cả `DropdownMenuContent` lẫn `SelectContent` dùng CSS var `--anchor-width` làm width mặc định — popup bị ép đúng bằng trigger width, text dài bị cắt. **Đã fix trong cả 2 component gốc**: `DropdownMenuContent` dùng `w-auto`, `SelectContent` dùng `w-auto min-w-(--anchor-width)`, `SelectTrigger` đổi từ `w-fit` → `w-full`. KHÔNG cần override ở từng nơi dùng.
- **DropdownMenuContent width**: Component Base UI dùng CSS var `--anchor-width` làm width mặc định — popup sẽ bằng đúng width của trigger button (thường rất nhỏ, text bị tràn ra ngoài). **Đã fix trong component gốc** (`w-auto` thay `w-(--anchor-width)`). KHÔNG cần override `w-auto` hay `min-w-*` ở từng nơi dùng nữa. Nếu cần giới hạn chiều rộng tối đa thêm `max-w-[Npx]`.
- **Button icon spacing**: Dùng `gap-2` trên button/link thay vì `mr-*` trên icon. Button là flex container — `gap-*` chuẩn hơn và không cần sửa từng icon.
- **SelectTrigger width**: Filter dropdown dùng `w-auto min-w-[Npx]` (tự co giãn theo nội dung), KHÔNG dùng `w-[Npx]` cố định (text dài bị cắt). Thêm `max-w-[Npx]` nếu cần giới hạn. Form dialog dropdown dùng `w-full` theo container
- **CurrencyInput** (`components/currency-input.tsx`): Dùng cho mọi field nhập tiền VND (estimated_value, budget_min, budget_max, price, amount…). Tự format dấu chấm + hint quy đổi ("≈ 3 tỷ"). API: `<CurrencyInput value={str} onChange={setStr} />` — KHÔNG dùng `<Input type="number">` cho tiền
- **Profile + permissions**: FE ability từ `useAbility()` đọc `profile.permissions` được fetch 1 lần lúc login qua `AuthProvider`. Sau khi grant permission mới ở DB, user CẦN reload tab (fetch lại `/auth/me`) hoặc logout/login — React state không tự refresh. Backend Redis cache `user:{id}:perms` TTL 10 phút; bust manual khi cần: `docker exec kiloba-dev-redis redis-cli DEL "user:{id}:perms"`
- **Không thêm npm package mới** trừ khi được phê duyệt

### Database

> **BẮT BUỘC: Mọi thay đổi schema DB (thêm/sửa/xóa table, column, index, constraint, view, function) PHẢI thực hiện qua migration file trong `services/api/migrations/init/`. TUYỆT ĐỐI KHÔNG sửa trực tiếp trong DB bằng SQL thủ công — điều này gây mất đồng bộ giữa DB thực tế và migration files, dẫn đến `migrate reset` tạo ra schema khác với DB hiện tại. Quy trình đúng: sửa file init SQL tương ứng → chạy `migrate reset` để verify.**

- Tiền tệ: `BIGINT` (VND, không thập phân)
- ID: `UUID` (gen_random_uuid())
- Timestamp: `TIMESTAMPTZ` (UTC)
- Soft delete: `deleted_at TIMESTAMPTZ` — KHÔNG hard delete
- JSONB: luôn có CHECK constraint validate type
- High-volume tables: partitioned theo tháng (audit_logs, chat_messages, notifications, portal_analytics)
- Unique constraints: `WHERE deleted_at IS NULL`
- **NOT NULL DEFAULT**: VARCHAR/TEXT columns → `NOT NULL DEFAULT ''`, JSONB object → `NOT NULL DEFAULT '{}'`, JSONB array → `NOT NULL DEFAULT '[]'`. Chỉ giữ nullable cho columns có semantic NULL (FK references như `parent_id`, `manager_id`; dates như `deleted_at`, `left_at`, `start_date`; optional numeric như `latitude`, `longitude`)
- **Go struct mapping**: NOT NULL string columns → `string` (không dùng `*string`). Nullable columns → pointer type (`*uuid.UUID`, `*time.Time`)
- **nullableJSON()**: Helper trả `'{}'` (không trả nil) cho NOT NULL JSONB columns. `nullableJSONArray()` trả `'[]'` cho array columns
- **CHECK constraints + NOT NULL**: Khi column NOT NULL, CHECK phải cho phép default value (ví dụ: `direction IN ('', 'E', 'W', ...)` — cho phép empty string)
- **Autovacuum**: KHÔNG dùng `ALTER TABLE ... SET (autovacuum...)` trên partitioned tables (PG17 không hỗ trợ) — chỉ set trên partitions cụ thể
- **Seed data prefix**: Dùng `SEED-` cho bulk seed, `ON CONFLICT DO NOTHING` (idempotent). Test data dùng `TEST-` prefix, cleanup scoped `WHERE code LIKE 'TEST-%'`

### Flutter Mobile (apps/mobile/)
- **State management**: Riverpod 3 (code-gen `@riverpod`), `Notifier` cho stateful (pagination), `AsyncNotifier` cho async
- **Icons**: Tabler Icons chỉ qua `AppIcons` registry — KHÔNG dùng `TablerIcons.*` trực tiếp, KHÔNG dùng Material Icons, KHÔNG dùng emoji icon
- **Design tokens**: Luôn dùng `AppThemeToken.of(context)` — KHÔNG hardcode `Color(0x...)` hay `AppColors.*` trong screens. Semantic domain colors (pipeline stages, interaction types) đặt trong `AppSemanticColors`, dùng `.withValues(alpha: 0.12)` cho background thay hardcode pastel
- **Typography**: Dùng `AppTypography.xxx.copyWith(...)` — KHÔNG dùng `TextStyle(fontSize: ...)` inline
- **Spacing**: Dùng `AppSpacing.xxx` và `AppRadius.borderXxx` — KHÔNG hardcode pixel
- **AppBar**: Main tabs `centerTitle: false` (left-aligned). Sub-pages (có back button) `centerTitle: true`. Toolbar height 44px (global theme)
- **Bottom nav**: Floating pill, ẩn ở sub-pages via `parentNavigatorKey: _rootNavigatorKey` trên GoRoute. Bottom sheet trong tab screens phải dùng `useRootNavigator: true` để đè lên bottom nav (không bị nav che)
- **Detail page pattern**: Dùng `NestedScrollView` + `SliverPersistentHeader(pinned: true)` cho tab bar — header content (stepper, info card) cuộn lên cùng page, tab bar sticky dưới AppBar. KHÔNG dùng Column(fixed header + Expanded(TabBarView)) vì gây nested scroll trên màn hình nhỏ
- **Infinite scroll**: `Notifier<State>` với `loadMore()` + `NotificationListener<ScrollNotification>` trigger khi < 200px từ bottom. Page size 20
- **Seasonal themes**: 6 themes, SVG hero illustration, color override qua `AppTheme.light/dark(seasonal:)`. Opacity SVG: light 0.35, dark 0.15
- **Logging**: Dùng `AppLogger` — KHÔNG dùng `print()`, `debugPrint()`, `LogInterceptor` Dio. Body logging chỉ dev mode, qua `LogSanitizer`
- **Error handling**: `ServerException` → `Failure` sealed → `ErrorMapper.toAppError()` → UI. Error states hiện friendly message, không hiện "Lỗi tải dữ liệu" đỏ. Mutations dùng `AppErrorHandler.show(context, e)`. `ErrorInterceptor` dùng `handler.reject(DioException(error: ServerException))` — KHÔNG `throw`
- **403/Permission errors**: Dùng `AccessDeniedView` widget chung. Detail providers check `hasError` trước `isLoading` (thủ công, không dùng `when()`) để tránh Riverpod 3 retry loop hiện loading mãi
- **Riverpod retry**: Disabled globally via `ProviderScope(retry: (...) => Duration(days: 999))` trong `main.dart`. Errors nên hiện error UI, không auto-retry
- **Forms dài**: Dùng full-screen page (`Navigator.push(fullscreenDialog: true)`) thay bottom sheet. Submit button sticky ở `bottomNavigationBar`
- **Success dialog**: `showSuccessDialog()` với animated checkmark, 2 actions (xem chi tiết / tiếp tục)
- **CurrencyInput**: Widget nhập tiền VND — auto format dấu chấm + suffix VNĐ + hint quy đổi (≈ 3 tỷ). Dùng cho mọi field tiền
- **Bottom sheet SafeArea**: Action buttons trong bottom sheet PHẢI wrap `SafeArea(top: false)`. KHÔNG cộng thêm bottom padding thủ công — SafeArea tự xử lý home indicator. Với DraggableScrollableSheet: tách button ra khỏi ListView, đặt sticky bottom trong `Column > [Expanded(ListView), SafeArea(button)]`
- **Chat input border**: Dùng `BorderRadius.circular(20)` — KHÔNG dùng `AppRadius.borderFull` (pill) vì bầu dục xấu khi nhiều dòng
- **Unused lambda params**: Dùng `_` (single), KHÔNG dùng `__`. Dart 3.x cho phép nhiều `_` trong cùng lambda
- **Null-aware `?` trong collections**: Chỉ dùng `?element` trong **list literals**. KHÔNG dùng cho map entries — dùng `if (x != null) 'key': x`
- **AppConfig**: `AppConfig.fromEnvironment()` hỗ trợ dart-define: `ENV` (dev/prod), `API_BASE_URL`, `AUTH_MODE`, `ZALO_WS_URL`. Dev: API localhost:33080, Zalo WS localhost:33003. Prod: api.kiloba.ai, Zalo WS derive từ domain
- **Code generation (build_runner)**: Khi thêm/sửa `@freezed` models hoặc `@riverpod` providers, PHẢI chạy `cd apps/mobile && dart run build_runner build --delete-conflicting-outputs` để sinh lại `.freezed.dart`, `.g.dart`. Files generated PHẢI commit cùng source. Nếu môi trường không có Flutter SDK, tải Flutter 3.41.x (`curl -sL https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_3.41.5-stable.tar.xz | tar xf - -C /tmp`) rồi dùng `/tmp/flutter/bin/dart`. KHÔNG viết tay file generated — dễ sai và khó maintain
- **AppThemeData API**: `AppThemeToken.of(context)` trả về `AppThemeData` (KHÔNG phải `AppThemeToken`). Khi truyền theme vào widget con, type parameter là `AppThemeData`. Các getter: `primary`, `primaryLight`, `bgBody`, `bgSurface` (card background), `bgMuted`, `textPrimary`, `textSecondary`, `textTertiary`, `borderDefault` (border color), `borderLight`, `success`, `danger`, `warning`. KHÔNG có: `cardBg` (dùng `bgSurface`), `border` (dùng `borderDefault`)
- **AppTypography API**: Headings: `headingXl/Lg/Md/Sm`. Body: `bodyLg/bodyMd/bodySm`. Khác: `label`, `caption`, `amountLg/Md/Sm`. KHÔNG có: `titleMedium` (dùng `headingSm`), `bodyMedium` (dùng `bodyMd`), `bodySmall` (dùng `bodySm`)

### Git
- Branch: `main` (protected) ← `develop` (dev) ← `feature/*`
- Commit format: `type: description` (feat, fix, chore, docs, perf, refactor)
- Push to `develop` branch (main is protected)

## Business Context

- **Công ty NobleX**: CP Tài chính và Bất động sản, đối tác KienlongBank
- **Quy mô**: Vài nghìn sale + CTV, 16+ dự án (HN + HCM), hàng chục nghìn căn hộ
- **Đặc thù**: Import giỏ hàng từ Excel CĐT, hoa hồng chia cấp tuỳ team, CTV + sale chính thức
- **Tích hợp**: MISA AMIS (kế toán), Zitadel (auth), Firebase FCM (push), SMS/ZNS
- **Địa chỉ hành chính**: Mô hình 2 cấp VN (Tỉnh → Xã, không còn cấp Huyện — từ 1/7/2025)

## GitLab

- **URL**: https://git.kiloba.ai
- **Group**: KilobaRealty (`kilobarealty`, ID: 20)
- **Repos**: `app`, `infra`, `docs`
- **SSH**: `git@git.kiloba.ai:kilobarealty/app.git`
- **Push**: `git push origin main:develop`
