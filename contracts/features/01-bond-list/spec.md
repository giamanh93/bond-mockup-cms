---
feature_id: 01-bond-list
title: Danh sách trái phiếu
module: bond
entity: Bond
status: mockup-done
mockup_owner: ai-claude
mockup_done_at: 2026-05-30T15:00
api_owner: null
api_done_at: null
qa_done_at: null
jira: null
---

# Danh sách trái phiếu

## Mục đích
Trang quản lý danh sách trái phiếu phát hành. Hỗ trợ:
- Xem danh sách (grid với phân trang, search free-text)
- Bộ lọc nâng cao (theo loại TP, đơn vị phát hành, khoảng ngày phát hành, trạng thái)
- Thêm/sửa/xem chi tiết (drawer với DynamicForm)
- Auto-save khi đổi `isSpecial` field (vd: chọn `issuerId` → fill `taxCode`, `address`)

## Endpoints

| Method | Path | File mock | Mô tả |
|---|---|---|---|
| GET | `/api/v2/bond/GetBondFilter` | `filter-config.json` | Schema bộ lọc nâng cao |
| GET | `/api/v2/bond/GetBondPage` | `page-config.json` | Grid columns + data rows |
| GET | `/api/v2/bond/GetBondInfo` | `info-add.json` | Form trống (thêm mới) |
| GET | `/api/v2/bond/GetBondInfo?Oid=<X>` | `info-edit.json` | Form đã fill (sửa) |
| POST | `/api/v2/bond/SetBondInfoDraft?changed=<field>` | (mock-server echo) | Recalc fields phụ thuộc |
| POST | `/api/v2/bond/SetBondInfo` | (mock-server echo) | Lưu final |

## Field special (trigger draft)

| Field | Khi đổi → ảnh hưởng |
|---|---|
| `bondTypeId` | Đổi rule lãi suất (interestRate `isDisable` tùy loại) |
| `issuerId` | Auto fill `taxCode`, `address` từ master đơn vị phát hành |

## Form layout

| Group | Field | Type | Class | Special? | Required? |
|---|---|---|---|---|---|
| info | `bondCode` | input | col-3 | | ✅ |
| info | `bondName` | input | col-6 | | ✅ |
| info | `bondTypeId` | dropdown | col-3 | ✅ | ✅ |
| info | `issuerId` | autocomplete | col-6 | ✅ | ✅ |
| info | `taxCode` | input | col-3 | | (auto-fill) |
| info | `address` | input | col-12 | | (auto-fill) |
| financial | `faceValue` | number | col-3 | | ✅ |
| financial | `interestRate` | number | col-3 | | ✅ |
| financial | `couponFreq` | dropdown | col-3 | | ✅ |
| financial | `issueDate` | datepicker | col-3 | | ✅ |
| financial | `maturityDate` | datepicker | col-3 | | ✅ |
| financial | `status` | dropdown | col-3 | | ✅ |
