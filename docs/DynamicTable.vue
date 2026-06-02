<template>
  <!-- Root: flex flex-col h-full min-h-0 overflow-hidden — chuỗi flex xuống scroll div cần min-h-0 (xem comment Table Container bên dưới) -->
  <div class="flex flex-col h-full min-h-0 overflow-hidden">
    <!-- Search & Actions Bar (shrink-0: không bị co) -->
    <div v-if="config.showSearch || $slots.actions" class="table-toolbar flex items-center justify-between gap-4 shrink-0">
      <!-- Search -->
      <div v-if="config.showSearch" class="flex-1 max-w-md">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-text" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Tìm kiếm..."
            class="w-full pl-10 pr-4 py-2 border border-border-gray rounded-lg focus:outline-none focus:ring-2 focus:ring-academy-green/20 focus:border-academy-green"
            @input="handleSearch"
          />
        </div>
      </div>

      <!-- Custom Actions Slot -->
      <div v-if="$slots.actions" class="flex items-center gap-2 ml-auto">
        <slot name="actions"></slot>
      </div>
    </div>

    <!--
      Table Container with horizontal scroll (đồng bộ BizzoneTable.tsx)
      ---------------------------------------------------------------
      Mục tiêu: Bảng luôn chiếm hết chiều cao vùng có thể, dù 1, 2 hay nhiều bản ghi (xem trong 1 khung hình).

      Cách xử lý:
      1. Parent wrapper bên dưới: flex-1 min-h-0 flex flex-col overflow-hidden
         → Chiếm hết chỗ còn lại, cho phép con co lại (min-h-0).
      2. Scroll div (tableWrapperRef): flex-1 min-h-0 + overflow-x-auto overflow-y-auto
         → flex-1: luôn giãn hết chiều cao còn lại (ít hay nhiều dòng đều cùng 1 khung).
         → min-h-0: cho phép div scroll co nhỏ hơn nội dung để overflow-y hoạt động.
      3. Pagination: shrink-0 → không bị co, luôn nằm sát dưới khung.

      Chuỗi flex từ page (ApartmentsPage) → card → ApartmentList wrapper → DynamicTable root → table wrapper → scroll div
      đều cần min-h-0 ở các flex child để chiều cao truyền xuống đúng.
    -->
    <div
      :class="
        cn(
          'flex-1 min-h-0 flex flex-col overflow-hidden border border-[var(--bz-table-border)] rounded-md shadow-sm bg-[var(--bz-surface)]',
          containerClass,
        )
      "
    >
      <!-- Scroll div: flex-1 min-h-0 để luôn chiếm hết vùng, scroll bên trong -->
      <div 
        ref="tableWrapperRef"
        class="overflow-x-auto overflow-y-auto modern-scrollbar modern-scrollbar-horizontal flex-1 min-h-0 bg-[var(--bz-surface)]"
      >
        <table 
          class="w-full"
          style="border-collapse: separate; border-spacing: 0; min-width: max-content;"
        >
          <!-- Table Header -->
          <thead 
            class="bg-[var(--bz-table-header)] sticky top-0"
            style="z-index: 40;"
          >
            <tr>
              <!-- Checkbox Column -->
              <th v-if="config.selectable" class="px-4 py-3 text-left w-12 bg-[var(--bz-table-header)] sticky top-0" style="z-index: 11;">
                <Checkbox
                  v-if="!config.singleSelect"
                  :checked="isAllSelected"
                  :indeterminate="isSomeSelected"
                  class="cursor-pointer"
                  @update:checked="(checked: boolean | 'indeterminate') => toggleSelectAll(checked === true)"
                />
              </th>

              <!-- Data Columns -->
              <th
                v-for="(column, index) in visibleColumns"
                :key="column.columnField"
                :style="{ ...getColumnStyle(column), ...getHeaderStyle(column) }"
                :class="getHeaderClass(column)"
                @click="handleSort(column)"
              >
                <span class="text-xs font-medium text-[var(--bz-text-muted)] uppercase whitespace-nowrap">
                  {{ column.columnCaption }}
                </span>
              </th>

              <!-- Actions Column -->
              <th 
                v-if="config.showActions || $slots['row-actions']"
                class="px-4 py-3 w-[52px]"
                style="position: sticky; right: 0; top: 0; z-index: 32; background-color: var(--bz-table-header); transform: translateZ(0);"
              ></th>
            </tr>
          </thead>

          <!-- Table Body -->
          <tbody class="bg-[var(--bz-surface)]">
            <!-- Loading State -->
            <tr v-if="loading">
              <td :colspan="totalColumns" class="px-4 py-12 text-center">
                <div class="flex items-center justify-center gap-2 text-secondary-text">
                  <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-academy-green"></div>
                  <span class="text-[14px]">Đang tải dữ liệu...</span>
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-else-if="paginatedData.length === 0">
              <td :colspan="totalColumns" class="px-4 py-12 text-center">
                <div class="flex flex-col items-center gap-2 text-secondary-text">
                  <FileX class="h-12 w-12 text-border-gray" />
                  <p class="text-[14px]">Không có dữ liệu</p>
                </div>
              </td>
            </tr>

            <!-- Data Rows -->
            <tr
              v-else
              v-for="(row, index) in paginatedData"
              :key="getRowKey(row, index)"
              :class="[
                'group transition-colors',
                props.onRowClick ? 'cursor-pointer' : '',
                selectedRows.has(getRowKey(row, index)) 
                  ? 'bg-[var(--bz-active-bg)]' 
                  : 'bg-[var(--bz-surface)]'
              ]"
              @click="props.onRowClick ? handleRowClick(row) : undefined"
            >
              <!-- Checkbox Cell -->
              <td 
                v-if="config.selectable" 
                :class="[
                  'px-4 py-3 border-b border-[var(--bz-table-border)] w-12 cursor-pointer',
                  selectedRows.has(getRowKey(row, index)) 
                    ? 'bg-[var(--bz-active-bg)] group-hover:!bg-[var(--bz-primary-soft-strong)]' 
                    : 'bg-[var(--bz-surface)] group-hover:!bg-[var(--bz-table-hover)]'
                ]"
                @click.stop.self="toggleSelectRow(row, undefined, index)"
              >
                <Checkbox 
                  :checked="selectedRows.has(getRowKey(row, index))" 
                  class="cursor-pointer"
                  @update:checked="(checked: boolean | 'indeterminate') => toggleSelectRow(row, checked === true, index)"
                />
              </td>

              <!-- Data Cells -->
              <td
                v-for="column in visibleColumns"
                :key="column.columnField"
                :style="{
                  ...getColumnStyle(column),
                  ...(column.pinned === 'right' ? { backgroundColor: selectedRows.has(getRowKey(row, index)) ? 'var(--bz-active-bg)' : 'var(--bz-surface)', transform: 'translateZ(0)' } : {})
                }"
                :class="[
                  'px-4 py-2 border-b border-[var(--bz-table-border)] text-[14px]',
                  hasCellTextColor(column) ? '' : 'text-[var(--bz-text-primary)]',
                  column.cellClass && column.cellClass.length > 0 ? column.cellClass.join(' ') : '',
                  selectedRows.has(getRowKey(row, index))
                    ? 'bg-[var(--bz-active-bg)] group-hover:!bg-[var(--bz-primary-soft-strong)]'
                    : 'bg-[var(--bz-surface)] group-hover:!bg-[var(--bz-table-hover)]'
                ]"
              >
                 <div :class="column.isStatusLable ? 'flex items-center' : getCellTextClass(column)">
                   <div v-if="column.isStatusLable" v-html="processStatusBadge(row[column.columnField])" class="status-badge-wrapper"></div>
                  <div
                    v-else-if="column.fieldType === 'owner'"
                    class="flex items-center gap-3 min-w-0 max-w-[300px]"
                  >
                    <div
                      class="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 ring-1 ring-slate-300/80"
                      aria-hidden="true"
                    />
                    <div class="min-w-0 flex-1">
                      <div class="truncate font-medium text-[var(--bz-text-primary)]">
                        {{ row.FullName != null && row.FullName !== '' ? row.FullName : '—' }}
                      </div>
                      <div class="truncate text-xs text-[var(--bz-text-muted)]">
                        Mã căn: {{ row.RoomCode != null && row.RoomCode !== '' ? row.RoomCode : '—' }}
                      </div>
                    </div>
                  </div>
                  <div
                    v-else-if="column.fieldType === 'name-code'"
                    class="flex flex-col min-w-0"
                  >
                    <span class="font-medium text-[var(--bz-text-primary)] truncate">
                      {{ row.fullName ?? row.FullName ?? '—' }}
                    </span>
                    <span class="text-xs text-[var(--bz-text-muted)] truncate">
                      Mã NV: {{ row.code ?? row.Code ?? '' }}
                    </span>
                  </div>
                  <div
                    v-else-if="column.fieldType === 'created-by'"
                    class="flex flex-col min-w-0"
                  >
                    <span class="text-[var(--bz-text-primary)] truncate">
                      {{ row.createdBy ?? row.CreatedBy ?? '—' }}
                    </span>
                    <span class="text-xs text-[var(--bz-text-muted)] truncate">
                      {{ formatCreatedAt(row.createdAt ?? row.CreatedAt) }}
                    </span>
                  </div>
                  <div
                    v-else-if="column.fieldType === 'email-phone'"
                    class="flex flex-col gap-1 min-w-0"
                  >
                    <span class="flex items-center gap-2 text-[var(--bz-text-primary)] truncate">
                      <Mail class="w-4 h-4 shrink-0 text-[var(--bz-text-muted)]" />
                      <span class="truncate">{{ row.email ?? row.Email ?? '—' }}</span>
                    </span>
                    <span class="flex items-center gap-2 text-xs text-[var(--bz-text-muted)] truncate">
                      <Phone class="w-3.5 h-3.5 shrink-0" />
                      <span class="truncate">{{ row.phone ?? row.Phone ?? '—' }}</span>
                    </span>
                  </div>
                  <div
                    v-else-if="column.fieldType === 'avatar-name-code'"
                    class="flex items-center gap-3 min-w-0"
                  >
                    <img
                      v-if="row.avatar ?? row.Avatar"
                      :src="row.avatar ?? row.Avatar"
                      :alt="row.name ?? row.Name ?? ''"
                      class="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    <div
                      v-else
                      class="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-white text-[12px] font-semibold"
                      :style="{ backgroundColor: getAvatarBgColor(row.name ?? row.Name ?? '') }"
                    >
                      {{ getAvatarInitials(row.name ?? row.Name ?? '') }}
                    </div>
                    <div class="flex flex-col min-w-0 flex-1">
                      <span class="font-medium text-[var(--bz-text-primary)] truncate">
                        {{ row.name ?? row.Name ?? '—' }}
                      </span>
                      <span class="text-xs text-[var(--bz-text-muted)] truncate">
                        {{ row.code ?? row.Code ?? '' }}
                      </span>
                    </div>
                  </div>
                  <div
                    v-else-if="column.fieldType === 'avatar-name-phone'"
                    class="flex items-center gap-3 min-w-0"
                  >
                    <img
                      v-if="row.avatar ?? row.Avatar"
                      :src="row.avatar ?? row.Avatar"
                      :alt="row.name ?? row.Name ?? ''"
                      class="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    <div
                      v-else
                      class="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-white text-[12px] font-semibold"
                      :style="{ backgroundColor: getAvatarBgColor(row.name ?? row.Name ?? '') }"
                    >
                      {{ getAvatarInitials(row.name ?? row.Name ?? '') }}
                    </div>
                    <div class="flex flex-col min-w-0 flex-1">
                      <span class="font-medium text-[var(--bz-text-primary)] truncate">
                        {{ row.name ?? row.Name ?? '—' }}
                      </span>
                      <span class="text-xs text-[var(--bz-text-muted)] truncate">
                        {{ row.phone ?? row.Phone ?? '' }}
                      </span>
                    </div>
                  </div>
                  <div
                    v-else-if="column.fieldType === 'money-primary'"
                    class="font-semibold text-[#F76808] tabular-nums text-[15px]"
                  >
                    {{ formatMoneyPrimaryCell(row[column.columnField]) }}
                  </div>
                  <div v-else-if="column.fieldType === 'html'" v-html="row[column.columnField]"></div>
                  <div v-else-if="column.fieldType === 'check' || column.fieldType === 'checkbox'" class="flex items-center justify-center">
                    <input
                      type="checkbox"
                      :checked="getCheckboxValue(row[column.columnField])"
                      disabled
                      readonly
                      class="w-4 h-4 rounded border-border-gray text-academy-green focus:ring-academy-green/20 cursor-not-allowed opacity-60"
                    />
                  </div>
                  <div v-else :class="[hasCellTextColor(column) ? getCellTextColorClasses(column) : 'text-[var(--bz-text-primary)]', (column.fieldType === 'number' || column.fieldType === 'decimal') ? 'text-right' : '']">{{ formatCellValue(row[column.columnField], column) }}</div>
                </div>
              </td>

              <!-- Actions Cell -->
              <td 
                v-if="config.showActions || $slots['row-actions']"
                :class="[
                  'px-4 py-3 relative w-[52px] border-b border-[var(--bz-table-border)]',
                  selectedRows.has(getRowKey(row, index)) 
                    ? 'bg-[var(--bz-active-bg)] group-hover:!bg-[var(--bz-primary-soft-strong)]' 
                    : 'bg-[var(--bz-surface)] group-hover:!bg-[var(--bz-table-hover)]'
                ]"
                :style="{
                  position: 'sticky',
                  right: 0,
                  zIndex: 21,
                  backgroundColor: selectedRows.has(getRowKey(row, index)) ? 'var(--bz-active-bg)' : 'var(--bz-surface)',
                  transform: 'translateZ(0)'
                }"
              >
                <slot name="row-actions" :row="row" :index="index">
                  <button
                    @click.stop="handleActionClick(row)"
                    class="text-[var(--bz-text-muted)] hover:text-[var(--bz-text-secondary)] transition-colors"
                  >
                    <MoreHorizontal class="w-5 h-5" />
                  </button>
                </slot>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination: shrink-0 — luôn nằm sát dưới khung, không bị co -->
      <div 
        v-if="config.showPagination" 
        class="border-t border-[var(--bz-table-border)] bg-[var(--bz-surface)] flex items-center justify-between shrink-0 p-3"
      >
        <!-- Left side - Total results -->
        <div class="text-sm text-[var(--bz-text-primary)]">
          {{ t('table.showing') }}
          <span class="font-medium text-[var(--bz-text-primary)]">
            {{ startRow }}-{{ endRow }}
          </span>
          {{ t('table.of') }}
          <span class="font-medium text-[var(--bz-text-primary)]">
            {{ totalItems }}
          </span>
          {{ t('table.results') }}
        </div>

        <!-- Right side - Navigation and items per page -->
        <div class="flex items-center gap-1">
          <!-- Previous button -->
          <button
            :disabled="displayPage === 1"
            @click="goToPage(Math.max(1, displayPage - 1))"
            class="w-9 h-8 flex items-center justify-center rounded-lg border border-[var(--bz-border)] bg-[var(--bz-surface)] text-[var(--bz-text-primary)] hover:bg-[var(--bz-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>

          <!-- Page numbers -->
          <div class="flex items-center gap-1">
            <template v-for="(page, pageIndex) in pageNumbers" :key="pageIndex">
              <button
                v-if="page !== '...'"
                @click="goToPage(page as number)"
                :class="[
                  'w-9 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all',
                  displayPage === page
                    ? 'bg-[var(--bz-primary)] text-white'
                    : 'border border-[var(--bz-border)] bg-[var(--bz-surface)] text-[var(--bz-text-primary)] hover:bg-[var(--bz-hover)]'
                ]"
              >
                {{ page }}
              </button>
              <span v-else class="px-1 text-sm text-[var(--bz-text-tertiary)]">...</span>
            </template>
          </div>

          <!-- Next button -->
          <button
            :disabled="displayPage >= totalPages"
            @click="goToPage(Math.min(totalPages, displayPage + 1))"
            class="w-9 h-8 flex items-center justify-center rounded-lg border border-[var(--bz-border)] bg-[var(--bz-surface)] text-[var(--bz-text-primary)] hover:bg-[var(--bz-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight class="w-4 h-4" />
          </button>

          <!-- Items per page dropdown -->
          <Select :model-value="pageSize" @update:model-value="handlePageSizeChange">
            <SelectTrigger 
              size="sm"
              class="!h-8 !w-[80px] !min-w-[80px] !max-w-[80px] !rounded-lg !border-[var(--bz-primary)] !bg-[var(--bz-primary)] !text-white hover:!opacity-90 focus:!ring-[var(--bz-primary)] !shadow-sm [&_svg]:!text-white [&_svg]:!opacity-100 !px-2.5 !py-0 !border-0 !outline-none !transition-all disabled:!bg-[var(--bz-disabled-bg)] disabled:!text-[var(--bz-disabled-text)]"
            >
              <SelectValue>{{ pageSize === '100000' ? 'ALL' : pageSize }}</SelectValue>
            </SelectTrigger>
            <SelectContent side="top" class="!min-w-[96px] !w-[96px]">
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="100000">ALL</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { 
  Search, 
  Edit, 
  Trash2, 
  FileX, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Mail,
  Phone
} from 'lucide-vue-next'
import Checkbox from '@/shared/ui/Checkbox.vue'
import Select from '@/shared/ui/Select.vue'
import SelectContent from '@/shared/ui/SelectContent.vue'
import SelectItem from '@/shared/ui/SelectItem.vue'
import SelectTrigger from '@/shared/ui/SelectTrigger.vue'
import SelectValue from '@/shared/ui/SelectValue.vue'
import type { GridColumn, TableData, TableConfig, TablePagination, TableSort } from '@/types/table.types'
import { useI18n } from '@/composables/useI18n'
import { cn } from '@/shared/ui/utils'

// Props
interface Props {
  columns: GridColumn[]
  data: TableData[]
  loading?: boolean
  pagination?: TablePagination
  config?: Partial<TableConfig>
  onRowClick?: (row: TableData) => void
  /** Tailwind bổ sung cho khung bảng (border, rounded, shadow, …). */
  containerClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  pagination: () => ({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1
  }),
  config: () => ({
    showPagination: true,
    showSearch: true,
    showFilter: false,
    showActions: true,
    selectable: false,
    singleSelect: false,
    striped: true,
    bordered: false,
    hover: true,
    compact: false,
    stickyHeader: true
  })
})

// i18n
const { t } = useI18n()

// Emits
const emit = defineEmits<{
  'row-click': [row: TableData]
  'row-select': [rows: TableData[]]
  'page-change': [page: number]
  'page-size-change': [pageSize: number]
  'sort-change': [sort: TableSort]
  'action-click': [action: string, row: TableData]
  'search': [query: string]
  'cell-change': [row: TableData, field: string, value: any]
}>()

// State
const searchQuery = ref('')
const sortField = ref<string>('')
const sortOrder = ref<'asc' | 'desc'>('asc')
const selectedRows = ref<Set<string>>(new Set())
const currentPage = ref(props.pagination.page)
const pageSize = ref(props.pagination.pageSize.toString())
const tableWrapperRef = ref<HTMLDivElement | null>(null)
const showShadow = ref(false)
const openMenuId = ref<string | null>(null)

// Merge default config with provided config
const config = computed(() => ({
  showPagination: true,
  showSearch: true,
  showFilter: false,
  showActions: true,
  selectable: false,
  singleSelect: false,
  striped: true,
  bordered: false,
  hover: true,
  compact: false,
  stickyHeader: true,
  ...props.config
}))

// Computed
const visibleColumns = computed(() => 
  props.columns.filter(col => !col.isHide).sort((a, b) => a.ordinal - b.ordinal)
)

const totalColumns = computed(() => {
  let count = visibleColumns.value.length
  if (config.value.selectable) count++
  if (config.value.showActions) count++
  return count
})

const filteredData = computed(() => {
  if (!searchQuery.value) return props.data

  const query = searchQuery.value.toLowerCase()
  return props.data.filter(row => {
    return visibleColumns.value.some(col => {
      const value = String(row[col.columnField] || '').toLowerCase()
      // Remove HTML tags for search
      const cleanValue = value.replace(/<[^>]*>/g, '')
      return cleanValue.includes(query)
    })
  })
})

const sortedData = computed(() => {
  if (!sortField.value) return filteredData.value

  return [...filteredData.value].sort((a, b) => {
    const aValue = a[sortField.value]
    const bValue = b[sortField.value]

    if (aValue === bValue) return 0
    
    const comparison = aValue > bValue ? 1 : -1
    return sortOrder.value === 'asc' ? comparison : -comparison
  })
})

const startIndex = computed(() => {
  if (!config.value.showPagination) return 0
  // Calculate start index based on 1-based page number (like mockup)
  return (currentPage.value - 1) * parseInt(pageSize.value)
})

const endIndex = computed(() => {
  if (!config.value.showPagination) return sortedData.value.length
  return startIndex.value + parseInt(pageSize.value)
})

const paginatedData = computed(() => {
  if (!config.value.showPagination) return sortedData.value
  // For server-side pagination, data is already paginated by the server
  // So we should return all data without slicing
  // Only slice if we're doing client-side pagination (when data.length > pageSize)
  // But since we're using server-side pagination, data.length should be <= pageSize
  return sortedData.value
})

const totalPages = computed(() => {
  if (!config.value.showPagination) return 1
  return Math.ceil(totalItems.value / parseInt(pageSize.value))
})

const totalItems = computed(() => {
  // Use pagination.total if available (server-side), otherwise use sortedData.length (client-side)
  return props.pagination.total > 0 ? props.pagination.total : sortedData.value.length
})

const startRow = computed(() => {
  if (totalItems.value === 0) return 0
  return startIndex.value + 1
})

const endRow = computed(() => {
  if (totalItems.value === 0) return 0
  return Math.min(endIndex.value, totalItems.value)
})

// Normalize currentPage to 1-based for display (pageNumbers are 1-based)
const displayPage = computed(() => {
  // If currentPage is 0, it means first page (1-based)
  // If currentPage is 1 or greater, use it as is (assuming 1-based)
  // But if it's 0, convert to 1 for display
  return currentPage.value === 0 ? 1 : currentPage.value
})

const pageNumbers = computed(() => {
  const pages: (number | string)[] = []
  const total = totalPages.value
  const current = displayPage.value
  const maxVisiblePages = 5

  if (total <= maxVisiblePages + 2) {
    // Show all pages if total is small
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // Show pages with ellipsis
    if (current <= 3) {
      // Near start
      for (let i = 1; i <= maxVisiblePages; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    } else if (current >= total - 2) {
      // Near end
      pages.push(1)
      pages.push('...')
      for (let i = total - maxVisiblePages + 1; i <= total; i++) {
        pages.push(i)
      }
    } else {
      // In middle
      pages.push(1)
      pages.push('...')
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(total)
    }
  }

  return pages
})

const getRowKey = (row: TableData, index: number) => {
  // Prefer stable IDs from API. Fallback to index to avoid "select 1 -> select all" when id is missing.
  const candidates = [
    'Oid',
    'oid',
    'OID',
    'Id',
    'id',
    'ID',
    '_id',
    'uuid',
    'UUID'
  ]

  for (const field of candidates) {
    const value = row?.[field]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value)
    }
  }

  const dataIndex = props.data.indexOf(row)
  return dataIndex >= 0 ? `__idx_${dataIndex}` : `__idx_${index}`
}

const isAllSelected = computed(() => {
  return paginatedData.value.length > 0 && 
         paginatedData.value.every((row, index) => selectedRows.value.has(getRowKey(row, index)))
})

const isSomeSelected = computed(() => {
  return paginatedData.value.some((row, index) => selectedRows.value.has(getRowKey(row, index))) && 
         !isAllSelected.value
})

// Tính right offset (px) cho mỗi cột pinned=right dựa trên columnWidth của các cột pinned-right đứng sau nó
// Cột actions (sticky right: 0, width 52px) luôn đứng ngoài cùng bên phải → phải cộng thêm 52px làm điểm xuất phát
const ACTIONS_COL_WIDTH = 52
const pinnedRightOffsets = computed(() => {
  const offsets: Record<string, number> = {}
  const rightCols = visibleColumns.value.filter(c => c.pinned === 'right')
  const hasActions = config.value.showActions
  let acc = hasActions ? ACTIONS_COL_WIDTH : 0
  // duyệt từ phải sang trái
  for (let i = rightCols.length - 1; i >= 0; i--) {
    const col = rightCols[i]!
    offsets[col.columnField] = acc
    acc += col.columnWidth || 120
  }
  return offsets
})

// Methods
const getColumnStyle = (column: GridColumn) => {
  const widthMode = column.widthMode || 'auto'
  const hasFixedClass = typeof column.columnClass === 'string' && column.columnClass.split(/[\s,]+/).includes('col-fixed')
  const style: Record<string, any> = {}

  if ((widthMode === 'fixed' || hasFixedClass || column.pinned === 'right') && column.columnWidth) {
    style.minWidth = column.columnWidth + 'px'
    style.width = column.columnWidth + 'px'
    style.maxWidth = column.columnWidth + 'px'
  } else {
    style.minWidth = '120px'
  }

  if (column.pinned === 'right') {
    style.position = 'sticky'
    style.right = (pinnedRightOffsets.value[column.columnField] ?? 0) + 'px'
    style.zIndex = 21
  }

  return style
}

const getHeaderClass = (column: GridColumn) => {
  const classes = ['px-4 py-3 text-left']
  
  // Sticky positioning for header
  classes.push('whitespace-nowrap')
  
  if (column.columnClass) {
    classes.push(column.columnClass)
  }
  if (isSortable(column)) {
    classes.push('cursor-pointer select-none')
  }
  return classes.join(' ')
}

const getHeaderStyle = (column: GridColumn) => {
  const style: Record<string, any> = {
    backgroundColor: 'var(--bz-table-header)',
    position: 'sticky',
    top: 0,
    zIndex: 11,
    width: column.columnWidth || undefined,
  }
  if (column.pinned === 'right') {
    style.right = (pinnedRightOffsets.value[column.columnField] ?? 0) + 'px'
    style.zIndex = 32
  }
  return style
}

const getCellTextClass = (column: GridColumn) => {
  const widthMode = column.widthMode || 'auto'
  const hasFixedClass = typeof column.columnClass === 'string' && column.columnClass.split(/[\s,]+/).includes('col-fixed')

  if (widthMode === 'auto' && !hasFixedClass) {
    return 'whitespace-nowrap overflow-hidden text-ellipsis'
  } else {
    return 'whitespace-normal break-words'
  }
}

const getCellClass = (column: GridColumn, row: TableData) => {
  const classes = []
  if (column.cellClass && column.cellClass.length > 0) {
    classes.push(...column.cellClass)
  }
  return classes.join(' ')
}

const isSortable = (column: GridColumn) => {
  return column.fieldType !== 'html' && 
         column.fieldType !== 'check' && 
         column.fieldType !== 'checkbox' &&
         !column.isStatusLable
}

/**
 * Process status badge HTML to ensure it has a dot indicator
 * If the HTML doesn't have a dot, add one based on the status text/class
 */
const processStatusBadge = (html: string): string => {
  if (!html || typeof html !== 'string') return html
  
  // Check if HTML already has a dot indicator (div with rounded class or size class)
  if (html.includes('<div') && (html.includes('rounded') || html.includes('size-[6px]'))) {
    return html
  }
  
  // Parse the HTML to extract text and classes
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const span = doc.querySelector('span')
  
  if (!span) return html
  
  const text = span.textContent || ''
  const classes = span.className || ''
  const style = span.getAttribute('style') || ''
  
  // Determine dot color based on status text or class
  let dotColor = '#6B7280' // Default gray
  let bgColor = '#F3F4F6' // Default background
  let textColor = '#374151' // Default text color
  
  // Map status text to colors (matching mockup StatusBadge component)
  const statusMap: Record<string, { dot: string; bg: string; text: string }> = {
    'Chưa nhập': { dot: '#2563EB', bg: '#EFF6FF', text: '#1D4ED8' },
    'Đã nhập': { dot: '#F76808', bg: '#FFF4ED', text: '#C2410C' },
    'Đã chốt': { dot: '#30A446', bg: '#DFF3DF', text: '#1A5928' },
    'Mới tạo': { dot: '#F76808', bg: '#FFF4ED', text: '#F76808' },
    'Hoạt động': { dot: '#30A446', bg: '#DFF3DF', text: '#1A5928' },
    'Đang làm việc': { dot: '#30A446', bg: '#DFF3DF', text: '#1A5928' },
    'Đã nghỉ việc': { dot: '#DC2626', bg: '#FEE2E2', text: '#DC2626' },
    'Khóa': { dot: '#FF3B49', bg: '#FFD7D9', text: '#8A1F23' },
    'Bị khóa': { dot: '#FF3B49', bg: '#FFD7D9', text: '#8A1F23' },
    'Hết hạn': { dot: '#DC2626', bg: '#FEE2E2', text: '#DC2626' },
    'Đã hủy': { dot: '#DC2626', bg: '#FEE2E2', text: '#DC2626' },
    'Hủy': { dot: '#DC2626', bg: '#FEE2E2', text: '#DC2626' },
    'Đã mất': { dot: '#DC2626', bg: '#FEE2E2', text: '#DC2626' },
  }
  
  // Check if we have a mapping for this status
  const statusConfig = statusMap[text.trim()]
  if (statusConfig) {
    dotColor = statusConfig.dot
    bgColor = statusConfig.bg
    textColor = statusConfig.text
  } else {
    // Try to extract colors from existing style
    const bgMatch = style.match(/background-color:\s*([^;]+)/)
    const textMatch = style.match(/color:\s*([^;]+)/)
    if (bgMatch && bgMatch[1]) bgColor = bgMatch[1].trim()
    if (textMatch && textMatch[1]) {
      textColor = textMatch[1].trim()
      dotColor = textColor // Use text color as dot color if available
    }
  }
  
  // Build new HTML with dot indicator
  return `<span class="inline-flex items-center gap-[6px] px-[8px] py-px rounded-[4px] text-[12px] font-medium whitespace-nowrap ${classes}" style="background-color: ${bgColor}; color: ${textColor}; ${style}">
    <div class="rounded-[2px] shrink-0 size-[6px]" style="background-color: ${dotColor};"></div>
    ${text}
  </span>`
}

const AVATAR_BG_PALETTE: readonly string[] = ['#10B981', '#3B82F6', '#8B5CF6', '#22C55E', '#EAB308', '#F97316', '#EF4444', '#14B8A6', '#06B6D4', '#EC4899']
const COMPANY_PREFIXES = ['công ty tnhh', 'công ty cp', 'công ty cổ phần', 'công ty', 'nhà hàng', 'siêu thị', 'doanh nghiệp', 'tnhh', 'cty']
const AVATAR_FALLBACK_COLOR = '#10B981'

const getAvatarInitials = (name: string): string => {
  if (!name) return '—'
  let cleaned = String(name).trim()
  const lower = cleaned.toLowerCase()
  for (const prefix of COMPANY_PREFIXES) {
    if (lower.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length).trim()
      break
    }
  }
  if (!cleaned) cleaned = String(name).trim()
  const words = cleaned.split(/\s+/).filter(Boolean)
  const first = words[0]
  const second = words[1]
  if (first && second) {
    return ((first[0] ?? '') + (second[0] ?? '')).toUpperCase()
  }
  if (first) {
    return first.slice(0, 2).toUpperCase()
  }
  return '—'
}

const getAvatarBgColor = (name: string): string => {
  if (!name) return AVATAR_FALLBACK_COLOR
  let hash = 0
  const s = String(name)
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  }
  return AVATAR_BG_PALETTE[hash % AVATAR_BG_PALETTE.length] ?? AVATAR_FALLBACK_COLOR
}

const TEXT_COLOR_REGEX = /^text-(red|blue|green|yellow|orange|gray|slate|zinc|neutral|stone|amber|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose|black|white|inherit|current|transparent)(-\d+)?$/

const getCellTextColorClasses = (column: GridColumn): string => {
  const list = Array.isArray(column.cellClass) ? column.cellClass : []
  const tokens: string[] = []
  for (const item of list) {
    if (typeof item !== 'string') continue
    for (const tok of item.split(/[\s,]+/).filter(Boolean)) {
      if (TEXT_COLOR_REGEX.test(tok) || tok.startsWith('text-[')) tokens.push(tok)
    }
  }
  return tokens.join(' ')
}

const hasCellTextColor = (column: GridColumn): boolean => {
  return getCellTextColorClasses(column).length > 0
}

const formatCreatedAt = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return ''
  const s = String(value)
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

const formatMoneyPrimaryCell = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '—'
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)
  return n.toLocaleString('vi-VN')
}

const formatCellValue = (value: any, column: GridColumn) => {
  if (value === null || value === undefined) return ''
  
  switch (column.fieldType) {
    case 'date':
      return new Date(value).toLocaleDateString('vi-VN')
    case 'number':
      return Number(value).toLocaleString('vi-VN')
    case 'boolean':
      return value ? 'Có' : 'Không'
    case 'check':
    case 'checkbox':
      // This should not be called for check/checkbox type, but handle it just in case
      return getCheckboxValue(value) ? 'Có' : 'Không'
    default:
      return String(value)
  }
}

// Helper function to get checkbox value (handle different data types)
const getCheckboxValue = (value: any): boolean => {
  if (value === null || value === undefined) return false
  
  // Handle boolean
  if (typeof value === 'boolean') {
    return value
  }
  
  // Handle string
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase()
    return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes' || lowerValue === 'on'
  }
  
  // Handle number
  if (typeof value === 'number') {
    return value === 1 || value > 0
  }
  
  // Default to false
  return false
}

// Handle checkbox change event
const handleCheckboxChange = (row: TableData, field: string, event: Event) => {
  const target = event.target as HTMLInputElement
  const newValue = target.checked
  
  // Update the row data
  row[field] = newValue
  
  // Emit event for parent component to handle
  emit('cell-change', row, field, newValue)
}

const handleSort = (column: GridColumn) => {
  if (!isSortable(column)) return

  if (sortField.value === column.columnField) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = column.columnField
    sortOrder.value = 'asc'
  }

  emit('sort-change', {
    field: sortField.value,
    order: sortOrder.value
  })
}

const handleSearch = () => {
  currentPage.value = 1
  emit('search', searchQuery.value)
}

const handleRowClick = (row: TableData) => {
  emit('row-click', row)
}

const toggleSelectRow = (row: TableData, checked?: boolean, index?: number) => {
  const rowKey = getRowKey(row, index ?? 0)
  if (checked === undefined) {
    checked = !selectedRows.value.has(rowKey)
  }
  
  if (checked) {
    if (config.value.singleSelect) {
      selectedRows.value.clear()
    }
    selectedRows.value.add(rowKey)
  } else {
    selectedRows.value.delete(rowKey)
  }
  emitSelectedRows()
}

const toggleSelectAll = (checked?: boolean) => {
  if (config.value.singleSelect) {
    if (checked === undefined) {
      checked = selectedRows.value.size === 0
    }
    selectedRows.value.clear()
    const firstRow = paginatedData.value[0]
    if (checked && firstRow) {
      selectedRows.value.add(getRowKey(firstRow, 0))
    }
    emitSelectedRows()
    return
  }

  if (checked === undefined) {
    checked = !isAllSelected.value
  }
  
  if (checked) {
    paginatedData.value.forEach((row, index) => selectedRows.value.add(getRowKey(row, index)))
  } else {
    paginatedData.value.forEach((row, index) => selectedRows.value.delete(getRowKey(row, index)))
  }
  emitSelectedRows()
}

const emitSelectedRows = () => {
  const selected = props.data.filter((row, index) => selectedRows.value.has(getRowKey(row, index)))
  emit('row-select', selected)
}

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  emit('page-change', page)
}

const handlePageSizeChange = (newSize: string) => {
  pageSize.value = newSize
  currentPage.value = 1
  emit('page-size-change', parseInt(newSize))
}

const handleActionClick = (row: TableData) => {
  const rowKey = getRowKey(row, 0)
  openMenuId.value = openMenuId.value === rowKey ? null : rowKey
  emit('action-click', 'more', row)
}

// Check if table needs horizontal scrolling
onMounted(() => {
  if (tableWrapperRef.value) {
    const checkScroll = () => {
      const wrapper = tableWrapperRef.value
      if (!wrapper) return
      
      const scrollWidth = wrapper.scrollWidth
      const clientWidth = wrapper.clientWidth
      const scrollLeft = wrapper.scrollLeft
      
      const needsHorizontalScroll = scrollWidth > clientWidth
      const hasScrolledRight = scrollLeft > 1
      showShadow.value = needsHorizontalScroll && hasScrolledRight
    }
    
    checkScroll()
    tableWrapperRef.value.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)
    
    onBeforeUnmount(() => {
      if (tableWrapperRef.value) {
        tableWrapperRef.value.removeEventListener('scroll', checkScroll)
        window.removeEventListener('resize', checkScroll)
      }
    })
  }
})

// Watch for external pagination changes
watch(() => props.pagination.page, (newPage) => {
  currentPage.value = newPage
})

watch(() => props.pagination.pageSize, (newPageSize) => {
  pageSize.value = newPageSize.toString()
})

// Public methods (for parent component to call)
defineExpose({
  clearSelection: () => {
    selectedRows.value.clear()
    emitSelectedRows()
  },
  selectAll: () => {
    props.data.forEach((row, index) => selectedRows.value.add(getRowKey(row, index)))
    emitSelectedRows()
  },
  getSelectedRows: () => {
    return props.data.filter((row, index) => selectedRows.value.has(getRowKey(row, index)))
  }
})
</script>

<style scoped>
/* Table styling - matching BizzoneTable */
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: max-content;
}

/* Header styling */
thead th {
  background-color: var(--bz-table-header);
  position: sticky;
  top: 0;
  z-index: 11;
}

thead th:last-child {
  z-index: 32;
}

/* Sticky actions column */
td:last-child,
th:last-child {
  position: sticky !important;
  right: 0 !important;
  z-index: 21 !important;
  transform: translateZ(0);
}

th:last-child {
  z-index: 32 !important;
  background-color: var(--bz-table-header) !important;
}

/* Row hover and selection states */
tr.group {
  transition: background-color 0.2s;
}

tr.group:hover {
  background-color: var(--bz-table-hover);
}

tr.group.bg-\[var\(--bz-active-bg\)\]:hover {
  background-color: var(--bz-primary-soft-strong) !important;
}

/* Cell text styling */
td {
  color: var(--bz-text-primary);
}

/* Status badge styling - match mockup */
.status-badge-wrapper {
  display: inline-flex;
  align-items: center;
}

.status-badge-wrapper :deep(span) {
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  padding: 2px 8px !important;
  border-radius: 4px !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  white-space: nowrap !important;
  line-height: 1.5 !important;
}

/* Dot indicator styling - ensure it displays correctly */
.status-badge-wrapper :deep(span > div),
.status-badge-wrapper :deep(span div) {
  display: block !important;
  border-radius: 2px !important;
  flex-shrink: 0 !important;
  width: 6px !important;
  height: 6px !important;
  min-width: 6px !important;
  min-height: 6px !important;
}

/* Ensure dot is visible even if hidden by default */
.status-badge-wrapper :deep(span div[class*="rounded"][class*="size"]) {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}

/* Pagination SelectTrigger - Override default classes to match mockup */
:deep([data-slot="select-trigger"]) {
  height: 28px !important; /* h-7 */
  width: 68px !important;
  min-width: 68px !important;
  max-width: 68px !important;
  padding-left: 10px !important; /* px-2.5 */
  padding-right: 10px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  border-radius: 8px !important; /* rounded-lg */
  border: 1px solid var(--bz-primary) !important;
  background-color: var(--bz-primary) !important;
  color: white !important;
  font-size: 14px !important; /* text-sm */
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 8px !important;
}

:deep([data-slot="select-trigger"]:hover) {
  opacity: 0.9 !important;
}

:deep([data-slot="select-trigger"] svg) {
  color: white !important;
  opacity: 1 !important;
  width: 16px !important;
  height: 16px !important;
}
</style>

