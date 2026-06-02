# Cấu hình `sys_config_list` & `sys_config_form` — Spec đầy đủ

Tài liệu chuẩn cho 2 bảng config động điều khiển UI grid + form. Mọi quyết định về **hiển thị / thứ tự / kiểu / class / behavior** của field FE đều đọc từ đây.

> **Liên quan**: [standard-api-patterns.md](./standard-api-patterns.md) — luồng API trả về dữ liệu.

---

## 1. `sys_config_list` — Cấu hình GRID (table list)

### 1.1 Khóa duy nhất
```
(view_grid, view_type, columnField)
```

### 1.2 Schema đầy đủ

| Column | Kiểu | Mô tả |
|---|---|---|
| `view_grid` | NVARCHAR(100) | Key grid, vd `view_vehicle_guest_page`, `view_resident_vehicle_page` |
| `view_type` | INT | `0` = grid chính. Phân biệt nhiều grid trong cùng key |
| `columnField` | NVARCHAR(100) | **Tên alias** mà SP trả về trong dataList (camelCase, phải khớp) |
| `columnCaption` | NVARCHAR(200) | Tiêu đề cột (tiếng Việt) |
| `columnCaptionE` | NVARCHAR(200) | Tiêu đề cột (English) |
| `data_type` | NVARCHAR(50) | `nvarchar` / `int` / `bit` / `date` / `uniqueidentifier` |
| `columnWidth` | INT | Độ rộng pixel mặc định |
| `fieldType` | NVARCHAR(50) | **Kiểu render** — xem mục 1.3 |
| `cellClass` | NVARCHAR(500) | Class CSS cell, phân cách dấu `,` — xem 1.4 |
| `conditionClass` | NVARCHAR(500) | Class điều kiện theo giá trị (ít dùng, status dùng `columnObject` |
| `pinned` | NVARCHAR(20) | `''` / `'left'` / `'right'` — sticky scroll ngang |
| `ordinal` | INT | Thứ tự cột (1, 2, 3, ...) |
| `isUsed` | BIT | `1` = đang dùng, `0` = không dùng |
| `isHide` | BIT | `1` = ẩn cột (vẫn trả data, vd field utility), `0` = hiện |
| `isMasterDetail` | BIT | `1` = cột master-detail (expand row) |
| `isStatusLable` | BIT | `1` = cột status, render badge theo `columnObject` JSON |
| `isFilter` | BIT | `1` = cho phép filter inline trên cột |
| `columnObject` | NVARCHAR(MAX) | JSON config phụ (badge mapping, dropdown source...) — xem 1.5 |

### 1.3 `fieldType` — Kiểu render trong cell

| Value | Render | Khi dùng |
|---|---|---|
| `text` | plain text | Cột chữ thường (tên, mã, code) |
| `number` | text right-align | **Số / tiền** (vd phí, số lượng) — **KHÔNG dùng `text`** |
| `date` | format `dd/MM/yyyy` | Ngày |
| `checkbox` | `<v-checkbox disabled>` | Bit field (vd `noPlate`, `isVehicle`) |
| `html` | `v-html` | Cột chứa HTML từ DB (vd `statusName` từ `s.StatusNameLable`) |
| `image` | `<img>` thumb | URL ảnh |
| `files` | link download | URL file đính kèm |
| `FileAttach` | icon đính kèm | Cột mở popup tệp đính kèm |

### 1.4 `cellClass` — Class CSS cell

**Default chuẩn**:
```
border-right,d-flex,align-items-center
```

**Tokens hợp lệ** (phân cách `,`):

| Token | Mô tả |
|---|---|
| `border-right` | Đường viền phải cell |
| `d-flex` | Flex container |
| `align-items-center` | Căn giữa dọc |
| `justify-content-center` | Căn giữa ngang (dùng cho checkbox) |
| `col-fixed` | **Không auto-expand** width (dùng cho text dài: fullName, description, note) — **KHÔNG dùng `fixed`** |

**Quy tắc áp dụng `col-fixed`**:
- ✅ Dùng cho: cột text dài có thể vượt khung (`fullName`, `description`, `note`, `address`)
- ❌ KHÔNG dùng cho: số / tiền (dùng `fieldType=number` thay vì col-fixed)

**Ví dụ checkbox cell**:
```
border-right,d-flex,align-items-center,justify-content-center
```

### 1.5 `columnObject` — JSON config phụ

#### 1.5.1 Status badge (khi `isStatusLable = 1`)
```json
[
  {"label":"Khởi tạo","badge":"bg-blue-500/10 dark:bg-blue-500/20","text":"text-blue-700 dark:text-blue-400","dot":"bg-blue-600 dark:bg-blue-500"},
  {"label":"Hoạt động","badge":"bg-green-500/10 dark:bg-green-500/20","text":"text-green-700 dark:text-green-400","dot":"bg-green-600 dark:bg-green-500"},
  {"label":"Quá hạn","badge":"bg-yellow-500/10 dark:bg-yellow-500/20","text":"text-yellow-700 dark:text-yellow-400","dot":"bg-yellow-600 dark:bg-yellow-500"},
  {"label":"Khóa","badge":"bg-red-500/10 dark:bg-red-500/20","text":"text-red-700 dark:text-red-400","dot":"bg-red-600 dark:bg-red-500"},
  {"label":"Chờ hủy","badge":"bg-orange-500/10 dark:bg-orange-500/20","text":"text-orange-700 dark:text-orange-400","dot":"bg-orange-600 dark:bg-orange-500"},
  {"label":"Hủy","badge":"bg-red-500/10 dark:bg-red-500/20","text":"text-red-700 dark:text-red-400","dot":"bg-red-600 dark:bg-red-500"}
]
```

**Match theo `label`** (giá trị `statusName` trả về phải khớp 1-1 với `label`).

**Bảng màu chuẩn**:

| Trạng thái | Màu | Khi dùng |
|---|---|---|
| Yêu cầu mở lại | `purple` | State request |
| Khởi tạo / Nháp | `blue` | Mới tạo, chưa active |
| Hoạt động / Hoàn thành | `green` | Đang chạy / OK |
| Quá hạn / Cảnh báo | `yellow` | Sắp hết / cần chú ý |
| Khóa / Hủy / Lỗi | `red` | Đóng / dừng |
| Chờ hủy / Pending | `orange` | Đang xử lý |

#### 1.5.2 Cách khác: SP trả HTML sẵn
Nếu DB đã lưu HTML trong cột (vd `MAS_VehicleStatus.StatusNameLable`), SP trả thẳng:
```sql
,s.StatusNameLable AS statusName
```
→ Config `fieldType = 'html'` + `isStatusLable = 1`, **không cần `columnObject`** (FE chỉ `v-html`).

### 1.6 Pattern UPSERT cho deploy script

```sql
SET NOCOUNT ON;
DECLARE @g NVARCHAR(100) = N'view_<m>_page';
DECLARE @vt INT = 0;

-- UPSERT từng cột
IF EXISTS (SELECT 1 FROM dbo.sys_config_list WHERE view_grid=@g AND view_type=@vt AND columnField=N'cardCd')
    UPDATE dbo.sys_config_list
    SET columnCaption=N'Mã thẻ', ordinal=1, isUsed=1, isHide=0, columnWidth=120, fieldType=N'text'
    WHERE view_grid=@g AND view_type=@vt AND columnField=N'cardCd';
ELSE
    INSERT INTO dbo.sys_config_list
        (view_grid,view_type,columnField,data_type,columnCaption,columnCaptionE,columnWidth,
         fieldType,cellClass,conditionClass,pinned,ordinal,isUsed,isHide,isMasterDetail,isStatusLable,isFilter)
    VALUES (@g,@vt,N'cardCd',N'nvarchar',N'Mã thẻ',N'Card Code',120,
            N'text',N'border-right,d-flex,align-items-center',N'',N'',1,1,0,0,0,0);

-- Cuối script: ẩn cột không trong spec
UPDATE dbo.sys_config_list SET isHide=1, isUsed=0
WHERE view_grid=@g AND view_type=@vt
  AND columnField NOT IN (N'cardCd', N'ownerName', N'...');

-- Verify
SELECT columnField, columnCaption, ordinal, isUsed, isHide, fieldType, columnWidth
FROM dbo.sys_config_list WHERE view_grid=@g ORDER BY isHide, ordinal;
```

### 1.7 Ví dụ thực tế — Xe đối tác (10 cột)

```
1   cardCd         Mã thẻ                text       120
2   ownerName      Chủ xe                text       200
3   partnerName    Đối tác               text       200
4   vehicleType    Loại xe               text       110
5   licensePlate   Biển số xe            text       120
6   noPlate        Không biển            checkbox    90  cellClass + justify-content-center
7   department     Phòng ban/Công ty     text       180
8   createdDate    Ngày tạo              text       150
9   createdBy      Người tạo             text       150
10  statusName     Trạng thái            text       130  isStatusLable=1, pinned='right'
```

---

## 2. `sys_config_form` — Cấu hình FORM (modal/drawer/filter)

### 2.1 Khóa duy nhất
```
(table_name, field_name, view_type)
```

### 2.2 Schema đầy đủ

| Column | Kiểu | Mô tả |
|---|---|---|
| `table_name` | NVARCHAR(200) | Key form, vd `partner_vehicle_card`, `apartment_filter`, `card_internal_form` |
| `field_name` | NVARCHAR(100) | **Tên alias** mà SP `_field`/`_draft` trả về (CASE WHEN khớp tên này) |
| `view_type` | INT | `0` = form chính, `2` = sub-form, `3` = filter form |
| `data_type` | NVARCHAR(50) | `nvarchar` / `int` / `bit` / `uniqueidentifier` / `datetime` |
| `ordinal` | INT | Thứ tự field trong form (1, 2, 3, ...) |
| `columnLabel` | NVARCHAR(200) | Label hiển thị |
| `columnLabelE` | NVARCHAR(200) | Label tiếng Anh |
| `group_cd` | NVARCHAR(50) | Mã group cha (vd `info`, `vehicle_info`, `floor_info`) |
| `columnDefault` | NVARCHAR(MAX) | Giá trị mặc định (hoặc value cố định cho field config-only) |
| `columnClass` | NVARCHAR(50) | Grid col, vd `col-12` / `col-6` / `col-4` / `col-3` / `col-2` — xem 2.4 |
| `columnType` | NVARCHAR(50) | Kiểu input — xem 2.3 |
| `columnObject` | NVARCHAR(MAX) | Endpoint/option JSON — xem 2.5 |
| `isSpecial` | BIT | `1` = parent của chained field (đổi value → reload field con) |
| `isRequire` | BIT | `1` = bắt buộc |
| `isDisable` | BIT | `1` = readonly |
| `isVisiable` | BIT | `1` = hiện. **`0` = ẩn hoàn toàn** |
| `isIgnore` | BIT | `1` = không gửi xuống BE khi save (display-only) |
| `IsEmpty` | BIT | `1` = cho phép empty |
| `columnTooltip` | NVARCHAR(500) | Tooltip hover |
| `columnDisplay` | NVARCHAR(200) | Field name khi map sang object payload (default = `field_name`) |

### 2.3 `columnType` — Kiểu input

| Value | Component | Khi dùng |
|---|---|---|
| `text` | `<input type=text>` | Text thường |
| `number` | `<input type=number>` | Số (số lượng, giá) |
| `date` | date-picker | Ngày |
| `dropdown` | `<v-select>` | Dropdown đơn (load từ `columnObject.sp`) |
| `multiSelect` | `<v-select multiple>` | Multi-select |
| `checkbox` | `<v-checkbox>` | Boolean |
| `autoComplete` | search-select async | **Tìm record từ master** (cardCd, mã NV, custId) — endpoint trong `columnObject` |
| `files` | uploader | Multi-file đính kèm |
| `image` | uploader 1 ảnh | Avatar / ảnh xe |
| `textarea` | `<textarea>` | Note dài |
| `html` | `<v-html>` | HTML readonly |

**Quy tắc chọn**:
- Field input để **tìm record từ master** → `autoComplete` + `columnObject` chứa search endpoint, **KHÔNG dùng `text`**
- Field **Trạng thái trong form chi tiết** → `dropdown` với GetObjectList từ `sys_config_data`, **KHÔNG dùng input/HTML badge** (badge chỉ ở grid list)
- Field tiền/số → `number`, **KHÔNG dùng `text`**

### 2.4 `columnClass` — Grid layout

**Chỉ accept**:
```
col-2   col-3   col-4   col-6   col-12
```

**KHÔNG dùng**:
- ❌ `col-md-*`, `col-sm-*`, `col-lg-*` (responsive Bootstrap) — FE DynamicForm không hỗ trợ
- ❌ `col-1`, `col-5`, `col-7`, ... (chỉ accept các giá trị trên)

**Quy tắc chọn** (đối chiếu mockup, KHÔNG mặc định col-3 đồng đều):

| Loại field | columnClass |
|---|---|
| Text ngắn (mã thẻ, code, biển số) | `col-3` |
| Text trung bình (tên người, tên đối tác) | `col-3` hoặc `col-6` |
| Text dài (fullName, địa chỉ, nơi cấp) | `col-6` |
| Textarea (note, mô tả) | `col-12` |
| Number / Date | `col-3` |
| Dropdown | tùy field — Trạng thái thường `col-3`, Loại tài khoản `col-6` |
| File/Image attachment | `col-12` |

**Dynamic theo điều kiện** (vd ô tô vs xe máy):
```sql
[columnClass] = CASE
    WHEN s.[columnClass] LIKE N'%col-12%' THEN s.[columnClass]  -- attachment giữ nguyên
    WHEN ISNULL(a.VehicleTypeId, 0) = 1   THEN N'col-2'         -- ô tô (8 field)
    ELSE N'col-3'                                                -- non-ô tô (9 field)
END
```

### 2.5 `columnObject` — JSON config phụ

#### 2.5.1 Dropdown source — gọi SP load options
```json
{
  "sp": "sp_res_partner_list",
  "params": {"projectCd": "@projectCd"}
}
```

#### 2.5.2 AutoComplete search
```json
{
  "sp": "sp_res_customer_search",
  "displayField": "fullName",
  "valueField": "custId"
}
```

#### 2.5.3 Files upload với `parentOid`
```
api/v2/files/upload?parentOid={uuid}
```

SP `_field` build động:
- **ImageUrl** (real DB column): `s.[columnObject] + '?parentOid=' + a.ImageUrl`
- **GroupFileId** (virtual, không có cột DB): `s.[columnObject] + '?parentOid=' + s.[columnDefault]`

**Lưu ý**: cả SP `_field` VÀ `_draft` phải build cùng pattern này.

#### 2.5.4 Validate rule
```json
{
  "minLength": 6,
  "maxLength": 20,
  "regex": "^[A-Z0-9]+$"
}
```

### 2.6 `isSpecial` — Parent của chained field

Set `isSpecial = 1` cho **MỌI** field cha mà việc đổi value ảnh hưởng tới field con (list/visibility/disable/value):

| Loại chain | Cần isSpecial=1 |
|---|---|
| **Dropdown cha → Dropdown con** (Tòa nhà → Tầng) | ✅ |
| **Checkbox toggle → Sub-fields hiện/ẩn** (AUTO_CLOSE, LAST_DAY) | ✅ |
| **AutoComplete → Auto-fill các field** (chọn nhân viên → fill mã NV/phòng ban) | ✅ |

Khi `isSpecial=1` thay đổi → FE phải gọi ngay `SetXxxDraft` **không debounce** để BE recompute pipeline.

### 2.7 Cleanup rule — XÓA thay vì isVisiable=0

**Quy tắc**:
- ❌ Field không dùng → **XÓA record** khỏi `sys_config_form`
- ✅ Chỉ giữ field hidden khi là **ID binding thực sự cần** (vd `cardOid`, `apartOid` ngầm trong form)

Lý do: `isVisiable = 0` để lại config rác → khó debug, tăng kích thước RS3, cản trở migrate.

### 2.8 Pattern UPSERT cho deploy script

```sql
SET NOCOUNT ON;
DECLARE @t NVARCHAR(200) = N'<m>_filter';

-- UPSERT
IF EXISTS (SELECT 1 FROM dbo.sys_config_form WHERE table_name=@t AND field_name=N'PartnerId')
    UPDATE dbo.sys_config_form
    SET columnLabel=N'Đối tác', ordinal=1, isVisiable=1,
        columnType=N'dropdown', columnClass=N'col-12'
    WHERE table_name=@t AND field_name=N'PartnerId';

-- Ẩn field không trong design
UPDATE dbo.sys_config_form
SET isVisiable = 0
WHERE table_name=@t AND field_name NOT IN (N'PartnerId', N'VehicleTypeId', N'Status');

-- Verify
SELECT field_name, columnLabel, view_type, ordinal, isVisiable, columnType, columnClass
FROM dbo.sys_config_form WHERE table_name=@t ORDER BY view_type, ordinal;
```

### 2.9 Ví dụ thực tế — Filter Căn hộ (9 field)

```
ordinal  field_name      Label                  columnType  columnClass
   1     buildingOid     Tòa nhà                dropdown    col-6
   2     floor           Tầng                   number      col-6
   3     apartmentType   Loại hình              dropdown    col-6
   4     receiveStatus   Trạng thái nhận nhà    dropdown    col-6
   5     forRent         Cho thuê               dropdown    col-6
   6     isTransfer      Chuyển nhượng          dropdown    col-6
   7     moveInDateFrom  Ngày nhận nhà từ       date        col-6
   8     moveInDateTo    Ngày nhận nhà đến      date        col-6
   9     hasDebt         Công nợ                dropdown    col-6
```

---

## 3. `view_type` — Phân loại form/grid

| view_type | Mục đích | Bảng |
|---|---|---|
| `0` | **Grid chính** / **Form chi tiết chính** | cả 2 |
| `2` | Sub-form / nested form | `sys_config_form` |
| `3` | **Filter form** (modal bộ lọc) | `sys_config_form` |

Khi viết deploy script: **luôn ghi rõ view_type** trong WHERE để không UPDATE nhầm sang form khác cùng `table_name`.

---

## 4. SQL gotchas đã gặp

### 4.1 CASE UUID + NVARCHAR thường — precedence trap
```sql
-- ❌ SAI: entire CASE infer UUID → string value fail convert
SELECT CASE a.field_name
    WHEN N'oid' THEN b.oid                              -- UNIQUEIDENTIFIER
    WHEN N'name' THEN b.name                            -- NVARCHAR — convert fail!
END

-- ✅ ĐÚNG: CONVERT về NVARCHAR
SELECT CASE a.field_name
    WHEN N'oid' THEN CONVERT(NVARCHAR(50), b.oid)
    WHEN N'name' THEN b.name
END
```

### 4.2 SP UUID/INT input từ FE phải NVARCHAR + TRY_CONVERT + NULLIF
```sql
-- SP nhận từ FE
@buildingOid NVARCHAR(50) = NULL,
@vehicleTypeId NVARCHAR(20) = NULL

-- Trong SP convert an toàn
DECLARE @vBuildingOid UNIQUEIDENTIFIER = TRY_CONVERT(UNIQUEIDENTIFIER, NULLIF(LTRIM(RTRIM(@buildingOid)), N''));
DECLARE @vVehicleTypeId INT = TRY_CONVERT(INT, NULLIF(LTRIM(RTRIM(@vehicleTypeId)), N''));
```

Lý do: FE có thể gửi `''`, `'null'`, `'undefined'` → trực tiếp CONVERT crash.

### 4.3 SP CREATE/ALTER phải có SET options
```sql
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO
CREATE OR ALTER PROCEDURE [dbo].[sp_res_xxx_field]
    ...
```

Không có 2 dòng này → lỗi khi UPDATE indexed view / computed column.

---

## 5. Checklist khi config 1 grid/form mới

### Grid (sys_config_list)
- [ ] Xác định `view_grid` (vd `view_<m>_page`) và `view_type = 0`
- [ ] Liệt kê cột theo design → ordinal, columnCaption, fieldType
- [ ] Cột Trạng thái: `isStatusLable = 1` + `columnObject` JSON badge hoặc SP trả HTML
- [ ] Cột Pinned right: cột status / actions
- [ ] Default `cellClass = 'border-right,d-flex,align-items-center'`
- [ ] Cột tiền/số → `fieldType = 'number'` (không phải `text`)
- [ ] Cột bit → `fieldType = 'checkbox'` + `justify-content-center`
- [ ] Ẩn cột rác qua `isHide=1, isUsed=0` (cuối script)
- [ ] SELECT verify cuối deploy script

### Form (sys_config_form)
- [ ] Xác định `table_name` + `view_type` (0/2/3)
- [ ] Đối chiếu mockup chọn `columnClass` (KHÔNG mặc định col-3 đồng đều)
- [ ] Set `isSpecial = 1` cho parent field của chained dropdown/checkbox
- [ ] Field input tìm master record → `autoComplete` (KHÔNG `text`)
- [ ] Field Trạng thái trong form → `dropdown` (KHÔNG HTML badge)
- [ ] `columnObject` files/image phải append `?parentOid=`
- [ ] Field không dùng → **XÓA** thay vì set `isVisiable=0`
- [ ] SELECT verify cuối deploy script

---

## 6. Live debug query

```sql
-- Grid config
SELECT columnField, columnCaption, ordinal, isUsed, isHide, fieldType, columnWidth,
       cellClass, pinned, isStatusLable, columnObject
FROM dbo.sys_config_list
WHERE view_grid = N'view_<m>_page' AND view_type = 0
ORDER BY isHide, ordinal;

-- Form config
SELECT field_name, columnLabel, view_type, ordinal, isVisiable, columnType, columnClass,
       isSpecial, isRequire, isDisable, columnObject
FROM dbo.sys_config_form
WHERE table_name = N'<m>_filter'
ORDER BY view_type, ordinal;
```

Chạy trực tiếp trên DB `10.60.1.153 / dbSHome` (user `uni_dev`) trước khi config để tránh đoán.
