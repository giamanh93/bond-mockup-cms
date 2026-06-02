# Chuẩn API & Data Response — Resident API

Tài liệu chuẩn cho 5 nhóm API cốt lõi của hệ thống: **Filter / Page / Field / Draft / Set** + naming convention từ DB lên Controller.

> **Nguồn DTO chuẩn**: `uni-common/UNI.Model/configModel.cs`, `viewModel.cs`, `BaseResponse.cs`
> **Envelope chung**: `BaseResponse<T>` cho mọi endpoint

---

## 1. Naming Convention (đặt tên theo chuẩn)

### 1.1 Quy ước tên module
- Tên module **camelCase** ở URL (`vehicleGuest`, `cardInternal`, `apartment`)
- Tên SP/Class/File theo **module hạt nhân** ở DB (`vehicle_partner`, `card_internal`, `apartment`)

### 1.2 Mapping 5 nhóm API ↔ SP ↔ Class

| Layer | Filter | Page | Field (load form) | Draft (auto-save) | Set (save final) |
|---|---|---|---|---|---|
| **Endpoint URL** | `GetXxxFilter` | `GetXxxPage` | `GetXxxInfo` | `SetXxxDraft` | `SetXxxInfo` |
| **HTTP method** | GET | GET | GET | POST | POST |
| **Stored Procedure** | `sp_res_<m>_filter` | `sp_res_<m>_page` | `sp_res_<m>_field` | `sp_res_<m>_draft` | `sp_res_<m>_set` |
| **Repository method** | `GetXxxFilterAsync` | `GetXxxPageAsync` | `GetXxxInfoAsync` | `SetXxxDraftAsync` | `SetXxxInfoAsync` |
| **Base repo helper** | `GetTableFilterAsync` / `GetFilterAsync` | `GetDataListPageAsync` | `GetFieldsAsync<T>` | `SetInfoAsync<T>` | `SetInfoAsync<T>` |
| **Response DTO** | `CommonViewInfo` | `CommonDataPage` | `CommonViewOidInfo` hoặc `XxxOidInfo` | (cùng Field) | `BaseValidate` / `string` |

### 1.3 Quy tắc đặt tên SP / column
- SP prefix: `sp_res_` (Resident) + module + action
- Tên SP **snake_case** lowercase, ngắt theo `_`
- Field name trong `sys_config_form` / `sys_config_list` → **giữ nguyên** alias mà FE expect (camelCase)
- Column alias trong SELECT phải khớp với `columnField` / `field_name` config

### 1.4 File path
```
UNI.RESIDENT.API/Controllers/Version2/<Module>/XxxController.cs
UNI.Resident.BLL/Interfaces/<Module>/IXxxService.cs
UNI.Resident.BLL/Services/<Module>/XxxService.cs
UNI.Resident.DAL/Interfaces/<Module>/IXxxRepository.cs
UNI.Resident.DAL/Repositories/<Module>/XxxRepository.cs
UNI.Resident.Model/<Module>/XxxOidInfo.cs
dbSHome/dbo/Stored Procedures/Resident/<Module>/sp_res_<m>_<action>.sql
dbSHome/scripts/deploy_<m>_<action>_config.sql
```

---

## 2. Envelope chung — `BaseResponse<T>`

Mọi response BE đều bọc trong:

```json
{
  "StatusCode": 200,
  "Result": 1,            // 1 = success, 0 = error
  "Status": "success",
  "Message": "...",
  "Data": { ... },        // payload chính, kiểu T
  "Error": null
}
```

| Field | Mô tả |
|---|---|
| `Result` | `1` = thành công, `0` = lỗi (FE check `Result === 1`) |
| `Message` | Toast message hiển thị cho user |
| `Data` | Payload theo từng API |

---

## 3. API Filter — `GET /api/v2/<m>/GetXxxFilter`

### 3.1 Mục đích
Trả về **metadata các field** trên modal bộ lọc (Dropdown, Date range, MultiSelect…). FE render form lọc động theo config trong DB.

### 3.2 Response: `CommonViewInfo` (kế thừa `viewBaseInfo`)
```json
{
  "Data": {
    "tableKey": "vehicle_guest_filter",
    "groupKey": "common_group",
    "draftPath": null,
    "submitPath": null,
    "group_fields": [
      {
        "group_key": "common_group",
        "group_cd": "info",
        "group_name": "Thông tin",
        "group_column": "col-12",
        "fields": [
          {
            "field_name": "PartnerId",
            "columnLabel": "Đối tác",
            "columnValue": null,
            "columnType": "dropdown",
            "columnClass": "col-12",
            "columnObject": "{\"sp\":\"sp_partner_list\"}",
            "data_type": "uniqueidentifier",
            "ordinal": 1,
            "isRequire": false,
            "isVisiable": true,
            "isDisable": false,
            "isSpecial": false
          }
        ]
      }
    ]
  }
}
```

### 3.3 Thuộc tính field quan trọng
| Field | Mô tả |
|---|---|
| `columnType` | `dropdown` / `text` / `number` / `date` / `checkbox` / `files` / `image` / `autoComplete` / `html` |
| `columnClass` | Grid bootstrap: `col-12` / `col-6` / `col-4` / `col-3` / `col-2` |
| `columnObject` | JSON config: endpoint dropdown, validate rule, badge class… |
| `isSpecial` | `true` = field gây trigger reload field con (parent của chained dropdown) |
| `isRequire` / `isDisable` / `isVisiable` | Tính realtime theo state |
| `data_type` | Kiểu DB (`nvarchar`, `uniqueidentifier`, `bit`, `int`, `datetime`) |

### 3.4 SP pattern
```sql
CREATE PROCEDURE [dbo].[sp_res_<m>_filter]
    @userId UNIQUEIDENTIFIER = NULL,
    @acceptLanguage NVARCHAR(50) = N'vi-VN',
    @tenant_id UNIQUEIDENTIFIER = NULL
AS
BEGIN TRY
    DECLARE @tableKey NVARCHAR(200) = N'<m>_filter';

    -- RS1: info
    SELECT id = NULL, tableKey = @tableKey, groupKey = N'common_group';

    -- RS2: groups
    SELECT group_key='common_group', group_cd='info', group_name=N'Thông tin',
           group_column='col-12', intOrder=1, key_group=NULL;

    -- RS3: fields theo config
    SELECT a.* FROM dbo.fn_config_form_gets(@tableKey, @acceptLanguage) a
    WHERE a.isVisiable = 1 OR a.isRequire = 1
    ORDER BY a.ordinal;
END TRY
BEGIN CATCH ... END CATCH
```

---

## 4. API Page — `GET /api/v2/<m>/GetXxxPage?offSet=0&pageSize=15&...`

### 4.1 Mục đích
Trả **dữ liệu grid phân trang** + **config cột hiển thị** (lần đầu load).

### 4.2 Response: `CommonDataPage` (kế thừa `viewDataPage<object>`)
```json
{
  "Data": {
    "recordsTotal": 123,
    "recordsFiltered": 123,
    "gridKey": "view_vehicle_guest_page",
    "gridType": 0,
    "sourceId": null,
    "gridflexs": [
      {
        "columnField": "cardCd",
        "columnCaption": "Mã thẻ",
        "ordinal": 1,
        "isHide": false,
        "fieldType": "text",
        "columnWidth": 120,
        "cellClass": "border-right,d-flex,align-items-center",
        "conditionClass": "",
        "pinned": "",
        "isStatusLable": false,
        "columnObject": null
      }
      // ... các cột khác
    ],
    "dataList": [
      {
        "cardCd": "PV001",
        "ownerName": "Nguyễn Văn A",
        "partnerName": "Công ty Bảo vệ",
        "vehicleType": "Ô tô",
        "licensePlate": "30A-11111",
        "noPlate": false,
        "department": "Bảo vệ",
        "createdDate": "20/05/2026",
        "createdBy": "admin",
        "statusName": "<span class='...'>Hoạt động</span>",
        // utility fields (không hiển thị grid, dùng cho action):
        "oid": "guid",
        "custOid": "guid",
        "cardOid": "guid",
        "status": 1,
        "isLock": 0
      }
    ]
  }
}
```

### 4.3 SP pattern (3 result sets)
```sql
-- RS1: root
SELECT recordsTotal = @Total,
       recordsFiltered = @Total,
       gridKey = @GridKey,
       valid = 1;

-- RS2: grid config (CHỈ khi @Offset = 0 — tiết kiệm bandwidth)
IF @Offset = 0
BEGIN
    SELECT a.*, b.columnObject
    FROM dbo.fn_config_list_gets_lang(@GridKey, 0, @acceptLanguage) a
    LEFT JOIN sys_config_list b ON a.columnField = b.columnField AND b.view_grid = @GridKey
    ORDER BY a.ordinal;
END

-- RS3: data rows
SELECT ... AS oid,            -- utility
       ... AS cardCd,         -- display (khớp columnField config)
       ... AS statusName
FROM ...
WHERE ... AND offset @Offset rows fetch next @PageSize rows only;
```

### 4.4 Quy tắc field trong dataList
- **Display fields**: alias phải khớp `columnField` trong `sys_config_list`
- **Utility fields**: `oid`, `custOid`, `cardOid`, `status`, `isLock`… — dùng cho action button (sửa, khóa, xóa), không hiển thị nhưng phải có

---

## 5. API Field — `GET /api/v2/<m>/GetXxxInfo?Oid=...`

### 5.1 Mục đích
Load **form chi tiết** (thêm mới hoặc sửa) — trả metadata + value hiện tại.

### 5.2 Response: `CommonViewOidInfo` hoặc subclass có parent OID
```json
{
  "Data": {
    "Oid": "guid-of-record-or-null",
    "buildingOid": "guid-of-parent",   // chỉ có khi subclass
    "tableKey": "MAS_Building_Floor",
    "groupKey": "floor_form_group",
    "draftPath": null,
    "submitPath": null,
    "group_fields": [
      {
        "group_key": "floor_form_group",
        "group_cd": "floor_info",
        "group_name": "Thông tin tầng",
        "group_column": "col-12",
        "fields": [
          {
            "field_name": "FloorName",
            "columnLabel": "Tên tầng",
            "columnValue": "Tầng 5",
            "columnType": "text",
            "columnClass": "col-6",
            "data_type": "nvarchar",
            "isRequire": true,
            "isVisiable": true
          }
          // ...
        ]
      }
    ]
  }
}
```

### 5.3 Khi nào dùng `CommonViewOidInfo` vs subclass

| Trường hợp | DTO |
|---|---|
| Form đơn, chỉ có `Oid` ở root | `CommonViewOidInfo` |
| Form con cần biết parent (vd tầng cần `buildingOid`, xe đối tác cần `partnerOid`) | Subclass `XxxOidInfo : CommonViewOidInfo` thêm prop parent |

**Pattern model subclass**:
```csharp
public class BuildingFloorOidInfo : CommonViewOidInfo
{
    public Guid? buildingOid { get; set; }
}
```

### 5.4 SP pattern
```sql
CREATE PROCEDURE [dbo].[sp_res_<m>_field]
    @UserId UNIQUEIDENTIFIER = NULL,
    @acceptLanguage NVARCHAR(50) = N'vi-VN',
    @Oid UNIQUEIDENTIFIER = NULL,
    @buildingOid UNIQUEIDENTIFIER = NULL,    -- parent OID nếu cần
    @tenant_id UNIQUEIDENTIFIER = NULL
AS
BEGIN TRY
    -- Derive parent từ Oid khi sửa (FE chỉ gửi Oid)
    IF @buildingOid IS NULL AND @Oid IS NOT NULL
        SELECT TOP 1 @buildingOid = b.buildingOid
        FROM dbo.MAS_Building_Floor b WHERE b.oid = @Oid;

    -- RS1: root info (Oid + parent + tableKey)
    SELECT Oid = @Oid,
           buildingOid = @buildingOid,
           tableKey = N'MAS_Building_Floor',
           groupKey = N'floor_form_group';

    -- RS2: groups
    SELECT * FROM dbo.fn_get_field_group_lang(@groupKey, @acceptLanguage) ORDER BY intOrder;

    -- RS3: fields (CASE field_name WHEN ... THEN ...)
    SELECT a.id, a.field_name, a.columnLabel,
           columnValue = ISNULL(CASE a.field_name
               WHEN N'FloorName' THEN b.FloorName
               WHEN N'buildingOid' THEN CONVERT(NVARCHAR(50), b.buildingOid)
               -- ...
           END, a.columnDefault),
           a.columnClass, a.columnType, a.columnObject,
           a.isSpecial, a.isRequire, a.isDisable, a.isVisiable
    FROM dbo.fn_config_form_gets(@tableKey, @acceptLanguage) a
    LEFT JOIN #tempIn b ON 1 = 1
    WHERE a.isVisiable = 1 OR a.isRequire = 1
    ORDER BY a.ordinal;
END TRY
BEGIN CATCH ... END CATCH
```

---

## 6. API Draft — `POST /api/v2/<m>/SetXxxDraft`

### 6.1 Mục đích
**Auto-save khi user thay đổi field** (debounce 300ms FE) — BE recompute field phụ thuộc (vd chọn nhân viên → auto fill phòng ban / mã NV).

### 6.2 Request body
**Cùng schema với response `GetXxxInfo`** — FE giữ nguyên payload, chỉ update `columnValue` của field user vừa đổi.

### 6.3 Response: cùng schema `CommonViewOidInfo` / subclass
BE trả lại form với:
- `columnValue` các field phụ thuộc đã recompute
- `isDisable` / `isVisiable` / `isRequire` đã update theo state mới
- `Oid` mới (nếu tạo bản ghi nháp)

### 6.4 Pattern Repository
```csharp
public async Task<XxxOidInfo> SetXxxDraftAsync(XxxOidInfo info)
{
    const string sp = "sp_res_<m>_draft";
    return await SetInfoAsync<XxxOidInfo>(sp, info, p =>
    {
        p.Add("Oid", info.Oid);
        p.Add("buildingOid", info.buildingOid);  // parent root
        return p;
    }, null);
}
```

### 6.5 SP draft pattern
- SP nhận **từng field** làm param (`@FloorName NVARCHAR(255)`, `@FloorNumber INT`…)
- Tự gọi lại pipeline `_field` để trả lại form đầy đủ
- Có thể INSERT/UPDATE bản ghi nháp vào DB (nếu cần persist draft)

---

## 7. API Set — `POST /api/v2/<m>/SetXxxInfo`

### 7.1 Mục đích
**Lưu final** khi user bấm nút "Lưu". BE validate + persist DB.

### 7.2 Request body
Cùng schema `CommonViewOidInfo` / subclass.

### 7.3 Response
```json
{
  "Result": 1,
  "Message": "Cập nhật thành công",
  "Data": ""
}
```

Hoặc `BaseValidate`:
```json
{
  "Data": {
    "valid": true,
    "messages": "Thành công",
    "code": null,
    "id": "guid-of-new-record"
  }
}
```

### 7.4 Pattern Repository
```csharp
public async Task<BaseValidate> SetXxxInfoAsync(XxxOidInfo info)
{
    const string sp = "sp_res_<m>_set";
    return await SetInfoAsync(sp, info, new { info.Oid, info.buildingOid });
}
```

---

## 8. Các DTO khác thường dùng

### 8.1 `CommonValue` — dropdown item
```json
{
  "name": "Hoạt động",
  "value": "1",
  "icon_is": false,
  "icon": null,
  "isHtml": false
}
```

### 8.2 `BaseValidate` — kết quả validate / save
```json
{
  "valid": true,
  "messages": "Thành công",
  "code": null,
  "id": "guid-or-null",
  "StatusCode": 200,
  "work_st": 0
}
```

### 8.3 `CommonViewParentInfo` — form có parent OID generic
```csharp
public class CommonViewParentInfo : CommonViewOidInfo
{
    public Guid? parent_oid { get; set; }
}
```

---

## 9. Luồng tích hợp FE — drawer/modal chi tiết

```
[Mở drawer]                                  [User edit field]
     │                                              │
     ▼                                              ▼
┌────────────────┐                          ┌────────────────┐
│ GetXxxInfo     │                          │ SetXxxDraft    │
│ - Oid? (sửa)   │                          │ debounce 300ms │
│ - parent?      │                          │ body=form state│
│ (thêm mới)     │                          └───────┬────────┘
└───────┬────────┘                                  │
        │ resp.Data → form state                   │ resp.Data → merge
        ▼                                          │   columnValue
   render dynamic form                             │
        │                                          │
        └──────────────────────────────────────────┘
                              │
                              ▼ user bấm Lưu
                       ┌────────────────┐
                       │ SetXxxInfo     │
                       │ body=form final│
                       └───────┬────────┘
                               │ resp.Result === 1
                               ▼ → close + refresh list
```

---

## 10. Checklist khi thêm 1 module mới

- [ ] Tạo 5 SP: `_filter`, `_page`, `_field`, `_draft`, `_set`
- [ ] Insert config `sys_config_form` (`<m>_filter`, `<m>_form`) — đặt `view_type` đúng (0=form chính, 3=filter)
- [ ] Insert config `sys_config_list` (`view_<m>_page`) — `view_type=0`
- [ ] Tạo Repository + Interface (`UNI.Resident.DAL`)
- [ ] Tạo Service + Interface (`UNI.Resident.BLL`)
- [ ] Tạo Controller (`UNI.RESIDENT.API/Controllers/Version2/<Module>/`)
- [ ] Nếu form có parent OID → tạo `<M>OidInfo : CommonViewOidInfo`
- [ ] DI register Service / Repository ở `Startup.cs` / `Program.cs`
- [ ] Test 5 endpoint qua Postman/Swagger với token thật

---

## 11. Lưu ý FE khi ghép API

1. **Check `Result === 1`** trước khi đọc `Data` (không phải HTTP 200 là OK)
2. **Field type → component map**: `dropdown` → `<v-select>`, `date` → date-picker, `files` → uploader, `checkbox` → `<v-checkbox>`, `html` → `v-html`, `autoComplete` → search-select async
3. **Field `isSpecial=true`** → khi thay đổi phải gọi ngay `SetXxxDraft` không debounce
4. **`columnObject`** chứa endpoint/option JSON — parse và dùng để load dropdown/autocomplete
5. **`statusName`** thường là HTML string (`<span class="...">Hoạt động</span>`) → render `v-html`
6. **Root OID + parent OID** (vd `Oid`, `buildingOid`) phải giữ nguyên payload xuyên suốt flow để SetInfo bind đúng record cha
7. **Khi thêm mới**: gọi `GetXxxInfo` không truyền `Oid` (hoặc chỉ truyền parent) — BE trả form trống với `Oid = null`
