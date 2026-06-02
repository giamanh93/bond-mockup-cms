<template>
  <div class="w-full">
    <!-- Input Text -->
    <Input
      v-if="field.columnType === 'input'"
      :model-value="modelValue || ''"
      :placeholder="field.columnTooltip || field.columnLabel || 'Nhập...'"
      :disabled="field.isDisable"
      :maxlength="field.maxLength"
      @update:model-value="handleValueChange"
      class="w-full"
    />
    
    <!-- Number -->
    <Input
      v-else-if="field.columnType === 'number'"
      type="number"
      :model-value="modelValue || ''"
      :placeholder="field.columnTooltip || field.columnLabel || 'Nhập số...'"
      :disabled="field.isDisable"
      @update:model-value="handleValueChange"
      class="w-full"
    />
    
    <!-- Dropdown/Select (Single) - PrimeVue Select -->
    <Select
      v-else-if="['dropdown', 'select'].includes(field.columnType)"
      v-model="selectValue"
      :options="getPrimeVueOptions()"
      optionLabel="label"
      optionValue="value"
      :placeholder="field.columnTooltip || field.columnLabel || 'Chọn...'"
      :disabled="field.isDisable"
      :filter="true"
      filterPlaceholder="Tìm kiếm..."
      :class="getSelectClass()"
      :inputStyle="{ width: '100%', height: '33px' }"
      :inputClass="getSelectInputClass()"
      @change="() => { normalizeFieldValue(); }"
      @show="() => normalizeFieldValue()"
    >
      <template #value="slotProps">
        <div v-if="slotProps.value" class="flex items-center gap-2">
          <div v-if="getSelectedOption(slotProps.value)?.isHtml" v-html="getSelectedOption(slotProps.value)?.htmlContent || getSelectedOption(slotProps.value)?.label"></div>
          <div v-else class="flex items-center gap-2">
            <div>{{ getSelectedOption(slotProps.value)?.label || slotProps.value }}</div>
          </div>
        </div>
        <span v-else class="flex items-center h-full">
          {{ slotProps.placeholder }}
        </span>
      </template>
      <template #option="slotProps">
        <div class="flex items-center gap-2">
          <div v-if="slotProps.option.isHtml" v-html="slotProps.option.htmlContent || slotProps.option.label"></div>
          <div v-else class="flex items-center gap-2">
            <div>{{ slotProps.option.label }}</div>
          </div>
        </div>
      </template>
    </Select>
    
    <!-- Select Tree (Single Select) -->
    <SelectTree
      v-else-if="field.columnType === 'selectTree'"
      :tree-data="treeData"
      :selected-values="getTreeSelectedValue()"
      :disabled="field.isDisable"
      :placeholder="field.columnTooltip || field.columnLabel || 'Chọn...'"
      @update:selected="(values) => handleTreeValueChange(values)"
      class="w-full"
    />
    
    <!-- Select Trees (Multi Select) -->
    <SelectTrees
      v-else-if="field.columnType === 'selectTrees'"
      :tree-data="treeData"
      :selected-values="getTreeSelectedValues()"
      :disabled="field.isDisable"
      :placeholder="field.columnTooltip || field.columnLabel || 'Chọn...'"
      @update:selected="(values) => handleTreeValueChange(values)"
      class="w-full"
    />
    
    <!-- Date -->
    <Calendar
      v-else-if="field.columnType === 'date'"
      :model-value="getDateValue()"
      @update:model-value="handleDateChange"
      :disabled="field.isDisable"
      dateFormat="dd/mm/yy"
      :showIcon="true"
      :placeholder="field.columnTooltip || field.columnLabel || 'Chọn ngày...'"
      class="w-full"
      :inputStyle="{ width: '100%', height: '33px' }"
    />
    
    <!-- DateTime -->
    <Calendar
      v-else-if="['datetimes', 'datefulltime'].includes(field.columnType)"
      :model-value="getDateValue()"
      @update:model-value="handleDateChange"
      :disabled="field.isDisable"
      :showTime="true"
      :showIcon="true"
      :hourFormat="'24'"
      :placeholder="field.columnTooltip || field.columnLabel || 'Chọn ngày giờ...'"
      class="w-full"
      :inputStyle="{ width: '100%', height: '33px' }"
    />
    
    <!-- Default fallback -->
    <Input
      v-else
      :model-value="modelValue || ''"
      :placeholder="field.columnTooltip || field.columnLabel || 'Nhập...'"
      :disabled="field.isDisable"
      @update:model-value="handleValueChange"
      class="w-full"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import Input from '@/shared/ui/Input.vue'
import Select from 'primevue/select'
import SelectTree from '@/components/SelectTree.vue'
import SelectTrees from '@/components/SelectTrees.vue'
import Calendar from 'primevue/calendar'
import api from '@/utils/api'
import axios from 'axios'
import { useRuntimeShomeBase } from '@/utils/axiosRuntimeBase'
import { useAuthStore } from '@/stores/auth'
import { useProjectStore } from '@/stores/project'
import { applyAcceptLanguageToAxiosRequest } from '@/utils/requestLocale'

// Create axios instance for apiShomeBase
const apiShome = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

useRuntimeShomeBase(apiShome)

// Apply interceptors to apiShome
apiShome.interceptors.request.use(
  async (config) => {
    applyAcceptLanguageToAxiosRequest(config)
    const authStore = useAuthStore()
    
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    
    if (!authStore._isAuthenticated && authStore.keycloak?.authenticated) {
      authStore.token = authStore.keycloak.token || null
      authStore.refreshToken = authStore.keycloak.refreshToken || null
      authStore._isAuthenticated = true
    }
    
    if (authStore._isAuthenticated) {
      try {
        if (!authStore.token && authStore.keycloak?.token) {
          config.headers.Authorization = `Bearer ${authStore.keycloak.token}`
        } else {
          await authStore.updateToken(30)
          const authHeader = authStore.getAuthHeader()
          if (authHeader.Authorization) {
            config.headers.Authorization = authHeader.Authorization
          } else if (authStore.keycloak?.token) {
            config.headers.Authorization = `Bearer ${authStore.keycloak.token}`
          }
        }
        if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
          config.headers['Content-Type'] = 'application/json'
        }
      } catch (error) {
        console.error('[DynamicFilterField API Shome] Failed to get token:', error)
      }
    } else {
      if (authStore.keycloak?.authenticated && authStore.keycloak?.token) {
        config.headers.Authorization = `Bearer ${authStore.keycloak.token}`
      }
    }
    
    // Add ProjectCd to request params or data
    const projectStore = useProjectStore()
    if (projectStore.selectedProjectCode) {
      if (config.method === 'get' || config.method === 'GET') {
        config.params = config.params || {}
        config.params.ProjectCd = projectStore.selectedProjectCode
      } else {
        if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
          config.data = {
            ...config.data,
            ProjectCd: projectStore.selectedProjectCode,
          }
        } else if (!config.data) {
          config.data = {
            ProjectCd: projectStore.selectedProjectCode,
          }
        }
      }
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

apiShome.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      try {
        const refreshed = await authStore.updateToken(30)
        if (!refreshed) {
          window.location.reload()
          return Promise.reject(error)
        }
      } catch (refreshError) {
        console.error('[DynamicFilterField API Shome] Token refresh error:', refreshError)
        window.location.reload()
        return Promise.reject(error)
      }
      
      const config = error.config
      const authHeader = authStore.getAuthHeader()
      if (authHeader.Authorization) {
        config.headers.Authorization = authHeader.Authorization
      }
      
      return apiShome.request(config)
    }
    
    return Promise.reject(error)
  }
)

interface Props {
  field: any
  modelValue?: any
  filterValues?: Record<string, any> // For dependency resolution
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  filterValues: () => ({})
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const options = ref<any[]>([])
const treeData = ref<any[]>([])
const watchEnabled = ref(true)

// Select value for PrimeVue Select (two-way binding)
const selectValue = ref(props.modelValue || 'all')

// Watch modelValue to update selectValue
watch(() => props.modelValue, (newValue) => {
  if (watchEnabled.value) {
    selectValue.value = newValue || 'all'
  }
}, { immediate: true })

// Watch selectValue to emit update
watch(selectValue, (newValue) => {
  if (watchEnabled.value) {
    handleValueChange(newValue)
  }
})

// Normalize value for case-insensitive comparison
const getNormalizedValue = (value: any): any => {
  if (value === null || value === undefined || value === '') {
    return value
  }
  // Convert to string and lowercase for case-insensitive comparison
  return String(value).toLowerCase()
}

// Get PrimeVue options format with case-insensitive value matching
const getPrimeVueOptions = () => {
  return options.value.map((opt: any) => ({
    label: opt.label,
    value: opt.value,
    isHtml: opt.isHtml || false,
    htmlContent: opt.htmlContent || null
  }))
}

// Watch for field value changes to handle case-insensitive matching
const normalizeFieldValue = () => {
  const currentValue = selectValue.value
  if (currentValue === null || currentValue === undefined || currentValue === '' || currentValue === 'all') {
    return
  }
  
  const normalizedCurrent = getNormalizedValue(currentValue)
  
  // Find option that matches (case-insensitive)
  const matchedOption = options.value.find((opt: any) => 
    getNormalizedValue(opt.value) === normalizedCurrent
  )
  
  // If found a match with different case, update the value to match the option's original value
  if (matchedOption && matchedOption.value !== currentValue) {
    // Temporarily disable watch to avoid infinite loop
    const wasWatching = watchEnabled.value
    watchEnabled.value = false
    selectValue.value = matchedOption.value
    nextTick(() => {
      watchEnabled.value = wasWatching
    })
  }
}

// Get selected option for value template
const getSelectedOption = (value: any) => {
  if (!value || value === 'all') return null
  const normalizedValue = getNormalizedValue(value)
  return options.value.find((opt: any) => 
    getNormalizedValue(opt.value) === normalizedValue
  ) || null
}

// Extract classes from HTML content
// Only extract classes that start with 'bg-', 'badge-', or 'text-', exclude 'noti-number'
const extractClassesFromHtml = (htmlContent: string): string => {
  if (!htmlContent) return ''
  
  try {
    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = htmlContent
    
    // Find all elements with class attribute
    const elementsWithClass = tempDiv.querySelectorAll('[class]')
    const classes: string[] = []
    
    elementsWithClass.forEach((el) => {
      const classAttr = el.getAttribute('class')
      if (classAttr) {
        // Split classes, filter only bg-*, badge-*, or text-* classes, exclude noti-number
        const classList = classAttr.split(/\s+/)
          .filter(c => {
            const trimmed = c.trim()
            return trimmed && 
                   (trimmed.startsWith('bg-') || trimmed.startsWith('badge-') || trimmed.startsWith('text-')) &&
                   trimmed !== 'noti-number'
          })
        classes.push(...classList)
      }
    })
    
    // Return unique classes joined with space
    return [...new Set(classes)].join(' ')
  } catch (e) {
    console.warn('[DynamicFilterField] Failed to extract classes from HTML:', e)
    return ''
  }
}

// Get selectClass for Select component with conditional class from HTML label
const getSelectClass = (): string => {
  const baseClass = 'w-full'
  const selected = getSelectedOption(selectValue.value)
  
  if (selected?.isHtml === true) {
    // Extract classes from HTML content in label
    const htmlContent = selected?.htmlContent || selected?.label || ''
    const extractedClasses = extractClassesFromHtml(htmlContent)
    
    if (extractedClasses) {
      return `${baseClass} ${extractedClasses}`
    }
    return `${baseClass} has-html-badge`
  }
  return baseClass
}

// Get inputClass for Select component with conditional class from HTML label
const getSelectInputClass = (): string => {
  const baseClass = 'w-full h-9'
  const selected = getSelectedOption(selectValue.value)
  
  if (selected?.isHtml === true) {
    // Extract classes from HTML content in label
    const htmlContent = selected?.htmlContent || selected?.label || ''
    const extractedClasses = extractClassesFromHtml(htmlContent)
    
    if (extractedClasses) {
      return `${baseClass} ${extractedClasses}`
    }
    return `${baseClass} has-html-badge`
  }
  return baseClass
}

// Load options from columnObject API
const loadOptions = async () => {
  if (!props.field.columnObject) {
    // If no columnObject, check if field has static options
    if (props.field.columnDisplay && Array.isArray(props.field.columnDisplay)) {
      options.value = props.field.columnDisplay.map((item: any) => ({
        value: item.value || item.id || item.Oid || item.code,
        label: item.label || item.name || item.text || item.code,
        isHtml: item.isHtml || false,
        htmlContent: item.isHtml ? (item.label || item.name || item.text || item.code) : null
      }))
      // Add "Tất cả" option
      options.value.unshift({ 
        value: 'all', 
        label: `Tất cả ${props.field.columnLabel || ''}`.trim(),
        isHtml: false,
        htmlContent: null
      })
    }
    return
  }
  
  const fieldKey = props.field.field_name || props.field.name
  if (!fieldKey) return
  
  try {
    let url = props.field.columnObject
    
    // Replace dependency placeholders (e.g., {provinceOid})
    const matches = url.match(/\{(\w+)\}/g)
    if (matches) {
      matches.forEach((match: string) => {
        const depFieldName = match.replace(/[{}]/g, '')
        const depValue = props.filterValues[depFieldName] || ''
        url = url.replace(match, depValue)
      })
    }
    
    // Clean up URL
    url = url.replace(/[?&]$/, '').replace(/[?&]&/, '?').replace(/&&+/, '&')
    
    // Use apiShome for getOptions (apiShomeBase)
    const response = await apiShome.get(url)
    
    // Handle tree data structure for selectTree and selectTrees
    if (props.field.columnType === 'selectTree' || props.field.columnType === 'selectTrees') {
      let tree: any[] = []
      if (Array.isArray(response)) {
        tree = response
      } else if (response?.data) {
        if (Array.isArray(response.data)) {
          tree = response.data
        } else if (response.data.data && Array.isArray(response.data.data)) {
          tree = response.data.data
        } else if (response.data.children && Array.isArray(response.data.children)) {
          tree = response.data.children
        } else if (response.data.value || response.data.id || response.data.Oid) {
          tree = [response.data]
        }
      } else if (response?.children && Array.isArray(response.children)) {
        tree = response.children
      } else if (response?.value || response?.id || response?.Oid) {
        tree = [response]
      }
      treeData.value = tree
      return
    }
    
    // Normalize response to { value, label, isHtml, htmlContent } format for regular options
    let normalizedOptions: any[] = []
    if (Array.isArray(response)) {
      normalizedOptions = response.map((item: any) => ({
        value: item.value || item.id || item.Oid || item.code,
        label: item.label || item.name || item.text || item.code,
        isHtml: item.isHtml || false,
        htmlContent: item.isHtml ? (item.label || item.name || item.text || item.code) : null
      }))
    } else if (response?.data) {
      if (Array.isArray(response.data)) {
        normalizedOptions = response.data.map((item: any) => ({
          value: item.value || item.id || item.Oid || item.code,
          label: item.label || item.name || item.text || item.code,
          isHtml: item.isHtml || false,
          htmlContent: item.isHtml ? (item.label || item.name || item.text || item.code) : null
        }))
      } else if (response.data.data && Array.isArray(response.data.data)) {
        normalizedOptions = response.data.data.map((item: any) => ({
          value: item.value || item.id || item.Oid || item.code,
          label: item.label || item.name || item.text || item.code,
          isHtml: item.isHtml || false,
          htmlContent: item.isHtml ? (item.label || item.name || item.text || item.code) : null
        }))
      }
    }
    
    // Add "Tất cả" option at the beginning for dropdown/select
    if (['dropdown', 'select'].includes(props.field.columnType)) {
      normalizedOptions.unshift({ 
        value: 'all', 
        label: `Tất cả ${props.field.columnLabel || ''}`.trim(),
        isHtml: false,
        htmlContent: null
      })
    }
    
    options.value = normalizedOptions
  } catch (error) {
    console.error(`Failed to load options for ${fieldKey}:`, error)
    if (['dropdown', 'select'].includes(props.field.columnType)) {
      options.value = [{ value: 'all', label: `Tất cả ${props.field.columnLabel || ''}`.trim() }]
    } else {
      options.value = []
    }
    treeData.value = []
  }
}

// Handle value change
const handleValueChange = (value: any) => {
  emit('update:modelValue', value)
}

// Handle date change
const handleDateChange = (value: Date | Date[] | null) => {
  if (!value) {
    emit('update:modelValue', null)
    return
  }
  
  if (Array.isArray(value)) {
    value = value[0]
  }
  
  if (value instanceof Date) {
    // Format date based on columnType
    if (props.field.columnType === 'date') {
      // Format as YYYY-MM-DD
      const year = value.getFullYear()
      const month = String(value.getMonth() + 1).padStart(2, '0')
      const day = String(value.getDate()).padStart(2, '0')
      emit('update:modelValue', `${year}-${month}-${day}`)
    } else if (['datetimes', 'datefulltime'].includes(props.field.columnType)) {
      // Format as YYYY-MM-DDTHH:mm:ss
      const year = value.getFullYear()
      const month = String(value.getMonth() + 1).padStart(2, '0')
      const day = String(value.getDate()).padStart(2, '0')
      const hours = String(value.getHours()).padStart(2, '0')
      const minutes = String(value.getMinutes()).padStart(2, '0')
      const seconds = String(value.getSeconds()).padStart(2, '0')
      emit('update:modelValue', `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`)
    } else {
      emit('update:modelValue', value.toISOString())
    }
  } else {
    emit('update:modelValue', value)
  }
}

// Get date value for Calendar
const getDateValue = (): Date | null => {
  if (!props.modelValue) return null
  
  if (props.modelValue instanceof Date) {
    return props.modelValue
  }
  
  if (typeof props.modelValue === 'string') {
    const date = new Date(props.modelValue)
    if (!isNaN(date.getTime())) {
      return date
    }
  }
  
  return null
}

// Get tree selected value (single)
const getTreeSelectedValue = (): string | null => {
  if (!props.modelValue || props.modelValue === 'all') return null
  if (typeof props.modelValue === 'string') return props.modelValue
  if (Array.isArray(props.modelValue) && props.modelValue.length > 0) {
    return props.modelValue[0]
  }
  return null
}

// Get tree selected values (multi)
const getTreeSelectedValues = (): string[] => {
  if (!props.modelValue || props.modelValue === 'all') return []
  if (Array.isArray(props.modelValue)) return props.modelValue
  if (typeof props.modelValue === 'string') return [props.modelValue]
  return []
}

// Handle tree value change
const handleTreeValueChange = (values: string | string[]) => {
  if (props.field.columnType === 'selectTree') {
    // Single select - take first value or null
    emit('update:modelValue', Array.isArray(values) ? (values[0] || null) : values)
  } else {
    // Multi select - always array
    emit('update:modelValue', Array.isArray(values) ? values : (values ? [values] : []))
  }
}

// Watch filterValues to reload options when dependencies change
watch(() => props.filterValues, () => {
  if (props.field.columnObject) {
    loadOptions()
  }
}, { deep: true })

// Watch field.columnObject to reload when it changes
watch(() => props.field.columnObject, () => {
  loadOptions()
})

// Load options on mount
onMounted(() => {
  loadOptions()
})
</script>

<style scoped>
/* PrimeVue Select - Match height and font size with other inputs (same as Calendar) */
.p-select,
.p-dropdown {
  width: 100%; /* w-full */
  font-size: 0.875rem !important; /* text-sm = 14px */
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

.p-select .p-select-label,
.p-select .p-select-trigger,
.p-dropdown .p-dropdown-label,
.p-dropdown .p-dropdown-trigger {
  height: 2.25rem; /* h-9 = 36px */
  font-size: 0.875rem; /* text-sm = 14px */
  line-height: 1.25rem; /* text-sm line-height */
  height: 36px !important;
  font-size: 0.875rem !important; /* text-sm = 14px */
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  line-height: 36px !important;
}

/* Placeholder specific - ensure vertical centering */
.p-select .p-select-label.p-placeholder,
.p-dropdown .p-dropdown-label.p-placeholder {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  height: 36px !important;
  line-height: 36px !important;
}

.p-select .p-select-label input,
.p-dropdown .p-dropdown-label input {
  height: 2.25rem; /* h-9 = 36px */
  font-size: 0.875rem; /* text-sm = 14px */
  line-height: 1.25rem; /* text-sm line-height */
  height: 36px !important;
  font-size: 0.875rem !important; /* text-sm = 14px */
  line-height: 36px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  display: flex !important;
  align-items: center !important;
  color: inherit !important;
  font-weight: inherit !important;
}

.p-select .p-select-label .flex,
.p-dropdown .p-dropdown-label .flex {
  display: flex !important;
  align-items: center !important;
  height: 100% !important;
  line-height: 36px !important;
  font-size: 0.875rem !important; /* text-sm = 14px */
  color: inherit !important;
  font-weight: inherit !important;
}

.p-select .p-select-label .flex div,
.p-dropdown .p-dropdown-label .flex div {
  font-size: 0.875rem !important; /* text-sm = 14px */
}

/* Badge styling in selected value - match option badge size */
/* Only target badge elements inside the label, not the label itself */
.p-select .p-select-label .flex div .noti-number,
.p-select .p-select-label .flex div [data-slot="badge"],
.p-select .p-select-label .noti-number,
.p-select .p-select-label [data-slot="badge"],
.p-dropdown .p-dropdown-label .flex div .noti-number,
.p-dropdown .p-dropdown-label .flex div [data-slot="badge"],
.p-dropdown .p-dropdown-label .noti-number,
.p-dropdown .p-dropdown-label [data-slot="badge"] {
  font-size: 0.75rem !important; /* text-xs - same as option badges */
  padding: 0.125rem 0.5rem !important; /* px-2 py-0.5 - same as option badges */
  line-height: 1.25rem !important; /* Match badge line-height */
  height: auto !important;
  min-height: auto !important;
  max-height: none !important;
  display: inline-flex !important;
  align-items: center !important;
  vertical-align: middle !important;
  margin: 0 !important;
  flex-shrink: 0 !important;
}

/* Ensure the container div doesn't expand */
.p-select .p-select-label .flex div,
.p-dropdown .p-dropdown-label .flex div {
  display: inline-flex !important;
  align-items: center !important;
  height: auto !important;
  min-height: auto !important;
  max-height: 100% !important;
  line-height: normal !important;
}

.p-select .p-placeholder,
.p-dropdown .p-placeholder {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  height: 100% !important;
  width: 100% !important;
  line-height: 36px !important;
  font-size: 0.875rem !important; /* text-sm = 14px */
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

.p-select .p-select-trigger-icon,
.p-dropdown .p-dropdown-trigger-icon {
  height: 36px !important;
  width: 36px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* PrimeVue Calendar - Match Select styling (same font size and color) */
.p-calendar {
  width: 100%; /* w-full */
  font-size: 0.875rem; /* text-sm = 14px */
  line-height: 1.25rem; /* text-sm line-height */
  font-size: 0.875rem !important; /* text-sm = 14px */
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

.p-calendar * {
  font-size: 0.875rem !important; /* text-sm = 14px - Apply to all children */
}

.p-calendar .p-inputtext,
.p-calendar input,
.p-calendar .p-datepicker-input {
  width: 100%; /* w-full */
  height: 2.25rem; /* h-9 = 36px */
  font-size: 0.875rem; /* text-sm = 14px */
  line-height: 1.25rem; /* text-sm line-height */
  height: 36px !important;
  font-size: 0.875rem !important; /* text-sm = 14px */
  line-height: 36px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  display: flex !important;
  align-items: center !important;
  color: inherit !important;
  font-weight: inherit !important;
}

.p-calendar .p-inputwrapper {
  width: 100%; /* w-full */
  font-size: 0.875rem !important; /* text-sm = 14px */
}

.p-calendar .p-datepicker-trigger {
  height: 36px !important;
  width: 36px !important;
  font-size: 0.875rem !important; /* text-sm = 14px */
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
</style>

