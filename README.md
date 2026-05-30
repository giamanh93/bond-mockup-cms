# BuildStock — Phần mềm quản lý vật liệu xây dựng

Hệ thống quản lý bán hàng, tồn kho, công nợ dành cho cửa hàng vật liệu xây dựng nhỏ và vừa tại Việt Nam.

## Tech Stack

| Layer | Công nghệ |
|-------|-----------|
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 |
| Backend | Node.js + Express + Prisma ORM |
| Database | PostgreSQL 15 |
| Auth | JWT (bcryptjs + jsonwebtoken) |
| Cache | Redis 7 |
| File Storage | MinIO (S3-compatible) |
| Reverse Proxy | Nginx |
| Container | Docker + Docker Compose |

## Yêu cầu hệ thống

- Docker Desktop (Windows/Mac) hoặc Docker Engine + Docker Compose v2 (Linux)
- Port **80** chưa bị chiếm
- Dung lượng đĩa trống tối thiểu **3 GB**

---

## Hướng dẫn khởi động lần đầu (First-time Setup)

### Bước 1 — Chuẩn bị file cấu hình

```bash
cp .env.example .env
```

Mở file `.env`, kiểm tra và chỉnh sửa nếu cần. Các giá trị mặc định đã dùng được ngay cho môi trường dev local.

> **Bắt buộc đổi khi production:** `JWT_SECRET`, `DB_PASS`, `REDIS_PASS`, `MINIO_PASS`

---

### Bước 2 — Build và khởi động hệ thống

```bash
docker compose up -d --build
```

Lần đầu build sẽ mất 5–10 phút (tải npm packages). Các lần sau nhanh hơn nhờ Docker cache.

Kiểm tra tất cả containers đang chạy:

```bash
docker compose ps
```

Kết quả mong đợi — tất cả STATUS phải là `running`:

```
NAME                    STATUS
buildstock-nginx        running
buildstock-frontend     running
buildstock-api          running
buildstock-db           running (healthy)
buildstock-cache        running
buildstock-storage      running
```

---

### Bước 3 — Khởi tạo Database

```bash
# Tạo schema database
docker compose exec api npx prisma db push

# Nhập dữ liệu mẫu + tạo tài khoản mặc định
docker compose exec api node prisma/seed.js
```

---

### Bước 4 — Truy cập ứng dụng

Mở http://localhost và đăng nhập bằng tài khoản mặc định:

| Tài khoản | Mật khẩu | Role |
|-----------|----------|------|
| `admin` | `Admin@2026` | OWNER (toàn quyền) |
| `staff` | `Staff@2026` | STAFF (nghiệp vụ) |

> **Đổi mật khẩu ngay sau khi đăng nhập lần đầu** (trang Quản lý người dùng).

---

## URL các dịch vụ

| Dịch vụ | URL | Ghi chú |
|---------|-----|---------|
| BuildStock App | http://localhost | Ứng dụng chính |
| API + Swagger | http://localhost/api/api-docs | Swagger UI |
| MinIO API (S3) | http://localhost:9003 | PDF hóa đơn, file upload |
| MinIO Console | http://localhost:9002 | Quản lý file storage |
| Prisma Studio | http://localhost:5555 | Xem/sửa database trực tiếp |

---

## Lệnh thường dùng

```bash
# Khởi động / dừng
docker compose up -d              # Khởi động tất cả
docker compose down               # Dừng (giữ data)
docker compose down -v            # Reset hoàn toàn (XÓA data)

# Xem logs
docker compose logs -f api        # Log API realtime
docker compose logs -f            # Log tất cả services

# Restart một service
docker compose restart api
docker compose restart nginx

# Rebuild sau khi sửa code backend
docker compose build --no-cache api
docker compose up -d api

# Rebuild sau khi sửa code frontend
docker compose build frontend
docker compose up -d frontend

# Database
docker compose exec api npx prisma db push          # Apply schema changes
docker compose exec api node prisma/seed.js          # Nhập dữ liệu mẫu
docker compose exec api npx prisma studio            # Mở Prisma Studio (port 5555)

# Xem trạng thái containers
docker compose ps
```

---

## Cấu trúc thư mục

```
build-stock/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── seed.js           # Dữ liệu mẫu + tài khoản mặc định
│   └── src/
│       ├── config/           # database, redis, minio, swagger
│       ├── middleware/        # auth (JWT), error, rateLimit
│       ├── routes/           # auth, orders, products, customers, reports, stock, users
│       └── services/         # pdfService (pdfkit + MinIO)
├── frontend/
│   └── src/
│       ├── pages/            # Dashboard, Orders, Products, Customers, Debts, Reports...
│       ├── components/       # AppLayout, Pagination, CurrencyInput...
│       ├── hooks/            # useOrders, useProducts, useCustomers...
│       ├── services/         # api.js (Axios), auth.js (localStorage token)
│       └── store/            # authStore (Zustand)
├── nginx/
│   └── nginx.conf            # Reverse proxy + Docker DNS resolver
├── volumes/                  # Docker persistent data (git-ignored)
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Phân quyền

| Role | Mô tả | Quyền |
|------|-------|-------|
| `OWNER` | Chủ cửa hàng | Toàn quyền: xem báo cáo, quản lý users, điều chỉnh công nợ, xóa đơn |
| `STAFF` | Nhân viên bán hàng | Tạo đơn hàng, nhập kho, thu tiền, xem khách hàng |
| `WAREHOUSE` | Thủ kho | Nhập kho, xem tồn kho |
| `VIEWER` | Chỉ xem | Xem báo cáo, không thao tác |

---

## Lưu ý kỹ thuật

### Auth flow
- Đăng nhập qua `POST /api/auth/login` → nhận **JWT token** (hết hạn 30 ngày)
- Token lưu trong `localStorage`, tự động gắn vào header `Authorization: Bearer ...`
- Khi token hết hạn hoặc không hợp lệ → tự động redirect về trang login

### JWT Secret
Biến `JWT_SECRET` trong `.env` dùng để ký token. **Bắt buộc đổi thành chuỗi ngẫu nhiên dài khi chạy production.** Có thể generate bằng:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend rebuild
Vite bake các biến `VITE_*` vào bundle lúc build — **không phải runtime**. Bất kỳ thay đổi `VITE_*` nào trong `.env` đều phải rebuild frontend.

### MinIO port
MinIO Console chạy trên port **9002** (không phải 9001 mặc định) vì Docker Desktop đã chiếm port 9001.

### Nginx DNS resolver
`nginx.conf` dùng `resolver 127.0.0.11 valid=10s` kết hợp `set $var` để tránh lỗi 502 khi container backend restart — nginx sẽ re-resolve DNS thay vì cache IP cũ.
