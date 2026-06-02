# CLAUDE.md — Bond CMS

> Hướng dẫn cho Claude Code (và AI agent khác) khi làm việc với repo này. Đọc trước khi sửa code.

## Dự án

**Bond CMS** — Hệ thống quản lý trái phiếu cho KSGFinance. Repo này là **mockup-tier** + FE; BE production C# nằm ở repo riêng `umee-bond` (thuộc `f:\unicloud\API sunshine\umee-bond` trên máy dev).

## Cấu trúc

```
bond-ksg-mockup/
├── contracts/              ← Source of truth — JSON Schema + api-routes.yaml
│   ├── api-routes.yaml     ← Registry mọi endpoint giữa FE/Mock/BE
│   ├── features/<id>/      ← Spec + JSON config theo feature
│   ├── lookups/            ← Lookup tĩnh (bondType, status, ...)
│   └── schemas/            ← JSON Schema validate response shape
├── mock-server/            ← Node.js Express, port 4001 — serve JSON tĩnh
├── api-server/             ← Node.js Express proxy, port 4002 — forward → C# hoặc mock
│   ├── appsettings.json    ← Upstream.Mode: "csharp" | "mock"
│   └── index.js            ← http-proxy-middleware
├── frontend/               ← React 18 + Vite + Tailwind + shadcn primitives
│   ├── public/config/
│   │   └── runtime.json    ← Runtime config (apiUrl, oidc, menu, buildTag) — sửa được sau build
│   ├── src/
│   │   ├── components/ui/  ← shadcn primitives (Button, Input, Sheet, Dialog, ...)
│   │   ├── renderers/      ← DynamicTable / DynamicForm / DynamicFilterField
│   │   ├── lib/            ← runtime.js, lookup-cache.js, utils.js (cn helper)
│   │   ├── services/       ← api.js (axios), auth.js (OIDC), bond.service.js
│   │   └── pages/          ← BondList, Login, AuthCallback, UIShowcase
│   ├── .env.development    ← Dev mockup mode (port 3000 → 4001)
│   └── .env.api            ← Dev api mode (port 3001 → 4002)
└── package.json            ← Root scripts: dev:all / dev:mockup / dev:api
```

## Tech stack

- **FE**: React 18, Vite 5, Tailwind CSS, shadcn/ui primitives (custom + Radix), react-router-dom, zustand, axios, oidc-client-ts, react-hook-form, sonner (toast), react-day-picker
- **mock-server**: Node.js + Express, đọc JSON từ `contracts/`
- **api-server**: Node.js + Express + http-proxy-middleware (proxy thuần, không SQL)
- **BE C# (umee-bond)**: ASP.NET Core .NET 8, Dapper, SQL Server, Keycloak JWT, NSwag Swagger
- **DB**: MS SQL Server `10.60.1.153/dbKsgBond` — bảng `bond_prod_info_v2` + `bond_own_info_v2`
- **Auth**: Keycloak `idp-dev.unicloudgroup.com.vn/realms/realm_ksgfinance`
  - FE client: `ksg-web-bond-client` (PKCE, public)
  - BE client: `ksg-backend-bond-client` (confidential)

## Commands

```powershell
# Khởi động tất cả Node-side song song (mock + api-server + 2 FE)
npm run dev:all

# Chỉ stack mockup (mock-server :4001 + FE :3000)
npm run dev:mockup

# Chỉ stack API thật (api-server :4002 + FE :3001)
npm run dev:api

# FE build production (output ở frontend/dist/)
cd frontend; npm run build

# BE C# (chạy riêng ở repo umee-bond, port 3091)
cd "f:\unicloud\API sunshine\umee-bond\UmeApi"; dotnet run
```

## Ports

| Service | Port | Vai trò |
|---|---|---|
| FE mockup mode | 3000 | UI demo với data fake từ mock-server |
| FE api mode | 3001 | UI demo với data thật qua api-server proxy |
| mock-server | 4001 | Serve `contracts/*.json` tĩnh |
| api-server | 4002 | Proxy `/api/*` → C# (3091) hoặc mock (4001) |
| C# UmeApi | 3091 | BE production thật, Swagger `/swagger` |

## 🔴 Quy tắc 1 — Mockup-first

Repo này chứa 2 lớp mockup:
- **`mock-server/`** (4001) — JSON tĩnh từ `contracts/`
- **`api-server/`** (4002) — proxy forward sang BE thật

BE production **thật** là **C# tại `f:\unicloud\API sunshine\umee-bond`** (repo riêng).

**Khi user yêu cầu "thêm chức năng X / sửa Y"**:
- Mặc định: viết ở `mock-server/` + `contracts/`. Wire FE đọc qua URL chuẩn.
- **KHÔNG bao giờ** đụng repo `umee-bond` trừ khi user nói rõ: "viết controller C#", "ghép vào BE thật", "thêm vào UmeApi", "viết BE production".
- Khi user nói "API" — nếu mơ hồ, **hỏi lại** ý mockup-tier hay BE C# production.

## 🔴 Quy tắc 2 — API pattern decision

3 pattern khi thiết kế endpoint mới:

| Pattern | Response shape | FE renderer | Khi dùng |
|---|---|---|---|
| **Page** | `{gridflexs[], dataList[], recordsTotal}` | `<DynamicTable>` | List có paging/filter/sort, admin tùy biến cột |
| **Info** | `{group_fields[], tableKey, draftPath, submitPath}` | `<DynamicForm>` | Form CRUD, admin tùy biến field |
| **Plain JSON** | Mảng/object thuần `[{value, label}]` hoặc `{kpis, charts}` | Component tay | Dashboard, chart, KPI, print, lookup |

**Decision tree:**
- Là grid/list? + admin cần ẩn/sửa cột không deploy → **Page**. Cột cố định → Plain JSON.
- Là form CRUD có Save? + admin cần đổi label/type/required → **Info**. Form cố định → Plain JSON.
- Không phải table/form → **Plain JSON** luôn.

**Quy tắc 1 câu**: Page/Info khi admin tùy biến UI sau deploy. Plain JSON khi UI cố định.

Đã áp dụng:
- `/api/v2/bond/GetBondPage` → Page
- `/api/v2/bond/GetBondInfo` / `SetBondInfo` / `SetBondInfoDraft` → Info
- `/api/v2/bond/GetBondTypeList` / `GetIssuerList` / `GetBondStatusList` / `GetCouponFreqList` → Plain JSON
- Dashboard (chưa làm) → Plain JSON structured

## 🔴 Quy tắc 3 — Contract-first

`contracts/` là source of truth giữa mockup team và BE team:
- Mọi endpoint mới: thêm entry vào `contracts/api-routes.yaml` trước
- JSON response sample đặt ở `contracts/features/<id>/`
- CI validate response thực tế qua JSON Schema ở `contracts/schemas/`
- Cả mock-server, FE, BE C# đều phải tuân `contracts/`. Không endpoint nào tham chiếu path lạ ngoài registry.

## 🔴 Quy tắc 4 — Không động bảng SQL cũ

Khi cần lưu data vào SQL Server `dbKsgBond`:
- Tạo bảng MỚI với suffix `_v2` (vd `bond_prod_info_v2`)
- Seed 1 lần từ bảng legacy bằng `INSERT...SELECT` (idempotent với `IF NOT EXISTS`)
- **Không** SELECT/INSERT/UPDATE/DELETE lên bảng legacy `bond_prod_info` / `bond_own_info`
- BE C# `BondV2Repository` cũng phải đụng `_v2`. Khi nghiệp vụ ổn → rename swap sang main.

## Conventions

### FE
- **Tiếng Việt có dấu** cho mọi UI text (label, placeholder, toast, dialog). Comment + log có thể tiếng Anh
- **Tailwind + shadcn primitives** — KHÔNG viết raw CSS, KHÔNG dùng `style={...}` trừ khi không thể tránh
- **`cn()` helper** từ `@/lib/utils` để merge className conditional
- **shadcn pattern**: dùng `<Button variant="..." size="...">`, `<Input>`, `<Sheet>`, `<Dialog>`, `<AlertDialog>`, `<DataTable>` (custom DynamicTable), `<Form>` (RHF)
- **Toast**: `toast.success/error/info/warning` từ `sonner` — KHÔNG `window.alert`
- **Confirm**: `useConfirm()` hook trả `Promise<boolean>` — KHÔNG `window.confirm`
- **Date**: `<DatePicker>` (shadcn + react-day-picker), KHÔNG `<input type="date">`
- **Runtime config**: đọc qua `getRuntime()` từ `@/lib/runtime` (apiUrl, oidc, buildTag, menu). KHÔNG `import.meta.env.VITE_*` trong component
- **Lookup cache**: `cachedGet(url)` từ `@/lib/lookup-cache` cho endpoint idempotent
- **OIDC**: `authService` từ `@/services/auth`. Login flow PKCE qua oidc-client-ts. Silent renew fail → tự logout redirect `/login`
- **DynamicForm pattern**: Schema có `isSpecial` field → khi đổi value → fire `SetXxxInfoDraft?changed=<fieldname>` để BE recalc field phụ thuộc, replace toàn bộ `group_fields`

### BE C# (chỉ khi user yêu cầu rõ ràng)
- Controller route: `[Route("api/v2/<entity>/[action]")]`
- DTO theo contract `contracts/api-routes.yaml` — không tự bịa shape
- Service + Repository pattern (split DAL/BLL)
- Repository dùng Dapper raw query (legacy code dùng SP qua `UniBaseRepository`, V2 dùng Dapper trực tiếp do chưa có SP)
- `IConfiguration.GetConnectionString("dbUmeBondConnection")` cho SQL
- Endpoint cần auth: `[Authorize(AuthenticationSchemes = IdentityServerAuthenticationDefaults.AuthenticationScheme)]`
- DI registration trong `UmeApi/Extensions/ServiceCollectionExtensions.cs`
- DTO classes phải khai báo trong `umee-model/UME.Model.csproj` `<Compile Include>` (csproj có pattern remove all + explicit include)
- `<LangVersion>latest</LangVersion>` cho UmeDAL + UmeBLL nếu cần switch expressions / target-typed new

### Git
- Branch: `main` (protected) ← `develop` (active)
- Commit format: `type: description` (feat, fix, refactor, chore, docs)
- Push lên `develop`, merge sang `main` qua PR

### Runtime config (post-build edit)
- Sau `npm run build`, sửa `dist/config/runtime.json` để đổi apiUrl/buildTag/menu/oidc
- Không cần rebuild FE — F5 trang là có hiệu lực
- Dev mode bypass file (giữ workflow `.env.development` / `.env.api` cho 2 mode)

## Tạo feature mới — workflow

> **Tài liệu chi tiết bắt buộc đọc trước**:
> - [contracts/README.md](contracts/README.md) — Structure thư mục contracts + quy tắc
> - [docs/standard-api-patterns.md](docs/standard-api-patterns.md) — Naming convention 5 nhóm API + mapping URL/SP/Repo/Service
> - [docs/dynamic-feature-react-port.md](docs/dynamic-feature-react-port.md) — Logic 4 API cho 1 feature CRUD (Page + Filter + Info + Draft) + DynamicTable/Form contract
> - [docs/sys-config-list-form-spec.md](docs/sys-config-list-form-spec.md) — Schema 2 bảng config DB (cho BE C# implement)
> - [contracts/features/01-bond-list/](contracts/features/01-bond-list/) — Sample feature đầy đủ để tham khảo

### Step-by-step tạo feature "Quản lý X" (vd: coupon, issuer, transaction)

**1. Hỏi user 2 câu critical** (nếu chưa rõ):
- "Màn này admin có cần tùy biến UI sau khi deploy không?" → quyết định Page/Info vs Plain JSON (xem Quy tắc 2)
- "Đây là mockup-tier hay cần BE C# thật?" → quyết định viết ở `mock-server/` hay cả `umee-bond` (xem Quy tắc 1)

**2. Tạo folder contract** `contracts/features/<NN>-<feature-slug>/`:
```
02-coupon-list/                 ← NN = số thứ tự, slug = kebab-case
├── spec.md                     ← Feature spec với frontmatter (xem mẫu 01-bond-list/spec.md)
├── page-config.json            ← Sample response GetCouponPage (gridflexs + dataList)
├── filter-config.json          ← Sample response GetCouponFilter (group_fields filter)
├── info-add.json               ← Sample response GetCouponInfo không Oid (form trống)
├── info-edit.json              ← Sample response GetCouponInfo?Oid=X (form đã fill)
└── conversation.md             ← Audit Q&A giữa AI và user (optional)
```

**3. Đăng ký endpoint vào** `contracts/api-routes.yaml`:
```yaml
- id: coupon.list.page
  method: GET
  path: /api/v2/coupon/GetCouponPage
  response_schema: data-page.schema.json
  mock_file: features/02-coupon-list/page-config.json
  feature: 02-coupon-list
  owner_mockup: ai-claude
  owner_be: null
  status: mockup-pending
```
Tương tự cho `GetCouponFilter`, `GetCouponInfo`, `SetCouponInfoDraft`, `SetCouponInfo`, `DeleteCouponInfo`.

**4. mock-server**: route tự bind từ `api-routes.yaml`. Nếu endpoint cần dynamic logic (vd `SetXxxInfoDraft` recalc field) → thêm handler vào `mock-server/index.js` rồi map vào `DYNAMIC` object.

**5. FE service** ở `frontend/src/services/<feature>.service.js`:
```js
const BASE = '/api/v2/coupon'
export const couponService = {
  getCouponPage: (params) => api.get(`${BASE}/GetCouponPage`, { params }).then(r => r.data),
  getCouponFilter: () => api.get(`${BASE}/GetCouponFilter`).then(r => r.data),
  getCouponInfo: (params) => api.get(`${BASE}/GetCouponInfo`, { params }).then(r => r.data),
  setCouponInfoDraft: (body, { changed } = {}) => api.post(`${BASE}/SetCouponInfoDraft`, body, { params: changed ? { changed } : {} }).then(r => r.data),
  setCouponInfo: (body) => api.post(`${BASE}/SetCouponInfo`, body).then(r => r.data),
  deleteCouponInfo: (oid) => api.post(`${BASE}/DeleteCouponInfo`, { Oid: oid }).then(r => r.data),
}
```

**6. FE page** ở `frontend/src/pages/<Feature>List.jsx`:
- Copy pattern từ [BondList.jsx](frontend/src/pages/BondList.jsx) (toolbar + DynamicTable + Sheet drawer + Dialog filter + AlertDialog delete)
- Đổi service import + entity name + action labels

**7. Routing** thêm vào [App.jsx](frontend/src/App.jsx):
```jsx
<Route path="coupon" element={<CouponList />} />
```

**8. Menu** thêm vào [public/config/runtime.json](frontend/public/config/runtime.json):
```json
{ "to": "/coupon", "label": "Coupon", "icon": "FileText" }
```
Icon string → component map trong [AppLayout.jsx](frontend/src/components/AppLayout.jsx) `ICONS` — thêm import nếu icon mới.

**9. Test trên mockup**: `npm run dev:mockup` → http://localhost:3000/coupon → verify list/add/edit/delete chạy đúng UX.

**10. BE C# (CHỈ khi user yêu cầu)** — xem [docs/standard-api-patterns.md](docs/standard-api-patterns.md) cho naming:
- Controller `UmeApi/Controllers/Version2/CouponController.cs` route `api/v2/coupon/[action]`
- Service `UmeBLL/Services/CouponV2Service.cs` + interface
- Repository `UmeDAL/Repositories/CouponV2Repository.cs` + interface — Dapper raw query
- DTO `umee-model/UBond/CouponV2/CouponV2Dtos.cs` — nhớ add vào `umee-model.csproj` `<Compile Include>`
- DI registration trong `UmeApi/Extensions/ServiceCollectionExtensions.cs`
- Build verify: `dotnet build UmeApi/UME.Bond.API.csproj`
- Bảng SQL: tạo `_v2` nếu chưa có (xem Quy tắc 4)

### Sample workflow đã có

[contracts/features/01-bond-list/](contracts/features/01-bond-list/) là sample đầy đủ. Khi tạo feature mới, **copy folder này** rồi rename + sửa entity name. 80% structure giống nhau.

## Auth chain

```
FE :3001 → Keycloak login (ksg-web-bond-client + PKCE)
       → access_token JWT
       → mọi request: Authorization: Bearer <jwt>
       → api-server :4002 proxy pass-through Authorization
       → C# UmeApi :3091 validate JWT qua Jwt:Authority
       → controller [Authorize] pass
```

## Quick troubleshooting

| Triệu chứng | Nguyên nhân thường gặp |
|---|---|
| FE white screen lúc bootstrap | `loadRuntime()` fail — check `public/config/runtime.json` parse OK |
| API 401 từ C# | JWT hết hạn / Keycloak SSO session không có client → clear localStorage + relogin |
| Swagger không hiện endpoint V2 | Thiếu `endpoints.MapControllers()` trong Startup.cs |
| Build C# fail "type không tồn tại" | DTO class chưa add vào csproj `<Compile Include>` (umee-model dùng explicit include) |
| Lookup gọi 2 lần trong dev | React StrictMode — bình thường. Prod chỉ 1 lần. Cache đã giảm trùng |
| Refresh token 400 "Session doesn't have required client" | SSO session lập bởi client khác (vd Swagger backend-client) → clear cookie + relogin từ FE |

## Repo links

- **Mockup repo**: https://github.com/giamanh93/bond-mockup-cms (branch `develop`)
- **BE C# repo**: `f:\unicloud\API sunshine\umee-bond` (nội bộ, không trên GitHub này)
- **Keycloak**: https://idp-dev.unicloudgroup.com.vn
- **SQL Server**: `10.60.1.153/dbKsgBond` (nội bộ)
