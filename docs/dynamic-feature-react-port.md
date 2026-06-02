# Logic chung cho 1 feature CRUD động (Page + Filter + Info + Draft)

> Tài liệu này tổng hợp **business logic + data flow + API contract** của 1 feature CRUD động (vd. Xe cư dân, Tài khoản ngân hàng, Tòa nhà…) để port sang React. Logic ở đây framework-agnostic — phần Vue chỉ là tham chiếu canonical.
>
> **Canonical reference Vue:** [src/pages/VehiclesPage.vue](../src/pages/VehiclesPage.vue) (Xe cư dân) — đầy đủ 4 API + advanced filter popover + DynamicForm drawer.

---

## 0. Mục lục

1. [Quan hệ giữa 4 API](#1-quan-hệ-giữa-4-api)
2. [Envelope chung + helpers](#2-envelope-chung--helpers)
3. [API Page (list grid)](#3-api-page-list-grid)
4. [API Filter (advanced filter popover)](#4-api-filter-advanced-filter-popover)
5. [API Info (DynamicForm config)](#5-api-info-dynamicform-config)
6. [API Draft (partial update khi field isSpecial change)](#6-api-draft-partial-update-khi-field-isspecial-change)
7. [URL query handling cho `columnObject`](#7-url-query-handling-cho-columnobject)
8. [DynamicTable contract](#8-dynamictable-contract)
9. [DynamicForm contract](#9-dynamicform-contract)
10. [Interceptors cần làm](#10-interceptors-cần-làm)
11. [Checklist port React](#11-checklist-port-react)

---

## 1. Quan hệ giữa 4 API

```
┌──────────────┐
│  Page route  │ (vd. /vehicles)
└──────┬───────┘
       │
       ▼
   ┌────────┐ load on mount        ┌──────────────┐
   │  Page  │ ◄──────────────────► │ GetXxxPage   │  cột (gridflexs) + rows + total
   └────┬───┘                      └──────────────┘
        │ click icon "Lọc"
        ▼
   ┌────────┐ load lần đầu          ┌──────────────┐
   │ Filter │ ◄──────────────────► │ GetXxxFilter │  schema filter form
   └────┬───┘                      └──────────────┘
        │ apply → spread filterValues vào params của GetXxxPage
        ▼  (page reload)

   click "Thêm" / "Sửa" / row
        │
        ▼
   ┌────────┐ load form             ┌──────────────┐
   │ Drwr   │ ◄──────────────────► │ GetXxxInfo   │  schema form, có/không Oid
   └────┬───┘                      └──────────────┘
        │ user đổi field isSpecial=1
        ▼
   ┌────────┐ partial reload        ┌─────────────────┐
   │ Drwr   │ ◄──────────────────► │ SetXxxInfoDraft │  BE recalc fields, options, visibility
   └────┬───┘                      └─────────────────┘
        │ click Lưu
        ▼
        ┌──────────────┐
        │ SetXxxInfo   │  → close drawer + reload Page
        └──────────────┘
```

---

## 2. Envelope chung + helpers

BE thường trả 2 convention envelope. FE phải hỗ trợ cả 2:

```ts
type Envelope<T = unknown> = {
  // Convention A (camelCase)
  status?: 'success' | 'error' | string
  message?: string
  data?: T
  success?: boolean

  // Convention B (PascalCase, vd. setting-bank-account)
  Status?: 200 | string
  Message?: string
  Data?: T

  // Common
  statusCode?: number
  result?: number
  error?: string[] | string | null
}
```

### Helpers

```ts
function isOk(res: Envelope): boolean {
  const s = String(res.status ?? '').toLowerCase()
  if (s === 'success') return true
  if (res.success === true) return true
  if (typeof res.Status === 'number' && res.Status >= 200 && res.Status < 300) return true
  if (typeof res.Status === 'string' && res.Status.toLowerCase() === 'success') return true
  return false
}

function pickMessage(res: Envelope, fallback: string): string {
  const a = typeof res.message === 'string' ? res.message.trim() : ''
  if (a) return a
  const b = typeof res.Message === 'string' ? res.Message.trim() : ''
  if (b) return b
  return fallback
}

function pickData<T>(res: Envelope<T>): T | undefined {
  return res.data ?? res.Data
}
```

### Error handling chuẩn (axios catch)

```ts
try {
  const res = await xxxService.getXxxPage(params)
  if (!isOk(res)) {
    toast.error(pickMessage(res, t('xxx.loadError')))
    return
  }
  // success branch
} catch (e: unknown) {
  const data = (e as { response?: { data?: { message?: string; Message?: string } } })?.response?.data
  const msg = data?.message?.trim() || data?.Message?.trim() || (e as Error).message || t('common.tryAgain')
  toast.error(msg)
}
```

---

## 3. API Page (list grid)

### Endpoint
`GET /api/v2/<module>/Get<Entity>Page`

### Request params (query)

| Name | Type | Required | Default | Mô tả |
|---|---|---|---|---|
| `filter` | string | – | `''` | free-text search |
| `offSet` | number | ✓ | 0 | vị trí bắt đầu (0-based) |
| `pageSize` | number | ✓ | 10–15 | số bản ghi/trang |
| `gridWidth` | number | – | 0 | width grid FE (optional) |
| `isActive` | number | – | -1 | -1=all, 1=active, 0=inactive (tuỳ module) |
| `ProjectCd` | string | – | auto | inject từ project store interceptor |
| `...filterValues` | any | – | – | spread từ API Filter values |

### Response shape

```ts
{
  status: 'success',
  data: {
    recordsTotal: number,
    recordsFiltered?: number,
    gridKey?: string,                  // vd. "view_bank_account_page"
    valid?: boolean,
    configs?: GridColumn[],            // hoặc gridflexs
    data?: Row[],                      // hoặc dataList
  }
}
```

> ⚠️ BE có 2 naming convention:
> - **Convention 1** (đa số): `gridflexs` + `dataList`
> - **Convention 2** (setting-bank-account, settings-elevator): `configs` + `data`
>
> FE nên check cả 2: `data?.gridflexs ?? data?.configs` và `data?.dataList ?? data?.data`.

### Column shape (gridflexs)

```ts
type GridColumn = {
  columnField: string         // vd. "accountNum" — key map vào row
  columnCaption: string       // vd. "SỐ TÀI KHOẢN" — header label
  columnWidth: number         // px
  fieldType:
    | 'text' | 'number' | 'date' | 'datetime'
    | 'html'                   // render qua v-html (status badge)
    | 'image' | 'link' | 'boolean'
  isStatusLable: boolean      // true → field này là status badge
  pinned: 'left' | 'right' | null
  isHide: boolean
  isFilter: boolean           // có dùng làm filter inline trong header column không
  isMasterDetail: boolean
  ordinal: number             // thứ tự sort cột
  columnClass?: string
  cellClass?: string[]
  group_cd?: string | null    // grouping header (cột con của group)
  group_name?: string | null
  columnObject?: string | null
  children?: GridColumn[] | null
}
```

### Logic flow

```pseudo
state:
  tableLoading: bool
  columns: GridColumn[]              // populate từ BE; fallback defaultColumns nếu rỗng
  allData: Row[]
  pagination: { page=0, pageSize=10, total=0, totalPages=1 }
  searchQuery: string
  filterValues: Record<string, any>  // từ API Filter

loadPage():
  tableLoading = true
  try:
    offSet = pagination.page * pagination.pageSize
    params = {
      filter: searchQuery || '',
      offSet,
      pageSize: pagination.pageSize,
      ...filterValues,                // spread filter
      // isActive nếu module dùng
    }
    res = await GET <endpoint>(params)
    if isOk(res):
      data = pickData(res)
      cols = data?.gridflexs ?? data?.configs
      if Array.isArray(cols) && cols.length > 0:
        columns = cols                // CHỈ set khi BE trả; giữ cũ nếu rỗng
      list = data?.dataList ?? data?.data ?? []
      allData = list.map(item => ({
        ...item,
        id: item.Oid ?? item.oid ?? item.Id ?? `r-${Math.random()}`,
      }))
      pagination.total = data?.recordsTotal ?? 0
      pagination.totalPages = ceil(pagination.total / pagination.pageSize)
    else:
      toast.error(pickMessage(res, t('xxx.loadError')))
  catch (e):
    toast.error(extractAxiosMessage(e))
  finally:
    tableLoading = false

handlePageChange(page):
  pagination.page = page             // 0-based hoặc 1-based tùy component (xem mục 8)
  loadPage()

handlePageSizeChange(size):
  pagination.pageSize = size
  pagination.page = 0
  loadPage()

handleSearchChange(q):                 // debounce 350ms
  searchQuery = q
  debounce(() => {
    pagination.page = 0
    loadPage()
  }, 350)

handleSearchSubmit(q):                 // Enter
  searchQuery = q
  pagination.page = 0
  loadPage()                          // không debounce
```

### Sample request

```
GET /api/v2/setting-bank-account/GetBankAccountPage?offSet=0&pageSize=10&isActive=-1&ProjectCd=04
GET /api/v2/vehicleresident/GetVehiclePage?offSet=0&pageSize=15&filter=51K-123
```

---

## 4. API Filter (advanced filter popover)

### Endpoint
`GET /api/v2/<module>/Get<Entity>Filter`

### Response

Cùng shape với API Info — trả 1 DynamicForm structure (xem mục 5), nhưng dùng cho mode filter:

```ts
{
  status: 'success',
  data: {
    tableKey: 'xxx_filter',
    groupKey: 'xxx_filter_group',
    group_fields: Group[]              // các field dùng làm filter
  }
}
```

> Field render giống Info, nhưng khi pass vào `DynamicForm` cần set `isFilter=true` để:
> - Ẩn group title (`group_name`)
> - Ẩn dấu `*` required
> - Layout compact, không card wrapper
> - Mỗi dropdown có thêm option "Tất cả" (BE hoặc FE inject)

### Logic flow

```pseudo
state:
  filterFormData: DynamicFormSchema | null    // schema từ GetFilter
  filterValues: Record<string, any>           // dict đã apply
  advancedFilterLoading: bool
  filterPopoverRef: PopoverHandle
  filterFormRef: DynamicFormHandle

loadFilterData():                              // call 1 lần — cache lifetime page
  advancedFilterLoading = true
  res = await GET <endpoint>
  if isOk(res):
    filterFormData = pickData(res)
  advancedFilterLoading = false

openAdvancedFilter(event):
  filterPopoverRef.toggle(event)
  if !filterFormData:
    loadFilterData()                           // lazy load

applyAdvancedFilter():
  fd = filterFormRef.getFormData(true)         // { tableKey, groupKey, group_fields, fields: {field_name: value} }
  if fd?.fields:
    filterValues = { ...fd.fields }            // flat dict, key=field_name, value=columnValue
  hideFilterPopover()
  pagination.page = 0
  loadPage()                                   // params spread filterValues

handleFilterReset():
  filterFormRef.resetForm?.()
  filterValues = {}
  pagination.page = 0
  loadPage()
```

### Render filter popover (UI pattern, tham chiếu)

```html
<Popover ref="filterPopoverRef">
  <div style="width: 720px;">
    <header>{{ t('filter.title') }} <CloseBtn/></header>
    <body v-if="loading">…</body>
    <body v-else-if="filterFormData">
      <DynamicForm
        :responses="filterFormData"
        :isView="false"
        :showButtons="false"
        :isFilter="true"                       <!-- BẮT BUỘC -->
        ref="filterFormRef"
      />
    </body>
    <footer>
      <Button @click="handleFilterReset">Reset</Button>
      <Button variant="primary" @click="applyAdvancedFilter">Áp dụng</Button>
    </footer>
  </div>
</Popover>
```

---

## 5. API Info (DynamicForm config)

### Endpoint

```
GET /api/v2/<module>/Get<Entity>Info?Oid=<X>              # view / edit
GET /api/v2/<module>/Get<Entity>Info?cardOid=<X>          # scope theo entity khác
GET /api/v2/<module>/Get<Entity>Info?Oid=<X>&tableName=Y  # multi-table form
GET /api/v2/<module>/Get<Entity>Info                      # add mới (no param)
```

### Response

```ts
{
  status: 'success',
  data: DynamicFormSchema
}

type DynamicFormSchema = {
  Oid?: string                  // có nếu edit
  Id?: number
  tableKey: string              // vd. "bank_account_info"
  groupKey: string              // vd. "bank_account_info_group"
  group_fields: Group[]
  // các field meta khác BE thêm
}

type Group = {
  group_cd: string              // vd. "account_info"
  group_name: string            // vd. "Thông tin tài khoản"
  group_table?: string
  group_key?: string
  group_column?: string
  isGridEditor?: boolean
  expand?: boolean
  intOrder: number
  fields: Field[]
}

type Field = {
  // Identity
  field_name: string            // vd. "bankCode"
  data_type?: string            // vd. "string", "int", "guid"
  table_name?: string
  table_relation?: string

  // Display
  columnLabel: string           // vd. "Ngân hàng"
  columnLabelE?: string         // English
  columnType: ColumnType        // xem enum bên dưới
  columnValue: any              // current value
  columnDisplay?: string
  columnTooltip?: string
  columnClass?: string

  // Behavior flags (0/1 hoặc boolean)
  isRequire: 0 | 1
  isSpecial: 0 | 1              // ← BẮT BUỘC: true → trigger API Draft khi đổi
  isDisable: 0 | 1
  isVisiable: 0 | 1
  isEmpty: 0 | 1
  isIgnore: 0 | 1

  // Options / data source
  columnObject?: string         // URL endpoint cho dropdown/autocomplete options
                                //   - có thể chứa placeholder {fieldName} cho dependency
                                //   - có thể chứa sẵn ?filter=&otherParam=<value>

  // Constraints
  maxLength?: string
}

type ColumnType =
  // Text inputs
  | 'input' | 'textarea' | 'number' | 'richtext'

  // Selects
  | 'dropdown' | 'select'                 // single
  | 'selects'                             // multiple
  | 'autocomplete' | 'autocompletes'      // single / multi
  | 'selectTree' | 'selectTrees'

  // Date/time
  | 'datepicker' | 'datetime' | 'datefulltime' | 'datetimes'

  // Boolean
  | 'checkbox' | 'radio'

  // File
  | 'file' | 'files' | 'image'

  // Layout / readonly
  | 'label' | 'hidden'
```

### Logic flow

```pseudo
state:
  formData: DynamicFormSchema | null
  formLoading: bool
  formLoadError: string
  formKey: number                // bump để force re-render khi schema đổi

loadForm(oid?):
  formLoading = true
  formData = null
  try:
    params = oid ? { Oid: oid } : {}
    res = await GET <endpoint>(params)
    if isOk(res):
      formData = pickData(res)
      formKey += 1
    else:
      formLoadError = pickMessage(res, t('xxx.cannotLoad'))
  catch (e):
    formLoadError = extractAxiosMessage(e)
  finally:
    formLoading = false
```

### Render field theo `columnType`

```pseudo
renderField(field):
  if field.isVisiable === 0: return null
  disabled = isView || field.isDisable === 1
  required = field.isRequire === 1

  switch field.columnType:

    case 'input' | 'textarea' | 'number' | 'richtext':
      <Input
        v-model="field.columnValue"
        :type="mapType(field.columnType)"
        :maxlength="field.maxLength"
        :disabled
        :required
      />
      onChange: handleFieldChange(field)

    case 'dropdown' | 'select' | 'selects':
      onFocus: ensureOptionsLoaded(field)           // lazy fetch nếu cache miss
      onShow: normalizeFieldValue(field)            // case-insensitive match
      <Select
        v-model="field.columnValue"
        :options="getOptions(field)"
        optionLabel="label"
        optionValue="value"
        :multiple="columnType === 'selects'"
        :disabled
      />
      onChange: handleFieldChange(field)

    case 'autocomplete' | 'autocompletes':
      <AutoComplete
        v-model="field.columnValue"
        :suggestions="autocompleteSuggestions[key]"
        @complete="searchAutocompleteOptions(field, $event.query)"  // debounced API call
      />
      onMount nếu có columnValue: fetchAutocompleteOptionByValue(field)

    case 'selectTree' | 'selectTrees':
      <SelectTree :data="treeOptionsCache[key]" :multiple="columnType === 'selectTrees'" />

    case 'datepicker' | 'datetime' | 'datefulltime':
      <DatePicker v-model="field.columnValue" :showTime="includes time" />

    case 'checkbox':
      <Checkbox v-model="field.columnValue" />

    case 'file' | 'files' | 'image':
      // GET preview: api(field.columnObject) → blob URL
      // POST upload: → set field.columnValue
      // Một số case columnObject có placeholder parentOid={groupFileId}

    default:
      <Input v-model="field.columnValue" disabled />  // fallback safe
```

### `handleFieldChange(field)` — handler chung

```pseudo
handleFieldChange(field):
  // 1. Re-evaluate dependent fields (ẩn/hiện)
  evaluateConditions()

  // 2. Nếu là isSpecial → trigger API Draft
  if field.isSpecial === 1:
    emit callbackReload({
      forms: { group_fields: formData.group_fields },
      changed: field.field_name,
    })
```

### Save (API SetInfo)

```
POST /api/v2/<module>/Set<Entity>Info
Body: {
  ...formData,                            // echo full state
  tableKey, groupKey,
  group_fields,                           // updated group_fields
  Oid?: currentOid,                       // có nếu edit
}
```

```pseudo
handleSave():
  validation = dynamicFormRef.validateForm()
  if !validation.isValid:
    toast.warn(validation.errorFields.join(', '))
    return
  fd = dynamicFormRef.getFormData(true)
  body = {
    ...formData,
    tableKey: fd.tableKey ?? formData.tableKey,
    groupKey: fd.groupKey ?? formData.groupKey,
    group_fields: fd.group_fields,
  }
  if currentOid: body.Oid = currentOid

  saveLoading = true
  try:
    res = await POST <endpoint>(body)
    if isOk(res):
      toast.success(pickMessage(res, t('xxx.saveSuccess')))
      closeDialog()
      await loadPage()                    // reload list
    else:
      toast.error(pickMessage(res, t('xxx.saveError')))
  catch (e):
    toast.error(extractAxiosMessage(e))
  finally:
    saveLoading = false
```

### Delete (API DeleteInfo / DelInfo)

```
DELETE /api/v2/<module>/Del<Entity>Info?Oid=<X>
DELETE /api/v2/<module>/Delete<Entity>?Oid=<X>&id=<Y>     (1 trong 2 param)
```

```pseudo
handleDelete(row):
  oid = row.Oid ?? row.oid
  if !oid:
    toast.error(t('xxx.missingId'))
    return
  confirm(t('xxx.deleteConfirm', { name: row.someLabel }), async () => {
    res = await DELETE <endpoint>(?Oid=oid)
    if isOk(res):
      toast.success(pickMessage(res, t('xxx.deleteSuccess')))
      await loadPage()
    else:
      toast.error(pickMessage(res, t('xxx.deleteError')))
  })
```

---

## 6. API Draft (partial update khi field isSpecial change)

### Endpoint

```
POST /api/v2/<module>/Set<Entity>InfoDraft?changed=<field_name>
```

> Query param `changed` báo BE biết field nào vừa đổi để recalculate đúng dependent fields.

### Trigger

DynamicForm phát event `callbackReload` khi user đổi 1 field có `isSpecial=1`.

Event payload (Vue convention):

```ts
type CallbackReloadEvent = {
  forms?: { group_fields: Group[] }       // newer convention
  group_fields?: Group[]                   // older convention
  changed?: string                         // field_name vừa đổi
}
```

### Request body

```ts
{
  ...currentFormData,                      // echo full schema cũ (cho an toàn)
  group_fields: event.forms?.group_fields ?? event.group_fields,
  Oid?: currentOid,
  // các identity khác (cardOid, ProjectCd auto inject từ interceptor)
}
```

Query: `?changed=<event.changed>`

### Response

Trả về **full new formData** sau khi BE recalculate:

- Có thể đổi `columnValue` của các field phụ thuộc
- Có thể đổi `isVisiable` / `isDisable` / `isRequire` của field nào đó
- Có thể đổi `columnObject` URL của field phụ thuộc (vd. district sau khi đổi province)
- Có thể clear options của field autocomplete phụ thuộc

### Logic flow

```pseudo
handleCallbackReload(event):
  if !formData: return
  try:
    body = {
      ...formData,
      group_fields: event.forms?.group_fields ?? event.group_fields ?? formData.group_fields,
    }
    if currentOid: body.Oid = currentOid

    options = { changed: event.changed }   // optional
    res = await POST <endpoint>(body, params: { changed: options.changed })

    if isOk(res):
      newData = pickData(res)
      if newData:
        formData = newData                 // REPLACE toàn bộ
        formKey += 1                       // bump để force remount DynamicForm
        // optional: clear options cache cho field phụ thuộc đã đổi
    else:
      toast.error(pickMessage(res, t('xxx.draftError')))
  catch (e):
    toast.error(extractAxiosMessage(e))
```

### Helper utility

```ts
// Build query string từ event
function draftChangedParams(changed?: string): Record<string, string> {
  return changed ? { changed } : {}
}

// Extract changed từ event
function draftOptionsFromCallback(event: CallbackReloadEvent): { changed?: string } {
  return event.changed ? { changed: event.changed } : {}
}
```

---

## 7. URL query handling cho `columnObject`

`columnObject` là URL endpoint cho dropdown/autocomplete options. Cần xử lý 4 case:

### Case 1: Dependency placeholder

```
columnObject = "/api/v2/x/GetDistrictList?provinceOid={provinceOid}"
```

→ Replace `{provinceOid}` bằng value của field `provinceOid` hiện tại trong form trước khi gọi:

```pseudo
matches = url.match(/\{(\w+)\}/g)
for match in matches:
  fieldName = match.replace(/[{}]/g, '')
  dependentField = findFieldByName(fieldName)
  url = url.replace(match, dependentField?.columnValue ?? '')
```

### Case 2: URL pre-baked param (vd. setting-bank-account)

BE có thể trả:

```
columnObject = "/api/v2/elevatorcard/GetElevatorCards?filter=&cardOid=de47082f-cbfd-4023-98c7-af0f2ab6bcd2"
```

→ BE đã embed value qua param `cardOid`. FE **KHÔNG được** append `filter=<columnValue>` để tránh trùng → BE đã có cách lookup.

### Case 3: User gõ search trong autocomplete

```pseudo
searchAutocompleteOptions(field, query):
  url = resolveDependencies(field.columnObject)
  url = setUrlQueryParam(url, 'filter', query)        // SET, không append
  // → dùng URLSearchParams.set() để tránh duplicate
  res = await GET url
  suggestions = normalize(res)
```

### Case 4: Initial fetch khi form đã có columnValue

```pseudo
fetchAutocompleteOptionByValue(field):
  value = field.columnValue
  url = resolveDependencies(field.columnObject)
  if urlHasParamValue(url, value):
    // URL đã embed value (vd. cardOid=<value>) → call as-is
    requestUrl = url
  else:
    // Legacy fallback
    requestUrl = setUrlQueryParam(url, 'filter', value)
  res = await GET requestUrl
  options = normalize(res)
  // Find option có .value === value để hiển thị label
```

### Helper utilities

```ts
const DUMMY_BASE = 'http://_'

/** Set / replace 1 query param trên URL (idempotent — không duplicate). */
function setUrlQueryParam(url: string, key: string, value: string): string {
  try {
    const u = new URL(url, DUMMY_BASE)
    u.searchParams.set(key, value)
    return u.pathname + (u.search || '')
  } catch {
    return url
  }
}

/** Kiểm tra URL đã có 1 query param nào mang value `value` chưa. */
function urlHasParamValue(url: string, value: string): boolean {
  if (!url || !value) return false
  try {
    const u = new URL(url, DUMMY_BASE)
    for (const v of u.searchParams.values()) {
      if (v === value) return true
    }
    return false
  } catch {
    return false
  }
}
```

### Normalize response options

BE trả nhiều shape khác nhau, normalize về `{ value, label, isHtml, htmlContent }`:

```pseudo
normalize(res):
  payload = res.data ?? res.Data ?? res
  // Bóc envelope
  if payload.status === 'success' && payload.data !== undefined: payload = payload.data
  if payload.Data !== undefined: payload = payload.Data

  if Array.isArray(payload):
    items = payload
  else if Array.isArray(payload?.data):
    items = payload.data
  else if Array.isArray(payload?.data?.data):
    items = payload.data.data
  else if Array.isArray(payload?.children):
    items = payload.children
  else: items = []

  return items.map(item => ({
    value: item.value ?? item.id ?? item.Oid ?? item.cd,
    label: item.label ?? item.name ?? item.text,
    isHtml: item.isHtml ?? false,
    htmlContent: item.isHtml ? (item.label ?? item.name ?? item.text) : null,
  }))
```

---

## 8. DynamicTable contract

### Props

```ts
{
  columns: GridColumn[]              // từ API gridflexs hoặc default
  data: Row[]
  loading: boolean
  config: {
    selectable?: boolean             // checkbox column
    showActions?: boolean            // ... column actions
    stickyHeader?: boolean
    striped?: boolean
    hover?: boolean
    showSearch?: boolean             // built-in search bar (thường false, page-level search ngoài)
    showPagination?: boolean
    showNumbering?: boolean          // # column STT
  }
  pagination: {
    page: number                     // ⚠️ convention page indexing (xem dưới)
    pageSize: number
    total: number
    totalPages: number
  }
}
```

### Events

```ts
{
  'page-change': (page: number) => void
  'page-size-change': (pageSize: number) => void
  'row-click': (row: Row) => void
  'selection-change': (selectedRows: Row[]) => void
  'sort-change': (sort: { field, order }) => void
  'action-click': (action: string, row: Row) => void
}
```

### Slots

```ts
{
  actions: void                                          // bulk actions bar
  'row-actions': ({ row }) => void                       // dropdown menu mỗi row
  'cell-<columnField>': ({ row, value }) => void         // custom cell render
}
```

### ⚠️ Pagination indexing convention

**Vue codebase hiện tại (lưu ý port React):**

- Component DynamicTable nội bộ **emit `page-change` với 1-based** page number
- VehiclesPage handler dùng `pagination.page = page` trực tiếp (có thể có bug off-by-one, xem code)
- Khuyến nghị React: **0-based internal**, convert ↔ 1-based ở UI layer

```ts
// React recommendation
const [pagination, setPagination] = useState({ page: 0, pageSize: 10, total: 0 })
const handlePageChange = (uiPage: number) => {
  setPagination(p => ({ ...p, page: uiPage - 1 }))   // 1-based → 0-based
  loadPage()
}
// offSet = pagination.page * pagination.pageSize  (đúng)
```

---

## 9. DynamicForm contract

### Props

```ts
{
  responses: DynamicFormSchema       // từ GetInfo / GetFilter
  isView: boolean                    // true → readonly mode
  showButtons: boolean               // hiện nút submit/cancel built-in (thường false vì host page cung cấp)
  isFilter?: boolean                 // true → mode filter (xem mục 4)
}
```

### Events

```ts
{
  'callbackReload': (event: {
    forms?: { group_fields: Group[] }
    group_fields?: Group[]
    changed?: string                 // field_name vừa đổi (isSpecial)
  }) => void

  'submit': (formData: any) => void  // nếu showButtons=true
}
```

### Exposed methods (ref API)

```ts
{
  validateForm(): { isValid: boolean; errorFields?: string[] }
  getFormData(includeAll?: boolean): {
    tableKey: string
    groupKey: string
    group_fields: Group[]                        // updated
    fields: Record<string, any>                  // flat dict {field_name: columnValue}
  } | null
  resetForm(): void
}
```

### Internal state

- `optionsCache: Record<fieldKey, Option[]>` — cache options cho dropdown/select (lazy load on focus/show)
- `autocompleteSuggestions: Record<fieldKey, Option[]>` — cache suggestions cho autocomplete
- `errors: Record<fieldKey, string>` — validation errors
- `fileBlobUrlsCache: Record<fieldKey, { url: string }>` — preview cho file/image

### Lazy load options pattern

```pseudo
ensureOptionsLoaded(field):                       // @focus
  if !field.columnObject: return
  key = getFieldKey(field)
  if optionsCache[key]?.length > 0: return        // cache hit
  fetchOptions(field)                              // background fetch

fetchOptions(field):
  url = resolveDependencies(field.columnObject)
  url = cleanupUrl(url)                            // remove trailing ?/&
  res = await GET url
  optionsCache[key] = normalize(res)
```

### Validation rule

- `isRequire === 1` AND `columnValue` null/empty/'' → error
- `data_type === 'int'` → check Number.isFinite
- `maxLength` → check string length
- Custom rules theo `data_type`

---

## 10. Interceptors cần làm

(Axios hoặc fetch wrapper, áp dụng cho mỗi service module)

```ts
// 1. Auth
config.headers.Authorization = `Bearer ${authStore.token}`
// auto refresh 401: try updateToken(30) once, retry original request, else logout

// 2. ProjectCd injection (nếu module scope theo project)
if (projectStore.selectedProjectCode) {
  if (config.method === 'GET' || config.method === 'DELETE') {
    config.params.ProjectCd = projectStore.selectedProjectCode
  } else if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
    config.data.ProjectCd ??= projectStore.selectedProjectCode
  }
}

// 3. Accept-Language theo locale FE
config.headers['Accept-Language'] = i18nStore.locale  // vd. 'vi-VN', 'en-US'

// 4. Content-Type
if (config.data instanceof FormData) {
  delete config.headers['Content-Type']  // browser tự set boundary
} else {
  config.headers['Content-Type'] ??= 'application/json'
}
```

---

## 11. Checklist port React

### Foundation

- [ ] Axios instance + interceptors (token, ProjectCd, lang, 401 retry)
- [ ] Envelope helpers: `isOk`, `pickMessage`, `pickData`
- [ ] URL query utils: `setUrlQueryParam`, `urlHasParamValue`
- [ ] Toast component (success / error / warn)
- [ ] i18n (vd. react-i18next) cho mọi message

### Shared components

- [ ] `<DynamicTable>` — nhận `gridflexs` columns + rows, render đúng `fieldType`
- [ ] `<DynamicForm>` — render switch theo `columnType`, hỗ trợ `columnObject` lazy fetch + dependency replace, emit `callbackReload`
- [ ] `<Popover>` (vd. radix-ui Popover) cho advanced filter
- [ ] `<FullScreenDrawer>` cho Add/Edit/View
- [ ] `<ConfirmDialog>` cho delete

### Per-feature module (vd. `services/<entity>.service.ts`)

```ts
const entityService = {
  getEntityPage(params)
  getEntityFilter()
  getEntityInfo(params?)        // no param = add mới
  setEntityInfoDraft(body, options?)  // POST + ?changed=<field>
  setEntityInfo(body)
  delEntity(params)
}
```

### Per-feature page state (custom hook)

```ts
function useEntityPage() {
  // Table
  const [tableLoading, setTableLoading] = useState(false)
  const [columns, setColumns] = useState<GridColumn[]>([])
  const [allData, setAllData] = useState<Row[]>([])
  const [pagination, setPagination] = useState({ page: 0, pageSize: 10, total: 0, totalPages: 1 })
  const [searchQuery, setSearchQuery] = useState('')

  // Filter
  const [filterFormData, setFilterFormData] = useState(null)
  const [filterValues, setFilterValues] = useState({})

  // Form drawer
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | 'view' | null>(null)
  const [currentOid, setCurrentOid] = useState<string | null>(null)
  const [formData, setFormData] = useState<DynamicFormSchema | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [saveLoading, setSaveLoading] = useState(false)

  // Methods
  return {
    // page
    loadPage, handlePageChange, handlePageSizeChange,
    handleSearchChange, handleSearchSubmit,
    // filter
    openAdvancedFilter, applyAdvancedFilter, handleFilterReset,
    // drawer
    handleAdd, handleView, handleEdit, handleDelete,
    handleCallbackReload, handleSave, closeDialog,
    // state
    ..._state,
  }
}
```

### Render hierarchy

```
<EntityPage>
  <PageHeader title search filter actions />
  <Popover>
    <AdvancedFilterForm />          ← DynamicForm isFilter
  </Popover>
  <DynamicTable
    columns data loading pagination
    onPageChange onPageSizeChange onRowClick
  />
  <Drawer open={dialogMode}>
    <DynamicForm
      key={formKey}
      responses={formData}
      isView={dialogMode === 'view'}
      onCallbackReload={handleCallbackReload}
      ref={formRef}
    />
    <DrawerFooter>
      <CancelBtn />
      <SaveBtn onClick={handleSave} />
    </DrawerFooter>
  </Drawer>
  <ConfirmDialog />
</EntityPage>
```

---

## 12. Tham chiếu Vue canonical

| Phần | File Vue |
|---|---|
| Page + Filter + Info + Save (full flow) | [VehiclesPage.vue](../src/pages/VehiclesPage.vue) |
| API Page với `configs` (bank account) | [GeneralSettingsBankAccountsTab.vue](../src/pages/settings/general/GeneralSettingsBankAccountsTab.vue) |
| Service + envelope hỗ trợ 2 convention | [settingBankAccount.service.ts](../src/services/settingBankAccount.service.ts) |
| Helper draft query | [src/utils/dynamicFormDraftQuery.ts](../src/utils/dynamicFormDraftQuery.ts) |
| URL query helpers | [src/utils/urlQuery.ts](../src/utils/urlQuery.ts) |
| DynamicForm component | [src/components/DynamicForm.vue](../src/components/DynamicForm.vue) |
| DynamicTable component | [src/components/DynamicTable.vue](../src/components/DynamicTable.vue) |
| Advanced filter popover pattern rule | [.claude/rules/filter-popover.md](../.claude/rules/filter-popover.md) |
| API envelope error toast rule | [.claude/rules/api.md](../.claude/rules/api.md) |
| Save button loading rule | [.claude/rules/save-button.md](../.claude/rules/save-button.md) |
