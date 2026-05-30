# Tài liệu triển khai BuildStock trên Kubernetes (Minikube)

> **Môi trường**: Minikube + Docker driver  
> **Ngày triển khai**: 2026-05-16  
> **Phiên bản**: 1.0

---

## Tổng quan kiến trúc

```
Internet
   │
   ▼
[ngrok :443]  ←── HTTPS tunnel (free tier, URL đổi mỗi lần restart)
   │
   ▼
[localhost:9090]  ←── kubectl port-forward
   │
   ▼
[svc/my-web :80]  ←── Nginx reverse proxy (K8s Service)
   │
   ├─── /          →  [svc/frontend :80]   React SPA (nginx static)
   ├─── /api/      →  [svc/api :4000]      Node.js + Express
   └─── /storage/  →  [svc/storage :9000]  MinIO
                              │
                       [svc/db :5432]       PostgreSQL
                       [svc/cache :6379]    Redis
```

---

## Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu | Kiểm tra |
|---------|---------------------|----------|
| Docker | 24+ | `docker --version` |
| minikube | 1.30+ | `minikube version` |
| kubectl | 1.27+ | `kubectl version --client` |
| ngrok | 3+ | `ngrok version` |

---

## Cấu trúc file K8s

```
k8s/
├── 01-secrets.yaml          # Mật khẩu DB, Redis, JWT, MinIO
├── 02-configmap-nginx.yaml  # Cấu hình Nginx reverse proxy
├── 03-postgres.yaml         # PostgreSQL: PVC + Deployment + Service
├── 04-redis.yaml            # Redis: Deployment + Service
├── 05-minio.yaml            # MinIO: PVC + Deployment + Service
├── 06-api.yaml              # Backend API: Deployment + Service
├── 07-frontend.yaml         # Frontend React: Deployment + Service
└── 08-nginx.yaml            # Nginx (my-web): Deployment + Service
```

---

## Hướng dẫn triển khai từ đầu

### Bước 1 — Khởi động Minikube

```bash
minikube start --driver=docker
```

Kiểm tra:
```bash
minikube status
kubectl get nodes
```

### Bước 2 — Build Docker images trong Minikube

> **Quan trọng**: Phải trỏ Docker CLI vào daemon của Minikube bằng `eval $(minikube docker-env)` trước khi build. Images build ra sẽ nằm bên trong Minikube, không phải Docker host.

```bash
# Trỏ Docker CLI vào Minikube
eval $(minikube docker-env)

# Build backend API
docker build -t buildstock-api:latest ./backend

# Build frontend (VITE_API_URL=/api để dùng relative path — hoạt động với mọi ngrok URL)
docker build -t buildstock-frontend:latest \
  --build-arg VITE_API_URL=/api \
  --build-arg VITE_APP_NAME=BuildStock \
  --build-arg VITE_APP_URL="" \
  --build-arg VITE_ZITADEL_AUTHORITY="" \
  --build-arg VITE_ZITADEL_CLIENT_ID="" \
  ./frontend
```

Kiểm tra images đã có trong Minikube:
```bash
eval $(minikube docker-env) && docker images | grep buildstock
```

### Bước 3 — Deploy toàn bộ lên K8s

```bash
kubectl apply -f k8s/
```

Output mong đợi:
```
secret/buildstock-secrets created
configmap/nginx-config created
persistentvolumeclaim/postgres-pvc created
deployment.apps/db created
service/db created
...
```

### Bước 4 — Đợi tất cả pods Running

```bash
kubectl get pods -w
```

Đợi đến khi tất cả 6 pods đều `Running 1/1`:

| Pod | Image |
|-----|-------|
| `db-*` | postgres:15-alpine |
| `cache-*` | redis:7-alpine |
| `storage-*` | minio/minio:latest |
| `api-*` | buildstock-api:latest |
| `frontend-*` | buildstock-frontend:latest |
| `my-web-*` | nginx:1.25-alpine |

Hoặc đợi tự động:
```bash
kubectl rollout status deployment/db
kubectl rollout status deployment/api
kubectl rollout status deployment/frontend
kubectl rollout status deployment/my-web
```

### Bước 5 — Tạo schema DB và nhập dữ liệu mẫu

> Chỉ cần chạy **lần đầu tiên** hoặc sau khi xóa PVC.

```bash
# Lấy tên pod API
API_POD=$(kubectl get pod -l app=api -o jsonpath='{.items[0].metadata.name}')

# Tạo schema (vì dự án chưa có migration files, dùng db push)
kubectl exec $API_POD -- npx prisma db push

# Nhập dữ liệu mẫu
kubectl exec $API_POD -- node prisma/seed.js
```

Tài khoản mặc định sau seed:
| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `Admin@2026` |
| Staff | `staff` | `Staff@2026` |

### Bước 6 — Port-forward và expose qua ngrok

```bash
# Terminal 1: Port-forward nginx service ra localhost:9090
kubectl port-forward svc/my-web 9090:80 &

# Kiểm tra hoạt động
curl http://localhost:9090/api/health

# Terminal 2: Mở tunnel ngrok
ngrok http 9090 &

# Lấy URL public
curl -s http://localhost:4040/api/tunnels | python3 -m json.tool | grep public_url
```

---

## Kiểm tra hệ thống

```bash
# Health check API
curl https://<ngrok-url>/api/health

# Xem logs API
kubectl logs -l app=api -f

# Xem logs nginx
kubectl logs -l app=my-web -f

# Truy cập Prisma Studio (port-forward riêng)
kubectl exec -it $(kubectl get pod -l app=api -o jsonpath='{.items[0].metadata.name}') \
  -- npx prisma studio
# Sau đó: kubectl port-forward <api-pod> 5555:5555
```

---

## Các thao tác thường dùng

### Rebuild và redeploy sau khi sửa code

```bash
# Trỏ vào Minikube Docker
eval $(minikube docker-env)

# Rebuild image (chọn api hoặc frontend)
docker build -t buildstock-api:latest ./backend
# hoặc
docker build -t buildstock-frontend:latest --build-arg VITE_API_URL=/api ... ./frontend

# Rollout restart để K8s pull image mới
kubectl rollout restart deployment/api
kubectl rollout restart deployment/frontend
```

### Xem logs

```bash
kubectl logs -l app=api --tail=100 -f
kubectl logs -l app=db --tail=50
kubectl logs -l app=my-web --tail=50
```

### Exec vào pod

```bash
kubectl exec -it $(kubectl get pod -l app=api -o jsonpath='{.items[0].metadata.name}') -- sh
kubectl exec -it $(kubectl get pod -l app=db -o jsonpath='{.items[0].metadata.name}') -- psql -U buildstock_user -d buildstock_db
```

### Reset toàn bộ (xóa data)

```bash
kubectl delete -f k8s/
kubectl delete pvc postgres-pvc minio-pvc
# Sau đó deploy lại từ Bước 3
```

### Dừng và giữ data

```bash
# Dừng port-forward và ngrok
pkill -f "kubectl port-forward"
pkill -f ngrok

# Dừng Minikube (giữ nguyên PVC data)
minikube stop
```

---

## Lưu ý quan trọng

### ngrok URL thay đổi mỗi lần restart
- Tài khoản free: URL ngẫu nhiên mỗi lần chạy `ngrok http 9090`
- Tài khoản trả phí: Có thể đặt domain cố định (`ngrok http --domain=your-domain.ngrok.app 9090`)
- **VITE_API_URL=/api** (relative path) nên frontend hoạt động đúng với mọi URL, không cần rebuild khi đổi ngrok URL

### imagePullPolicy: Never
- Tất cả custom images (`buildstock-api`, `buildstock-frontend`) dùng `imagePullPolicy: Never`
- K8s sẽ dùng image đã build sẵn trong Minikube daemon thay vì pull từ Docker Hub
- Nếu quên chạy `eval $(minikube docker-env)` trước khi build → pod sẽ lỗi `ErrImageNeverPull`

### Secrets trong k8s/01-secrets.yaml
- File này chứa credentials được base64 encode (KHÔNG phải mã hóa thật)
- **KHÔNG commit file này lên repo public** nếu dùng credentials thật
- Hiện tại dùng credentials mặc định cho môi trường dev/test

### Nginx ConfigMap vs Docker Compose
- File `nginx/nginx.conf` (Docker Compose) dùng `resolver 127.0.0.11` (Docker DNS)
- File `k8s/02-configmap-nginx.yaml` dùng `proxy_pass` trực tiếp (K8s CoreDNS tự resolve)
- Hai file khác nhau, KHÔNG dùng lẫn

---

## Sơ đồ Services trong Cluster

```
┌─────────────────────────────────────────────────────┐
│                   Kubernetes Cluster                 │
│                                                     │
│  ┌──────────┐    ┌──────────┐    ┌───────────────┐ │
│  │  my-web  │    │ frontend │    │      api      │ │
│  │  :80     │───▶│  :80     │    │     :4000     │ │
│  │ (nginx)  │    │  (react) │    │  (express)    │ │
│  └────┬─────┘    └──────────┘    └──────┬────────┘ │
│       │                                 │           │
│       └─────────────────────────────────┘           │
│                                         │           │
│                          ┌──────────────▼──────┐    │
│                          │   db     cache  storage │ │
│                          │  :5432  :6379   :9000  │ │
│                          └─────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```
