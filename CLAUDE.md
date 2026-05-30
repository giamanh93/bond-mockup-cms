# CLAUDE.md — BuildStock

## Dự án

**BuildStock** — Phần mềm quản lý bán hàng, tồn kho và công nợ dành cho cửa hàng vật liệu xây dựng nhỏ và vừa tại Việt Nam.

## Tech Stack

- **Backend**: Node.js + Express + Prisma ORM
- **Frontend**: React 18 + Vite 5 + Tailwind CSS
- **Database**: PostgreSQL 15
- **Auth**: JWT (bcryptjs + jsonwebtoken — username/password, role-based)
- **Cache**: Redis 7
- **File storage**: MinIO (S3-compatible)
- **API Docs**: Swagger/OpenAPI (swagger-jsdoc + swagger-ui-express)
- **Container**: Docker + Docker Compose

## Cấu trúc thư mục

```
build-stock/
├── backend/
│   ├── prisma/         → Schema + migrations + seed
│   └── src/
│       ├── config/     → database, redis, minio, swagger
│       ├── middleware/ → auth (JWT), error, rateLimit
│       ├── routes/     → auth, products, orders, customers, reports, stock, users
│       ├── controllers/
│       ├── services/
│       └── utils/
├── frontend/
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       ├── services/   → Axios API clients
│       └── store/      → Zustand stores
├── nginx/
├── volumes/            → Docker persistent data (git-ignored)
├── docker-compose.yml
└── .env.example
```

## Commands

```bash
# Docker
docker compose up -d --build        # Khởi động toàn bộ hệ thống
docker compose down                  # Dừng (giữ data)
docker compose logs -f api           # Xem log API
docker compose restart api           # Restart API
docker compose down -v               # Reset hoàn toàn (xóa data)

# Database
docker compose exec api npx prisma migrate deploy   # Chạy migrations
docker compose exec api node prisma/seed.js         # Nhập dữ liệu mẫu
docker compose exec api npx prisma studio           # Prisma Studio (port 5555)

# Dev (local, không Docker)
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

## Ports

| Service | Port | URL |
|---------|------|-----|
| App (Nginx) | 80 | http://localhost |
| API | 4000 | http://localhost/api |
| Swagger UI | 4000 | http://localhost/api/api-docs |
| Zitadel | 8080 | http://localhost:8080 |
| MinIO Console | 9001 | http://localhost:9001 |
| Prisma Studio | 5555 | http://localhost:5555 |

---

## Development Principles (Karpathy-inspired)

> Bias toward caution over speed — for trivial tasks, use judgment.

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
- Biến yêu cầu mơ hồ thành mục tiêu kiểm chứng được
- Cho multi-step tasks, nêu plan ngắn gọn:
  ```
  1. [Bước] → verify: [kiểm tra]
  2. [Bước] → verify: [kiểm tra]
  ```

---

## Coding Conventions

### Chung
- **Tiếng Việt có dấu**: Mọi chuỗi hiển thị cho người dùng (UI text, placeholder, thông báo lỗi, toast, dialog) PHẢI dùng tiếng Việt có dấu đầy đủ. KHÔNG dùng tiếng Việt không dấu. Log messages (developer đọc) có thể dùng tiếng Anh.

### Backend (Node.js/Express)
- CommonJS (`require/module.exports`) — không dùng ES modules
- Mọi route handler PHẢI có `@openapi` JSDoc annotation đầy đủ (`summary`, `tags`, `parameters`, `requestBody`, `responses`). Swagger docs viết bằng **tiếng Anh**. Swagger UI: `http://localhost/api/api-docs`
- **Validation**: Dùng `zod` cho request body. Lỗi validation trả HTTP 422
- **Response format chuẩn**:
  ```js
  // Success
  { success: true, data: {...}, meta: { total, page, limit } }
  // Error
  { success: false, error: "message", code: "ERROR_CODE" }
  ```
- **List endpoint envelope**: Mọi list endpoint PHẢI trả `{ success, data: [], meta: { total, page, limit } }`. KHÔNG trả bare array
- **State machine trong DB**: Mọi order status transition là `UPDATE orders SET status='X' WHERE id=? AND status IN (...)`. Zero rows affected → trả HTTP 409 `ErrInvalidTransition`
- **Environment variables**: Khi thêm biến env mới, PHẢI cập nhật: (1) `docker-compose.yml`, (2) `.env` (dev), (3) `.env.example`

### Frontend (React/TypeScript)
- **Tiền VND**: Dùng `CurrencyInput` component cho mọi field nhập tiền — KHÔNG dùng `<input type="number">` cho tiền
- **Xác nhận xóa/hủy**: KHÔNG dùng `window.confirm()`. Dùng dialog xác nhận có `variant: destructive/warning`
- **Pagination**: Server-side, 1-based page. Mọi list có `page` state + `PaginationBar` component. KHÔNG load toàn bộ data về client
- **Select với ID/UUID**: Mọi `<Select>` có value là ID/code PHẢI có `items` prop để hiển thị label thay vì raw ID
- **Form dài**: Dùng full-screen page hoặc Dialog — KHÔNG dùng inline form giữa trang list
- **Không thêm npm package mới** trừ khi được phê duyệt

### Database (PostgreSQL + Prisma)
- **Tiền tệ**: `Decimal(15, 0)` — VND không có thập phân
- **Timestamp**: `DateTime` Prisma (UTC)
- **Soft delete**: `isActive Boolean` — KHÔNG hard delete
- **Mọi thay đổi schema** PHẢI qua Prisma migration. TUYỆT ĐỐI KHÔNG sửa trực tiếp DB bằng SQL thủ công
- **Seed data**: Dùng `upsert` hoặc `createMany({ skipDuplicates: true })` — idempotent

### Git
- **Branch**: `main` ← `develop` ← `feature/*`
- **Commit format**: `type: mô tả` — type: `feat`, `fix`, `chore`, `docs`, `perf`, `refactor`
- **Commit message**: Tiếng Việt không dấu hoặc tiếng Anh (tránh encoding issues)
