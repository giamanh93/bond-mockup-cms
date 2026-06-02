# Contracts — Source of Truth

Mọi quyết định kỹ thuật giữa Mockup team và Code team (FE + BE C#) đều bắt đầu từ thư mục này.

## Cấu trúc

```
contracts/
├── schemas/                  JSON Schema validate response shape
│   ├── envelope.schema.json          BaseResponse<T>
│   ├── grid-column.schema.json       1 item trong gridflexs
│   ├── data-page.schema.json         response GET /Page
│   ├── form-field.schema.json        1 field trong group_fields[].fields[]
│   ├── form-group.schema.json        1 group trong group_fields[]
│   └── dynamic-form-schema.schema.json  response GET /Info, /Filter, POST /InfoDraft
├── features/
│   └── <NN>-<feature-slug>/  1 chức năng = 1 folder
│       ├── spec.md                   tài liệu chức năng (frontmatter: owner, status)
│       ├── filter-config.json        mock response GetXxxFilter
│       ├── page-config.json          mock response GetXxxPage (include sample data)
│       ├── info-add.json             mock response GetXxxInfo (no Oid — thêm mới)
│       ├── info-edit.json            mock response GetXxxInfo (?Oid=xxx — sửa)
│       └── conversation.md           audit trail Q&A giữa AI và mockup member
└── api-routes.yaml           registry mọi endpoint + owner + status
```

## Tham chiếu spec

- [../docs/dynamic-feature-react-port.md](../docs/dynamic-feature-react-port.md) — logic 4 pattern (Page, Filter, Info, Draft)
- [../docs/standard-api-patterns.md](../docs/standard-api-patterns.md) — chuẩn 5 nhóm API + naming + SP
- [../docs/sys-config-list-form-spec.md](../docs/sys-config-list-form-spec.md) — schema 2 bảng config DB

## Quy tắc bất di bất dịch

1. **Không sửa code FE/BE tham chiếu path API không có trong [`api-routes.yaml`](./api-routes.yaml)**.
2. **Mỗi entry trong `api-routes.yaml` phải có file JSON sample tương ứng** trong `features/<id>/`.
3. **JSON sample phải pass `ajv validate`** với schema tương ứng → CI block PR nếu fail.
4. **Đổi schema = PR riêng**, version trong commit message.
5. **Feature folder phải có `spec.md`** với frontmatter (`owner`, `status`, `mockup_done_at`, `be_done_at`).
