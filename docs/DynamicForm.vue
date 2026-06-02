<template>
  <div class="dynamic-form relative">
    <!-- Loading overlay -->
    <Transition name="form-loading-fade">
      <div
        v-if="formLoading"
        class="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-white/60 backdrop-blur-[1px]"
      >
        <div class="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 shadow-md">
          <svg class="size-4 animate-spin text-[var(--bz-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          <span class="text-sm font-medium text-[var(--bz-text-primary)]">Đang xử lý...</span>
        </div>
      </div>
    </Transition>
    <!-- Groups (Sections) - Container -->
    <div class="flex flex-col">
      <template v-for="(group, groupIndex) in (formData?.group_fields || [])" :key="group.group_key">
        <!-- For form mode (not filter), wrap in BizzoneCard -->
        <BizzoneCard
          v-if="!isFilter"
          :no-border="true"
          :has-shadow="false"
        >
          <!-- Section Header with Icon and Title -->
          <div v-if="group.group_name" class="flex items-center gap-2 mb-3">
            <component
              v-if="getGroupIcon(group)"
              :is="getGroupIcon(group)"
              class="h-[18px] w-[18px] text-[var(--bz-primary)] shrink-0"
            />
            <h3 class="text-[16px] font-bold leading-snug text-[var(--bz-text-primary)]">{{ group.group_name }}</h3>
          </div>
          
          <!-- Fields Container -->
          <div class="flex flex-col gap-4">
            <!-- Fields Grid -->
            <div class="grid grid-cols-12 gap-3">
          <div
            v-for="field in (group.fields || []).filter((f: any) => f.isVisiable === true)"
            :key="`${field.table_name}.${field.field_name}`"
            :class="convertColumnClass(field.columnClass)"
            :data-field-key="getFieldKey(field)"
          >
              <!-- Field Label – đồng bộ mockup BizzoneInput/BizzoneTextarea -->
              <div class="flex items-center justify-between gap-2 mb-1.5 w-full">
                <!-- <component
                  :is="getFieldIcon(field)"
                  class="h-4 w-4 text-[var(--bz-text-muted)] shrink-0"
                  v-if="getFieldIcon(field)"
                /> -->
                <label
                  :for="getFieldKey(field)"
                  :class="[
                    'block text-[10px] font-bold uppercase tracking-wider text-[var(--bz-text-muted)] cursor-pointer',
                    (isView || field.isDisable) && 'cursor-not-allowed',
                  ]"
                  @click="handleLabelClick(field)"
                >
                  {{ field.columnLabel }}
                  <span v-if="field.isRequire && !isFilter" class="text-[var(--bz-danger)]"> *</span>
                </label>
                <!-- Toggle giao diện grid (style-2) / list (style-3) — chỉ hiện cho file/image dùng attached-style-2 hoặc 3 -->
                <div
                  v-if="['file', 'files', 'image'].includes(field.columnType) && getEffectiveAttachedStyle(field)"
                  class="flex gap-1 shrink-0"
                >
                  <button
                    type="button"
                    :title="'Giao diện lưới'"
                    @click="setAttachedStyle(field, 'attached-style-2')"
                    :class="[
                      'inline-flex size-6 items-center justify-center rounded transition-colors',
                      getEffectiveAttachedStyle(field) === 'attached-style-2'
                        ? 'bg-[var(--bz-primary-soft)] text-[var(--bz-primary)]'
                        : 'text-gray-500 hover:bg-gray-100',
                    ]"
                  >
                    <LayoutGrid class="size-4" />
                  </button>
                  <button
                    type="button"
                    :title="'Giao diện danh sách'"
                    @click="setAttachedStyle(field, 'attached-style-3')"
                    :class="[
                      'inline-flex size-6 items-center justify-center rounded transition-colors',
                      getEffectiveAttachedStyle(field) === 'attached-style-3'
                        ? 'bg-[var(--bz-primary-soft)] text-[var(--bz-primary)]'
                        : 'text-gray-500 hover:bg-gray-100',
                    ]"
                  >
                    <List class="size-4" />
                  </button>
                </div>
              </div>
              
              <!-- Input Text -->
              <Input
                v-if="field.columnType === 'input'"
                :value="field.columnValue || ''"
                :placeholder="field.columnLabel"
                :disabled="isView || field.isDisable"
                :maxlength="field.maxLength"
                :aria-invalid="!!errors[getFieldKey(field)]"
                class="w-full"
                @input="(e: Event) => handleInputChange(field, e)"
                @change="handleFieldChange(field)"
              />
              
              <!-- Textarea -->
              <Textarea
                v-else-if="field.columnType === 'textarea'"
                :value="field.columnValue || ''"
                :placeholder="field.columnLabel"
                :disabled="isView || field.isDisable"
                :maxlength="field.maxLength"
                :aria-invalid="!!errors[getFieldKey(field)]"
                rows="3"
                class="w-full"
                @input="(e: Event) => handleInputChange(field, e)"
                @change="handleFieldChange(field)"
              />

              <!--
                Rich Text Editor — dùng cho nội dung email / thông báo cần định
                dạng (in đậm, danh sách, link…). Lưu HTML vào `field.columnValue`.
              -->
              <BizzoneRichTextEditor
                v-else-if="field.columnType === 'editor'"
                :model-value="field.columnValue || ''"
                :placeholder="field.columnLabel"
                :disabled="isView || field.isDisable"
                :invalid="!!errors[getFieldKey(field)]"
                class="w-full"
                @update:model-value="(val: string) => { field.columnValue = val }"
                @change="handleFieldChange(field)"
              />

              <!-- Number -->
              <InputNumber
                v-else-if="field.columnType === 'number'"
                :model-value="field.columnValue != null && field.columnValue !== '' ? Number(field.columnValue) : null"
                :placeholder="field.columnLabel"
                :disabled="isView || field.isDisable"
                :invalid="!!errors[getFieldKey(field)]"
                :use-grouping="true"
                locale="en-US"
                class="w-full"
                :input-class="`w-full h-9 ${field.columnValue != null && field.columnValue !== '' ? 'text-right' : 'text-left'}`"
                :input-style="{ height: '36px' }"
                @update:model-value="(val) => { field.columnValue = val; handleFieldChange(field) }"
              />

              <!-- Dropdown/Select (Single) - PrimeVue Select -->
              <Select
                v-else-if="['dropdown', 'select'].includes(field.columnType)"
                v-model="field.columnValue"
                :options="getPrimeVueOptions(field)"
                optionLabel="label"
                optionValue="value"
                :placeholder="field.columnLabel || 'Chọn...'"
                :disabled="isView || field.isDisable"
                :invalid="!!errors[getFieldKey(field)]"
                :filter="true"
                filterPlaceholder="Tìm kiếm..."
                :class="getSelectClass(field)"
                :inputStyle="{ width: '100%', height: '34px' }"
                :inputClass="getSelectInputClass(field)"
                @focus="ensureOptionsLoaded(field)"
                @change="() => { normalizeFieldValue(field); handleFieldChange(field); }"
                @show="() => normalizeFieldValue(field)"
              >
                <template #value="slotProps">
                  <div v-if="slotProps.value" class="flex items-center gap-2">
                    <div v-if="getSelectedOption(field, slotProps.value)?.isHtml" v-html="getSelectedOption(field, slotProps.value)?.htmlContent || getSelectedOption(field, slotProps.value)?.label"></div>
                    <div v-else class="flex items-center gap-2">
                      <div>{{ getSelectedOption(field, slotProps.value)?.label || slotProps.value }}</div>
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
              
              <!-- Multi Select - DropdownMenuCheckboxItem -->
              <div v-else-if="field.columnType === 'multiSelect'" class="w-full">
                <DropdownMenu class="w-full">
                  <DropdownMenuTrigger as-child class="w-full">
                    <button
                      type="button"
                      :disabled="isView || field.isDisable"
                      :class="cn(
                        'flex h-9 w-full items-center justify-between rounded-[8px] border border-input bg-[#f8f9fa] px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-[#FF893A] disabled:cursor-not-allowed disabled:opacity-50',
                        !!errors[getFieldKey(field)] && 'border-destructive ring-destructive/20'
                      )"
                    >
                      <span class="flex-1 truncate text-left">
                        <span v-if="getMultiSelectDisplayText(field)" class="text-foreground">{{ getMultiSelectDisplayText(field) }}</span>
                        <span v-else class="text-muted-foreground">{{ field.columnLabel || 'Chọn...' }}</span>
                      </span>
                      <ChevronDown class="h-4 w-4 shrink-0 opacity-50 ml-2" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent class="max-h-60 overflow-y-auto" style="width: var(--radix-dropdown-menu-trigger-width); min-width: var(--radix-dropdown-menu-trigger-width);">
                    <DropdownMenuCheckboxItem
                      v-for="option in getOptions(field)"
                      :key="option.value"

                      :checked="isOptionSelected(field, option.value)"
                      :disabled="isView || field.isDisable"
                      @update:checked="(checked: boolean) => toggleMultiSelect(field, option.value, checked)"
                      @select.prevent
                    >
                      <span v-if="option.isHtml" v-html="option.htmlContent"></span>
                      <span v-else>{{ option.label }}</span>
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <!-- Single Checkbox -->
              <div v-else-if="field.columnType === 'checkbox'" class="flex items-center gap-2">
                <Checkbox
                  :id="getFieldKey(field)"
                  :checked="getCheckboxValue(field)"
                  :disabled="isView || field.isDisable"
                  @update:checked="(checked: boolean) => updateFieldValue(field, checked)"
                />
                <Label :for="getFieldKey(field)" class="font-normal">
                  {{ field.columnLabel }}
                </Label>
              </div>
              
              <!-- Checkbox List -->
              <div v-else-if="field.columnType === 'checkboxList'" class="space-y-2">
                <div
                  v-for="option in getOptions(field)"
                  :key="option.value"
                  class="flex items-center space-x-2"
                >
                  <Checkbox
                    :id="`${getFieldKey(field)}_${option.value}`"
                    :checked="isOptionSelected(field, option.value)"
                    :disabled="isView || field.isDisable"
                    @update:checked="(checked: boolean) => toggleMultiSelect(field, option.value, checked)"
                  />
                  <Label :for="`${getFieldKey(field)}_${option.value}`" class="font-normal">
                    <span v-if="option.isHtml" v-html="option.htmlContent"></span>
                    <span v-else>{{ option.label }}</span>
                  </Label>
                </div>
              </div>
              
              <!-- Radio List -->
              <div v-else-if="field.columnType === 'checkboxradiolist'" class="space-y-2">
                <div
                  v-for="option in getOptions(field)"
                  :key="option.value"
                  class="flex items-center space-x-2"
                >
                  <input
                    type="radio"
                    :id="`${getFieldKey(field)}_${option.value}`"
                    :name="getFieldKey(field)"
                    :value="option.value"
                    v-model="field.columnValue"
                    :disabled="isView || field.isDisable"
                    @change="handleFieldChange(field)"
                    class="w-4 h-4"
                  />
                  <Label :for="`${getFieldKey(field)}_${option.value}`" class="font-normal">
                    <span v-if="option.isHtml" v-html="option.htmlContent"></span>
                    <span v-else>{{ option.label }}</span>
                  </Label>
                </div>
              </div>
              
              <!-- Select Tree with Checkbox -->
              <!-- Select Tree (Single Select) -->
              <SelectTree
                v-else-if="field.columnType === 'selectTree'"
                :tree-data="getTreeData(field)"
                :selected-values="getTreeSelectedValues(field)"
                :disabled="isView || field.isDisable"
                :placeholder="field.columnLabel || 'Chọn...'"
                @update:selected="(values) => updateTreeValue(field, values)"
                class="w-full"
              />
              
              <!-- Select Trees (Multi Select) -->
              <SelectTrees
                v-else-if="field.columnType === 'selectTrees'"
                :tree-data="getTreeData(field)"
                :selected-values="getTreeSelectedValues(field)"
                :disabled="isView || field.isDisable"
                :placeholder="field.columnLabel || 'Chọn...'"
                @update:selected="(values) => updateTreeValue(field, values)"
                class="w-full"
              />
              
              <!-- Date - Only render DatePicker, no fallback Input -->
              <DatePicker
                v-else-if="field.columnType === 'date'"
                :key="`datepicker_${getFieldKey(field)}`"
                :ref="(el) => setCalendarRef(field, el)"
                :model-value="getDateValue(field)"
                :disabled="isView || field.isDisable"
                :invalid="!!errors[getFieldKey(field)]"
                dateFormat="dd/mm/yy"
                :placeholder="field.columnLabel"
                :showIcon="true"
                :showButtonBar="true"
                :manualInput="true"
                :inputId="`date_${getFieldKey(field)}`"
                :inputStyle="{ width: '100%', height: '36px' }"
                inputClass="w-full h-9"
                class="w-full date-field-calendar"
                @update:model-value="(value) => handleDateChange(field, value)"
              />
              
              <!-- DateTime - Only render DatePicker, no fallback Input -->
              <DatePicker
                v-else-if="DATE_TIME_FIELD_TYPES.includes(field.columnType)"
                :ref="(el) => setCalendarRef(field, el)"
                :model-value="getDateValue(field)"
                :disabled="isView || field.isDisable"
                :invalid="!!errors[getFieldKey(field)]"
                dateFormat="dd/mm/yy"
                :showIcon="true"
                :showTime="field.columnType === 'datefulltime'"
                :showSeconds="field.columnType === 'datefulltime'"
                :showButtonBar="true"
                :manualInput="true"
                :placeholder="field.columnLabel"
                :inputId="`datetime_${getFieldKey(field)}`"
                :inputStyle="{ width: '100%', height: '36px' }"
                inputClass="w-full h-9"
                class="w-full"
                @update:model-value="(value) => handleDateChange(field, value)"
              />

              <!-- Time -->
              <DatePicker
                v-else-if="field.columnType === 'time'"
                timeOnly
                :key="`timepicker_${getFieldKey(field)}`"
                :ref="(el) => setCalendarRef(field, el)"
                :model-value="getDateValue(field)"
                :disabled="isView || field.isDisable"
                :invalid="!!errors[getFieldKey(field)]"
                :placeholder="field.columnLabel"
                :showIcon="true"
                :showButtonBar="true"
                :manualInput="true"
                :inputId="`time_${getFieldKey(field)}`"
                :inputStyle="{ width: '100%', height: '36px' }"
                inputClass="w-full h-9"
                class="w-full"
                @update:model-value="(value) => handleDateChange(field, value)"
              />
              
              <!-- Year -->
              <DatePicker
                v-else-if="field.columnType === 'year'"
                view="year"
                dateFormat="yy"
                :key="`yearpicker_${getFieldKey(field)}`"
                :ref="(el) => setCalendarRef(field, el)"
                :model-value="getDateValue(field)"
                :disabled="isView || field.isDisable"
                :invalid="!!errors[getFieldKey(field)]"
                :placeholder="field.columnLabel || 'YYYY'"
                :showIcon="true"
                :showButtonBar="true"
                :manualInput="true"
                :inputId="`year_${getFieldKey(field)}`"
                :inputStyle="{ width: '100%', height: '36px' }"
                inputClass="w-full h-9"
                class="w-full"
                @update:model-value="(value) => handleDateChange(field, value)"
              />
              
              <!-- Month -->
              <DatePicker
                v-else-if="field.columnType === 'month'"
                view="month"
                dateFormat="mm/yy"
                :key="`monthpicker_${getFieldKey(field)}`"
                :ref="(el) => setCalendarRef(field, el)"
                :model-value="getDateValue(field)"
                :disabled="isView || field.isDisable"
                :invalid="!!errors[getFieldKey(field)]"
                :placeholder="field.columnLabel"
                :showIcon="true"
                :showButtonBar="true"
                :manualInput="true"
                :inputId="`month_${getFieldKey(field)}`"
                :inputStyle="{ width: '100%', height: '36px' }"
                inputClass="w-full h-9"
                class="w-full"
                @update:model-value="(value) => handleDateChange(field, value)"
              />
              
              <!-- File Upload -->
              <div
                v-else-if="['file', 'files', 'image'].includes(field.columnType)"
                :class="getFileFieldBodyClass(field.columnClass)"
              >
                <div v-if="renderIcon(field.columnClass)">
                  <component :is="renderIcon(field.columnClass)" class="w-5 h-5 text-[var(--bz-text-muted)]" />
                </div>
                  
                <div
                  v-if="field.columnClass.includes(CLASS_CUSTOM_UI.attached_style_1.classReturn)"
                  class="flex space-y-2 relative w-full gap-4"
                >
                  <!-- Trái: vùng upload -->
                  <div 
                  :style="isView || field.isDisable ? 'opacity: 0.6;' : ''" 
                  class="w-full min-w-0 flex-1 space-y-2 overflow-hidden relative" :class="(isView || field.isDisable) && 'pointer-events-none cursor-not-allowed'">
                    <Input
                      :id="attachedStyleFileInputId(field)"
                      type="file"
                      :accept="field.columnType === 'image' ? 'image/*' : undefined"
                      :multiple="field.columnType === 'files'"
                      :disabled="isView || field.isDisable"
                      class="w-full absolute top-0 bottom-0 h-full opacity-0"
                      style="z-index: 99;"
                      @change="(e: Event) => handleAttachedStyleFileChange(field, e)"
                    />
                    <p class="text-[10px] font-bold uppercase tracking-wider text-[var(--bz-text-muted)]">
                      Tải file lên
                    </p>
                    <div
                      class="relative z-0 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white px-6 py-10 text-center transition-colors"
                      :class="(isView || field.isDisable) && 'pointer-events-none opacity-60'"
                    >
                      <svg class="h-10 w-10" viewBox="0 0 40 40" fill="none"><rect x="4" y="8" width="32" height="28" rx="2" fill="var(--bz-primary-soft)"></rect><path d="M14 8C14 6.89543 14.8954 6 16 6H20L22 8H32C33.1046 8 34 8.89543 34 10V32C34 33.1046 33.1046 34 32 34H8C6.89543 34 6 33.1046 6 32V10C6 8.89543 6.89543 8 8 8H14Z" fill="var(--bz-primary)"></path><rect x="10" y="16" width="20" height="2" rx="1" fill="white"></rect><rect x="10" y="22" width="16" height="2" rx="1" fill="white"></rect><rect x="10" y="28" width="12" height="2" rx="1" fill="white"></rect></svg>

                      <p class="text-sm font-medium text-[var(--bz-text-primary)]">
                        Kéo thả file vào đây hoặc
                        <label
                          style="color: var(--bz-primary) !important;"
                          class="cursor-pointer font-medium"
                        >
                          chọn file
                        </label>
                      </p>
                      <p class="mt-1 text-xs text-[var(--bz-text-muted)]">
                        Định dạng: .pdf, .jpg, .png (Tối đa 10MB)
                      </p>
                      <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          class="inline-flex items-center gap-2 rounded-lg border-2 border-[var(--bz-primary)] bg-white px-4 py-2 text-sm font-medium text-[var(--bz-primary)] transition-colors hover:bg-[var(--bz-primary)]/10"
                        >
                          <Upload class="size-4 shrink-0" />
                          Tải lên
                        </button>
                        <button
                          type="button"
                          style="box-shadow: rgb(0 0 0 / 43%) 0px 0px 2px 0px"
                          class="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-white text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          <FileText class="size-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Phải: danh sách file (chuỗi cách nhau bằng phẩy hoặc mảng) -->
                  <div class="w-full min-w-0 flex-1 space-y-2">
                    <p class="text-[10px] font-bold uppercase tracking-wider text-[var(--bz-text-muted)]">
                      File tải lên
                    </p>
                    <div
                    style="max-height: 226px; min-height: 226px;"
                      class="space-y-3 overflow-y-auto rounded-lg border border-gray-200 bg-[#f3f4f6] p-3"
                    >
                      <template v-if="(fieldLoadedFiles[getFieldKey(field)] || []).length">
                        <div
                          v-for="(fileItem, idx) in (fieldLoadedFiles[getFieldKey(field)] || [])"
                          :key="fileItem.oid || `${getFieldKey(field)}-${idx}`"
                          class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-[10px] shadow-sm group"
                        >
                          <div
                            :class="cn('flex size-10 shrink-0 items-center justify-center rounded-md', fileItemIconWrapClass(fileItem))"
                          >
                            <ImageIcon v-if="isFileItemImage(fileItem)" class="size-5 shrink-0" />
                            <FileText v-else class="size-5 shrink-0" />
                          </div>
                          <div class="min-w-0 flex-1">
                            <p class="truncate text-sm font-semibold text-[var(--bz-text-primary)]">
                              {{ fileItem.fileName || '—' }}
                            </p>
                            <p class="text-xs text-gray-400">
                              {{ getFileItemMetaLine(fileItem) }}
                            </p>
                          </div>
                          <div class="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
                            <button
                              type="button"
                              class="inline-flex size-9 items-center cursor-pointer justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                              :title="'Tải xuống'"
                              @click="handleDownloadByFileItem(fileItem)"
                            >
                              <Download class="size-4" />
                            </button>
                            <button
                              v-if="!isView && !field.isDisable"
                              type="button"
                              class="inline-flex size-9 items-center cursor-pointer justify-center rounded-md text-red-500 transition-colors hover:bg-red-50"
                              :title="'Xóa'"
                              @click="removeAttachedStyleFile(field, idx)"
                            >
                              <Trash2 class="size-4" />
                            </button>
                          </div>
                        </div>
                      </template>
                      <p v-else class="py-8 text-center text-sm text-gray-400">
                        Chưa có file
                      </p>
                    </div>
                  </div>
                </div>
                <!-- attached-style-2 / attached-style-3: cùng wrapper, có toggle icon đổi giao diện -->
                <div
                  v-else-if="getEffectiveAttachedStyle(field)"
                  class="w-full"
                >

                  <AttachedStyle2Upload
                    v-if="getEffectiveAttachedStyle(field) === 'attached-style-2'"
                    :file-items="fieldLoadedFiles[getFieldKey(field)] || []"
                    :is-view="isView"
                    :is-disable="field.isDisable"
                    :input-id="attachedStyleFileInputId(field)"
                    :accept="field.columnType === 'image' ? 'image/*' : undefined"
                    :multiple="field.columnType !== 'image'"
                    @file-change="(e) => handleAttachedStyleFileChange(field, e)"
                    @drop="(files) => handleAttachedStyle2Drop(field, files)"
                    @download="handleDownloadByFileItem"
                    @remove="(idx) => removeAttachedStyleFile(field, idx)"
                  />
                  <AttachedStyle3Upload
                    v-else
                    :file-items="fieldLoadedFiles[getFieldKey(field)] || []"
                    :is-view="isView"
                    :is-disable="field.isDisable"
                    :input-id="attachedStyleFileInputId(field)"
                    :accept="field.columnType === 'image' ? 'image/*' : undefined"
                    :multiple="field.columnType !== 'image'"
                    @file-change="(e) => handleAttachedStyleFileChange(field, e)"
                    @drop="(files) => handleAttachedStyle2Drop(field, files)"
                    @download="handleDownloadByFileItem"
                    @remove="(idx) => removeAttachedStyleFile(field, idx)"
                  />
                </div>
                <Input
                  v-else
                  type="file"
                  :accept="field.columnType === 'image' ? 'image/*' : undefined"
                  :multiple="field.columnType === 'files'"
                  :disabled="isView || field.isDisable"
                  class="w-full"
                  @change="(e: Event) => handleFileChange(field, e)"
                />
                
                <!-- Display image if columnType is 'image' and has value -->
                <div v-if="field.columnType === 'image' && field.columnValue" class="mt-2">
                  <img 
                    :src="getFileUrl(field.columnValue, field)" 
                    :alt="getFileName(field.columnValue, field)"
                    class="max-w-full h-auto max-h-48 rounded border border-gray-200"
                    @error="handleImageError"
                  />
                  <p class="text-xs text-gray-500 mt-1">
                    {{ getFileName(field.columnValue, field) }}
                  </p>
                </div>

                <!-- Display file name with download button if columnType is 'file' or 'files' and has value -->
                <div
                  v-else-if="['file', 'files'].includes(field.columnType) && field.columnValue && !field.columnClass.includes(CLASS_CUSTOM_UI.attached_style_1.classReturn) && !field.columnClass.includes(CLASS_CUSTOM_UI.attached_style_2.classReturn) && !field.columnClass.includes(CLASS_CUSTOM_UI.attached_style_3.classReturn)"
                  class="mt-2 flex items-center gap-2"
                >
                  <p class="text-xs text-gray-500 flex-1">
                    {{ getFileName(field.columnValue, field) }}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    @click="handleDownloadFile(field)"
                    class="h-7 px-2"
                  >
                    <Download class="h-3 w-3 mr-1" />
                    Tải xuống
                  </Button>
                </div>
              </div>
              
              <!-- Autocomplete (single) -->
              <AutoComplete
                v-else-if="field.columnType === 'autocomplete'"
                :modelValue="getSelectedOption(field, field.columnValue) || field.columnValue"
                :suggestions="autocompleteSuggestions[getFieldKey(field)] || []"
                @complete="(e) => searchAutocomplete(field, e)"
                optionLabel="label"
                dataKey="value"
                :placeholder="field.columnLabel || 'Tìm kiếm...'"
                :disabled="isView || field.isDisable"
                :invalid="!!errors[getFieldKey(field)]"
                :inputStyle="{ width: '100%', height: '40px' }"
                class="w-full"
                :inputClass="'theme-input flex h-10 w-full min-w-0 rounded-[8px] bg-[#f8f9fa] px-4 text-[14px] text-[#11151C] border-0 outline-none transition-all hover:bg-[#eef0f2] focus:bg-white focus:ring-1 focus:ring-[#FF893A] placeholder:text-[#6B7280] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#E6E8EB] disabled:text-[#888D96]' + (!!errors[getFieldKey(field)] ? ' ring-destructive/20 border-destructive' : '')"
                @update:modelValue="(val) => {
                  if (typeof val === 'object' && val !== null) {
                    field.columnValue = val.value || val.id || val.Oid || val.oid;
                    handleFieldChange(field);
                  } else {
                    field.columnValue = val;
                    // if (!val) {
                    //   handleFieldChange(field);
                    // }
                  }
                }"
              />

              <!-- Autocomplete (multi) -->
              <AutoComplete
                v-else-if="field.columnType === 'autocompletes'"
                :multiple="true"
                :modelValue="getAutocompleteMultiValue(field)"
                :suggestions="autocompleteSuggestions[getFieldKey(field)] || []"
                @complete="(e) => searchAutocomplete(field, e)"
                optionLabel="label"
                dataKey="value"
                :placeholder="field.columnLabel || 'Tìm kiếm...'"
                :disabled="isView || field.isDisable"
                :invalid="!!errors[getFieldKey(field)]"
                class="w-full"
                :inputClass="'theme-input flex w-full min-w-0 px-2 text-[14px] text-[#11151C] border-0 outline-none placeholder:text-[#6B7280]'"
                @update:modelValue="(val) => updateAutocompleteMultiValue(field, val)"
              />

              <!-- Chips/Tags -->
              <div v-else-if="field.columnType === 'chips'" class="space-y-2">
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="(chip, idx) in getChips(field)"
                    :key="idx"
                    class="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                  >
                    {{ chip }}
                    <button
                      v-if="!isView && !field.isDisable"
                      type="button"
                      @click="removeChip(field, (idx as number))"
                      class="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </span>
                </div>
                <Input
                  v-if="!isView && !field.isDisable"
                  :placeholder="field.columnLabel || 'Nhập và nhấn Enter'"
                  class="w-full"
                  @keydown.enter.prevent="(e: KeyboardEvent) => addChip(field, e)"
                />
              </div>
              
              <!-- Default fallback (exclude date/datetime fields as they use Calendar) -->
              <Input
                v-else-if="field.columnType !== 'date' && !['datetimes', 'datefulltime'].includes(field.columnType)"
                :value="field.columnValue || ''"
                :placeholder="field.columnLabel"
                :disabled="isView || field.isDisable"
                :aria-invalid="!!errors[getFieldKey(field)]"
                class="w-full"
                @input="(e: Event) => handleInputChange(field, e)"
                @change="handleFieldChange(field)"
              />
            <!-- Error message -->
            <p v-if="errors[getFieldKey(field)]" class="text-xs text-red-500">
              {{ errors[getFieldKey(field)] }}
            </p>
          </div>
        </div>
          </div>
        </BizzoneCard>
        
        <!-- For filter mode, render without card wrapper -->
        <div
          v-else
          class="space-y-3"
        >
          <!-- Section Title — ẩn ở filter popup (yêu cầu UI) -->
          <div v-if="group.group_name && !isFilter">
            <h3 class="text-sm text-primary-text">{{ group.group_name }}</h3>
          </div>
          <!-- Fields Grid -->
          <div class="grid grid-cols-12 gap-3">
            <div
              v-for="field in (group.fields || []).filter((f: any) => f.isVisiable === true)"
              :key="`${field.table_name}.${field.field_name}`"
              :class="convertColumnClass(field.columnClass)"
              :data-field-key="getFieldKey(field)"
            >
              <!-- Field Label – đồng bộ mockup BizzoneInput/BizzoneTextarea -->
              <div class="flex items-center justify-between gap-2 mb-1.5 w-full">
                <!-- <component
                  :is="getFieldIcon(field)"
                  class="h-4 w-4 text-[var(--bz-text-muted)] shrink-0"
                  v-if="getFieldIcon(field)"
                /> -->
                <label
                  :for="getFieldKey(field)"
                  :class="[
                    'block text-[10px] font-bold uppercase tracking-wider text-[var(--bz-text-muted)] cursor-pointer',
                    (isView || field.isDisable) && 'cursor-not-allowed',
                  ]"
                  @click="handleLabelClick(field)"
                >
                  {{ field.columnLabel }}
                  <span v-if="field.isRequire && !isFilter" class="text-[var(--bz-danger)]"> *</span>
                </label>
                <!-- Toggle giao diện grid (style-2) / list (style-3) — chỉ hiện cho file/image dùng attached-style-2 hoặc 3 -->
                <div
                  v-if="['file', 'files', 'image'].includes(field.columnType) && getEffectiveAttachedStyle(field)"
                  class="flex gap-1 shrink-0"
                >
                  <button
                    type="button"
                    :title="'Giao diện lưới'"
                    @click="setAttachedStyle(field, 'attached-style-2')"
                    :class="[
                      'inline-flex size-6 items-center justify-center rounded transition-colors',
                      getEffectiveAttachedStyle(field) === 'attached-style-2'
                        ? 'bg-[var(--bz-primary-soft)] text-[var(--bz-primary)]'
                        : 'text-gray-500 hover:bg-gray-100',
                    ]"
                  >
                    <LayoutGrid class="size-4" />
                  </button>
                  <button
                    type="button"
                    :title="'Giao diện danh sách'"
                    @click="setAttachedStyle(field, 'attached-style-3')"
                    :class="[
                      'inline-flex size-6 items-center justify-center rounded transition-colors',
                      getEffectiveAttachedStyle(field) === 'attached-style-3'
                        ? 'bg-[var(--bz-primary-soft)] text-[var(--bz-primary)]'
                        : 'text-gray-500 hover:bg-gray-100',
                    ]"
                  >
                    <List class="size-4" />
                  </button>
                </div>
              </div>
              
              <!-- Input Text -->
              <Input
                v-if="field.columnType === 'input'"
                :value="field.columnValue || ''"
                :placeholder="field.columnLabel"
                :disabled="isView || field.isDisable"
                :maxlength="field.maxLength"
                @input="(e: Event) => handleInputChange(field, e)"
                @change="handleFieldChange(field)"
              />
              
              <!-- Textarea -->
              <Textarea
                v-else-if="field.columnType === 'textarea'"
                :value="field.columnValue || ''"
                :placeholder="field.columnLabel"
                :disabled="isView || field.isDisable"
                :maxlength="field.maxLength"
                rows="3"
                @input="(e: Event) => handleInputChange(field, e)"
                @change="handleFieldChange(field)"
              />

              <!-- Rich Text Editor (xem ghi chú ở section non-filter ở trên). -->
              <BizzoneRichTextEditor
                v-else-if="field.columnType === 'editor'"
                :model-value="field.columnValue || ''"
                :placeholder="field.columnLabel"
                :disabled="isView || field.isDisable"
                :invalid="!!errors[getFieldKey(field)]"
                class="w-full"
                @update:model-value="(val: string) => { field.columnValue = val }"
                @change="handleFieldChange(field)"
              />

              <!-- Number -->
              <InputNumber
                v-else-if="field.columnType === 'number'"
                :model-value="field.columnValue != null && field.columnValue !== '' ? Number(field.columnValue) : null"
                :placeholder="field.columnLabel"
                :disabled="isView || field.isDisable"
                :use-grouping="true"
                locale="en-US"
                :class="`w-full [&_input]:w-full ${field.columnValue != null && field.columnValue !== '' ? '[&_input]:text-right' : '[&_input]:text-left'}`"
                @update:model-value="(val) => { field.columnValue = val; handleFieldChange(field) }"
              />
              
              <!-- Dropdown/Select (Single) - PrimeVue Select -->
              <Select
                v-else-if="['dropdown', 'select'].includes(field.columnType)"
                v-model="field.columnValue"
                :options="getPrimeVueOptions(field)"
                optionLabel="label"
                optionValue="value"
                :placeholder="field.columnLabel || 'Chọn...'"
                :disabled="isView || field.isDisable"
                :filter="true"
                filterPlaceholder="Tìm kiếm..."
                :class="getSelectClass(field)"
                :inputStyle="{ width: '100%', height: '33px' }"
                :inputClass="getSelectInputClass(field)"
                @change="() => { normalizeFieldValue(field); handleFieldChange(field); }"
                @show="() => normalizeFieldValue(field)"
              >
                <template #value="slotProps">
                  <div v-if="slotProps.value" class="flex items-center gap-2">
                    <div v-if="getSelectedOption(field, slotProps.value)?.isHtml" v-html="getSelectedOption(field, slotProps.value)?.htmlContent || getSelectedOption(field, slotProps.value)?.label"></div>
                    <div v-else class="flex items-center gap-2">
                      <div>{{ getSelectedOption(field, slotProps.value)?.label || slotProps.value }}</div>
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
              
              <!-- Multi Select - DropdownMenuCheckboxItem -->
              <div v-else-if="field.columnType === 'multiSelect'" class="w-full">
                <DropdownMenu class="w-full">
                  <DropdownMenuTrigger as-child class="w-full">
                    <button
                      type="button"
                      :disabled="isView || field.isDisable"
                      :class="cn(
                        'flex h-9 w-full items-center justify-between rounded-[8px] border border-input bg-[#f8f9fa] px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-[#FF893A] disabled:cursor-not-allowed disabled:opacity-50',
                        !!errors[getFieldKey(field)] && 'border-destructive ring-destructive/20'
                      )"
                    >
                      <span class="flex-1 truncate text-left">
                        <span v-if="getMultiSelectDisplayText(field)" class="text-foreground">{{ getMultiSelectDisplayText(field) }}</span>
                        <span v-else class="text-muted-foreground">{{ field.columnLabel || 'Chọn...' }}</span>
                      </span>
                      <ChevronDown class="h-4 w-4 shrink-0 opacity-50 ml-2" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent class="max-h-60 overflow-y-auto" style="width: var(--radix-dropdown-menu-trigger-width); min-width: var(--radix-dropdown-menu-trigger-width);">
                    <DropdownMenuCheckboxItem
                      v-for="option in getOptions(field)"
                      :key="option.value"
                      :checked="isOptionSelected(field, option.value)"
                      :disabled="isView || field.isDisable"
                      @update:checked="(checked: boolean) => toggleMultiSelect(field, option.value, checked)"
                      @select.prevent
                    >
                      <span v-if="option.isHtml" v-html="option.htmlContent"></span>
                      <span v-else>{{ option.label }}</span>
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <!-- Single Checkbox -->
              <div v-else-if="field.columnType === 'checkbox'" class="flex items-center space-x-2">
                <Checkbox
                  :id="getFieldKey(field)"
                  :checked="getCheckboxValue(field)"
                  :disabled="isView || field.isDisable"
                  @update:checked="(checked: boolean) => updateFieldValue(field, checked)"
                />
                <Label :for="getFieldKey(field)" class="font-normal">
                  {{ field.columnLabel }}
                </Label>
              </div>
              
              <!-- Checkbox List -->
              <div v-else-if="field.columnType === 'checkboxList'" class="space-y-2">
                <div
                  v-for="option in getOptions(field)"
                  :key="option.value"
                  class="flex items-center space-x-2"
                >
                  <Checkbox
                    :id="`${getFieldKey(field)}_${option.value}`"
                    :checked="isOptionSelected(field, option.value)"
                    :disabled="isView || field.isDisable"
                    @update:checked="(checked: boolean) => toggleMultiSelect(field, option.value, checked)"
                  />
                  <Label :for="`${getFieldKey(field)}_${option.value}`" class="font-normal">
                    <span v-if="option.isHtml" v-html="option.htmlContent"></span>
                    <span v-else>{{ option.label }}</span>
                  </Label>
                </div>
              </div>
              
              <!-- Radio List -->
              <div v-else-if="field.columnType === 'checkboxradiolist'" class="space-y-2">
                <div
                  v-for="option in getOptions(field)"
                  :key="option.value"
                  class="flex items-center space-x-2"
                >
                  <input
                    type="radio"
                    :id="`${getFieldKey(field)}_${option.value}`"
                    :name="getFieldKey(field)"
                    :value="option.value"
                    v-model="field.columnValue"
                    :disabled="isView || field.isDisable"
                    @change="handleFieldChange(field)"
                    class="w-4 h-4"
                  />
                  <Label :for="`${getFieldKey(field)}_${option.value}`" class="font-normal">
                    <span v-if="option.isHtml" v-html="option.htmlContent"></span>
                    <span v-else>{{ option.label }}</span>
                  </Label>
                </div>
              </div>
              
              <!-- Select Tree with Checkbox -->
              <!-- Select Tree (Single Select) -->
              <SelectTree
                v-else-if="field.columnType === 'selectTree'"
                :tree-data="getTreeData(field)"
                :selected-values="getTreeSelectedValues(field)"
                :disabled="isView || field.isDisable"
                :placeholder="field.columnLabel || 'Chọn...'"
                @update:selected="(values) => updateTreeValue(field, values)"
                class="w-full"
              />
              
              <!-- Select Trees (Multi Select) -->
              <SelectTrees
                v-else-if="field.columnType === 'selectTrees'"
                :tree-data="getTreeData(field)"
                :selected-values="getTreeSelectedValues(field)"
                :disabled="isView || field.isDisable"
                :placeholder="field.columnLabel || 'Chọn...'"
                @update:selected="(values) => updateTreeValue(field, values)"
                class="w-full"
              />
              
              <!-- Date - Only render DatePicker, no fallback Input -->
              <DatePicker
                v-else-if="['date', 'datetime'].includes(field.columnType)"
                :key="`datepicker_${getFieldKey(field)}`"
                :ref="(el) => setCalendarRef(field, el)"
                :model-value="getDateValue(field)"
                :disabled="isView || field.isDisable"
                dateFormat="dd/mm/yy"
                :placeholder="field.columnLabel"
                :showIcon="true"
                :showButtonBar="true"
                :manualInput="true"
                :inputId="`date_${getFieldKey(field)}`"
                :inputStyle="{ width: '100%', height: '36px' }"
                inputClass="w-full h-9"
                class="w-full date-field-calendar"
                @update:model-value="(value) => handleDateChange(field, value)"
              />
              
              <!-- DateTime - Only render DatePicker, no fallback Input -->
              <DatePicker
                v-else-if="DATE_TIME_FIELD_TYPES.includes(field.columnType)"
                :ref="(el) => setCalendarRef(field, el)"
                :model-value="getDateValue(field)"
                :disabled="isView || field.isDisable"
                dateFormat="dd/mm/yy"
                :showIcon="true"
                :showTime="field.columnType === 'datefulltime'"
                :showSeconds="field.columnType === 'datefulltime'"
                :showButtonBar="true"
                :manualInput="true"
                :placeholder="field.columnLabel"
                :inputId="`datetime_${getFieldKey(field)}`"
                :inputStyle="{ width: '100%', height: '36px' }"
                inputClass="w-full h-9"
                class="w-full"
                @update:model-value="(value) => handleDateChange(field, value)"
              />

              <!-- Time -->
              <DatePicker
                v-else-if="field.columnType === 'time'"
                timeOnly
                :key="`timepicker_${getFieldKey(field)}`"
                :ref="(el) => setCalendarRef(field, el)"
                :model-value="getDateValue(field)"
                :disabled="isView || field.isDisable"
                :invalid="!!errors[getFieldKey(field)]"
                :placeholder="field.columnLabel"
                :showIcon="true"
                :showButtonBar="true"
                :manualInput="true"
                :inputId="`time_${getFieldKey(field)}`"
                :inputStyle="{ width: '100%', height: '36px' }"
                inputClass="w-full h-9"
                class="w-full"
                @update:model-value="(value) => handleDateChange(field, value)"
              />
              
              <!-- Year -->
              <DatePicker
                v-else-if="field.columnType === 'year'"
                view="year"
                dateFormat="yy"
                :key="`yearpicker_${getFieldKey(field)}`"
                :ref="(el) => setCalendarRef(field, el)"
                :model-value="getDateValue(field)"
                :disabled="isView || field.isDisable"
                :invalid="!!errors[getFieldKey(field)]"
                :placeholder="field.columnLabel || 'YYYY'"
                :showIcon="true"
                :showButtonBar="true"
                :manualInput="true"
                :inputId="`year_${getFieldKey(field)}`"
                :inputStyle="{ width: '100%', height: '36px' }"
                inputClass="w-full h-9"
                class="w-full"
                @update:model-value="(value) => handleDateChange(field, value)"
              />
              
              <!-- Month -->
              <DatePicker
                v-else-if="field.columnType === 'month'"
                view="month"
                dateFormat="mm/yy"
                :key="`monthpicker_${getFieldKey(field)}`"
                :ref="(el) => setCalendarRef(field, el)"
                :model-value="getDateValue(field)"
                :disabled="isView || field.isDisable"
                :invalid="!!errors[getFieldKey(field)]"
                :placeholder="field.columnLabel"
                :showIcon="true"
                :showButtonBar="true"
                :manualInput="true"
                :inputId="`month_${getFieldKey(field)}`"
                :inputStyle="{ width: '100%', height: '36px' }"
                inputClass="w-full h-9"
                class="w-full"
                @update:model-value="(value) => handleDateChange(field, value)"
              />
              
              <!-- File Upload -->
              <div v-else-if="['file', 'files', 'image'].includes(field.columnType)">
                <Input
                  type="file"
                  :accept="field.columnType === 'image' ? 'image/*' : undefined"
                  :multiple="field.columnType === 'files'"
                  :disabled="isView || field.isDisable"
                  @change="(e: Event) => handleFileChange(field, e)"
                />
                
                <!-- Display image if columnType is 'image' and has value -->
                <div v-if="field.columnType === 'image' && field.columnValue" class="mt-2">
                  <img 
                    :src="getFileUrl(field.columnValue, field)" 
                    :alt="getFileName(field.columnValue, field)"
                    class="max-w-full h-auto max-h-48 rounded border border-gray-200"
                    @error="handleImageError"
                  />
                  <p class="text-xs text-gray-500 mt-1">
                    {{ getFileName(field.columnValue, field) }}
                  </p>
                </div>
                
                <!-- Display file name with download button if columnType is 'file' or 'files' and has value -->
                <div v-else-if="['file', 'files'].includes(field.columnType) && field.columnValue" class="mt-2 flex items-center gap-2">
                  <p class="text-xs text-gray-500 flex-1">
                    {{ getFileName(field.columnValue, field) }}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    @click="handleDownloadFile(field)"
                    class="h-7 px-2"
                  >
                    <Download class="h-3 w-3 mr-1" />
                    Tải xuống
                  </Button>
                </div>
              </div>
              
              <!-- Autocomplete (single) -->
              <AutoComplete
                v-else-if="field.columnType === 'autocomplete'"
                :modelValue="getSelectedOption(field, field.columnValue) || field.columnValue"
                :suggestions="autocompleteSuggestions[getFieldKey(field)] || []"
                @complete="(e) => searchAutocomplete(field, e)"
                optionLabel="label"
                dataKey="value"
                :placeholder="field.columnLabel || 'Tìm kiếm...'"
                :disabled="isView || field.isDisable"
                :invalid="!!errors[getFieldKey(field)]"
                :inputStyle="{ width: '100%', height: '40px' }"
                class="w-full"
                :inputClass="'theme-input flex h-10 w-full min-w-0 rounded-[8px] bg-[#f8f9fa] px-4 text-[14px] text-[#11151C] border-0 outline-none transition-all hover:bg-[#eef0f2] focus:bg-white focus:ring-1 focus:ring-[#FF893A] placeholder:text-[#6B7280] disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#E6E8EB] disabled:text-[#888D96]' + (!!errors[getFieldKey(field)] ? ' ring-destructive/20 border-destructive' : '')"
                @update:modelValue="(val) => {
                  if (typeof val === 'object' && val !== null) {
                    field.columnValue = val.value || val.id || val.Oid || val.oid;
                    handleFieldChange(field);
                  } else {
                    field.columnValue = val;
                    if (!val) {
                      handleFieldChange(field);
                    }
                  }
                }"
              />

              <!-- Autocomplete (multi) -->
              <AutoComplete
                v-else-if="field.columnType === 'autocompletes'"
                :multiple="true"
                :modelValue="getAutocompleteMultiValue(field)"
                :suggestions="autocompleteSuggestions[getFieldKey(field)] || []"
                @complete="(e) => searchAutocomplete(field, e)"
                optionLabel="label"
                dataKey="value"
                :placeholder="field.columnLabel || 'Tìm kiếm...'"
                :disabled="isView || field.isDisable"
                :invalid="!!errors[getFieldKey(field)]"
                class="w-full"
                :inputClass="'theme-input flex w-full min-w-0 px-2 text-[14px] text-[#11151C] border-0 outline-none placeholder:text-[#6B7280]'"
                @update:modelValue="(val) => updateAutocompleteMultiValue(field, val)"
              />
              
              <!-- Chips/Tags -->
              <div v-else-if="field.columnType === 'chips'" class="space-y-2">
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="(chip, idx) in getChips(field)"
                    :key="idx"
                    class="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                  >
                    {{ chip }}
                    <button
                      v-if="!isView && !field.isDisable"
                      type="button"
                      @click="removeChip(field, (idx as number))"
                      class="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </span>
                </div>
                <Input
                  v-if="!isView && !field.isDisable"
                  :placeholder="field.columnLabel || 'Nhập và nhấn Enter'"
                  @keydown.enter.prevent="(e: KeyboardEvent) => addChip(field, e)"
                />
              </div>
              
              <!-- Default fallback (exclude date/datetime fields as they use Calendar) -->
              <Input
                v-else-if="field.columnType !== 'date' && !DATE_TIME_FIELD_TYPES.includes(field.columnType)"
                :value="field.columnValue || ''"
                :placeholder="field.columnLabel"
                :disabled="isView || field.isDisable"
                :aria-invalid="!!errors[getFieldKey(field)]"
                @input="(e: Event) => handleInputChange(field, e)"
                @change="handleFieldChange(field)"
              />
              
              <!-- Error message -->
              <p v-if="errors[getFieldKey(field)]" class="text-xs text-red-500">
                {{ errors[getFieldKey(field)] }}
              </p>
            </div>
          </div>
        </div>
      </template>
    </div> <!-- Close groups container -->
    
    <!-- Actions -->
    <div v-if="showButtons" class="flex justify-end gap-3 mt-6 pt-4 border-t border-border-gray/20">
      <Button variant="outline" @click="$emit('close')" class="px-6">
        {{ isView ? 'Quay lại' : 'Đóng' }}
      </Button>
      <Button 
        v-if="!isView" 
        @click="handleSubmit" 
        :disabled="hasErrors" 
        class="px-6"
      >
        {{ isFilter ? 'Lọc' : 'Lưu' }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
// import Card from '@/shared/ui/Card.vue'
// import CardContent from '@/shared/ui/CardContent.vue'
// import CardHeader from '@/shared/ui/CardHeader.vue'
// import CardTitle from '@/shared/ui/CardTitle.vue'
import Input from '@/shared/ui/Input.vue'
import Textarea from '@/shared/ui/Textarea.vue'
import BizzoneRichTextEditor from '@/components/BizzoneRichTextEditor.vue'
import Label from '@/shared/ui/Label.vue'
import Button from '@/shared/ui/Button.vue'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import AutoComplete from 'primevue/autocomplete'
import Checkbox from '@/shared/ui/Checkbox.vue'
import SelectTree from '@/components/SelectTree.vue'
import SelectTrees from '@/components/SelectTrees.vue'
import DatePicker from 'primevue/datepicker'
import BizzoneCard from '@/components/BizzoneCard.vue'
import AttachedStyle2Upload from '@/components/AttachedStyle2Upload.vue'
import AttachedStyle3Upload from '@/components/AttachedStyle3Upload.vue'
import DropdownMenu from '@/shared/ui/DropdownMenu.vue'
import DropdownMenuTrigger from '@/shared/ui/DropdownMenuTrigger.vue'
import DropdownMenuContent from '@/shared/ui/DropdownMenuContent.vue'
import DropdownMenuCheckboxItem from '@/shared/ui/DropdownMenuCheckboxItem.vue'
import { cn } from '@/shared/ui/utils'
import {
  ChevronDown,
  User,
  // Mail,
  Phone,
  Building,
  // IdCard,
  MapPin,
  CreditCard,
  // Hash,
  // Type,
  // CheckSquare,
  // List,
  // MessageSquare,
  // Calendar as CalendarIcon,
  // Clock,
  Download,
  Image as ImageIcon,
  FileText,
  Folder,
  Package,
  Settings,
  Info,
  FileCheck,
  ClipboardList,
  Layers,
  Camera,
  Upload,
  Trash2,
  LayoutGrid,
  List,
} from 'lucide-vue-next'
import axios from 'axios'
import { useRuntimeShomeBase } from '@/utils/axiosRuntimeBase'
import { useAuthStore } from '@/stores/auth'
import { useProjectStore } from '@/stores/project'
import storageService from '@/services/storage.service'
import reportService from '@/services/report.service'
import { applyAcceptLanguageToAxiosRequest } from '@/utils/requestLocale'
import { setUrlQueryParam, urlHasParamValue } from '@/utils/urlQuery'

// Danh sách columnType được xem là trường ngày giờ trong DynamicForm.
const DATE_TIME_FIELD_TYPES = ['datetimes', 'datefulltime', 'datetime', 'datepicker']

const CLASS_CUSTOM_UI = {
  card_style_1: {
    classReturn: 'card-style-1',
    bodyClass: 'card-style-1-body'
  },
  attached_style_1: {
    classReturn: 'attached-style-1',
    bodyClass: 'attached-style-1-body'
  },
  attached_style_2: {
    classReturn: 'attached-style-2',
    bodyClass: 'attached-style-2-body'
  },
  attached_style_3: {
    classReturn: 'attached-style-3',
    bodyClass: 'attached-style-3-body'
  }
}

/** attached-style-1: định dạng + giới hạn (đồng bộ validate / icon / gợi ý UI) */
const ATTACHED_STYLE_MAX_FILE_BYTES = 10 * 1024 * 1024
const ATTACHED_STYLE_ALLOWED_EXTENSIONS = [
  'pdf',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'svg',
  'ico',
  'xlsx',
  'xls',
  'csv',
  'dwg',
  'dxf',
  'dwf',
  'doc',
  'docx'
] as const
const ATTACHED_STYLE_ALLOWED_EXT_SET = new Set<string>(ATTACHED_STYLE_ALLOWED_EXTENSIONS)
/** Ảnh: icon Image + nền primary-soft (subset của ALLOWED) */
const ATTACHED_STYLE_IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'svg',
  'ico',
])
const ATTACHED_STYLE_FORMATS_HINT = ATTACHED_STYLE_ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(', ')

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
        console.error('[DynamicForm API Shome] Failed to get token:', error)
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
        console.error('[DynamicForm API Shome] Token refresh error:', refreshError)
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
  responses: any
  isFilter?: boolean
  isView?: boolean
  showButtons?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isFilter: false,
  isView: false,
  showButtons: true,
})

const emit = defineEmits<{
  (e: 'submit', payload: any): void
  (e: 'callbackReload', event: any): void
  (e: 'close'): void
}>()

const toast = useToast()

const formLoading = ref(false)

const formData = ref(props.responses)

// Update formData when props.responses thay reference (KHÔNG dùng deep để tránh re-init mỗi lần
// user gõ field — vì v-model mutate trực tiếp field.columnValue → trigger deep watcher).
watch(() => props.responses, (newVal) => {
  formData.value = newVal
  fieldLoadedFiles.value = {}

  // Chạy lại toàn bộ init khi form data thay đổi (vd. popover filter load sau khi mount):
  // fetchOptions cho dropdown/select/multiSelect, fetchAutocomplete cho autocomplete có value,
  // loadFieldFiles cho file/image có value + columnObject.
  initializeFormFields(newVal)
})
const errors = ref<Record<string, string>>({})
const optionsCache = ref<Record<string, any[]>>({})
const autocompleteSuggestions = ref<Record<string, any[]>>({})
const calendarRefs = ref<Record<string, any>>({})
// Cache for file info from GetFileInfo API
const fileInfoCache = ref<Record<string, any>>({})
/** Blob URLs cho preview File — revoke khi đổi field / unmount (theo Form.demo) */
const fileBlobUrlsCache = ref<Record<string, { fileId: string; url: string }>>({})
/**
 * Cache danh sách file đã load từ API (keyed by fieldKey).
 * Mỗi item: { url, fileName, oid, groupFileId, size, contentType, ... }
 */
const fieldLoadedFiles = ref<Record<string, any[]>>({})

/**
 * User override cho attached-style của từng field (khi click icon toggle).
 * Key = field key, value = 'attached-style-2' | 'attached-style-3'.
 * Nếu không có override → dùng class gốc từ columnClass.
 */
const attachedStyleOverrides = ref<Record<string, 'attached-style-2' | 'attached-style-3'>>({})

const getEffectiveAttachedStyle = (field: any): 'attached-style-2' | 'attached-style-3' | null => {
  const key = getFieldKey(field)
  const override = attachedStyleOverrides.value[key]
  if (override) return override
  const cc = String(field.columnClass || '')
  if (cc.includes(CLASS_CUSTOM_UI.attached_style_2.classReturn)) return 'attached-style-2'
  if (cc.includes(CLASS_CUSTOM_UI.attached_style_3.classReturn)) return 'attached-style-3'
  return null
}

const setAttachedStyle = (field: any, style: 'attached-style-2' | 'attached-style-3') => {
  attachedStyleOverrides.value = {
    ...attachedStyleOverrides.value,
    [getFieldKey(field)]: style,
  }
}

/**
 * Load danh sách file từ API.
 * columnObject đã chứa sẵn Oid trong URL (vd. /api/v1/meta/GetMetaDetail?Oid=xxx)
 * → gọi thẳng, không truyền thêm params để tránh duplicate Oid.
 */
async function loadFieldFiles(field: any) {
  if (!field.columnObject || !field.columnValue) return
  const key = getFieldKey(field)
  try {
    const res = await apiShome.get(field.columnObject)
    let payload: any = res.data
    // Bóc envelope: { statusCode: 1, data: [...] } hoặc { status: 'success', data: [...] }
    if (payload?.statusCode === 1 || payload?.status === 'success') {
      payload = payload.data
    }
    fieldLoadedFiles.value[key] = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : []
  } catch {
    fieldLoadedFiles.value[key] = []
  }
}

// Utility function to convert Bootstrap col-* classes to Tailwind col-span-*
const convertColumnClass = (columnClass: string): string => {
  if (!columnClass) return 'col-span-6' // Default to half width (6/12 = 50%)
  
  // Handle explicit cases for exact mapping because Tailwind CSS purge ignores dynamically constructed class strings
  const colMap: Record<string, string> = {
    'col-1': 'col-span-1',   // 8.33%
    'col-2': 'col-span-2',   // 16.66%
    'col-3': 'col-span-3',   // 25%
    'col-4': 'col-span-4',   // 33.33%
    'col-5': 'col-span-5',   // 41.66%
    'col-6': 'col-span-6',   // 50%
    'col-7': 'col-span-7',   // 58.33%
    'col-8': 'col-span-8',   // 66.66%
    'col-9': 'col-span-9',   // 75%
    'col-10': 'col-span-10', // 83.33%
    'col-11': 'col-span-11', // 91.66%
    'col-12': 'col-span-12', // 100%
  }

  // Split classes by whitespace (handles trailing spaces and multiple classes e.g. "col-12 mb-4")
  const classes = columnClass.split(/\s+/).filter(Boolean)
  const mappedClasses = classes.map(c => colMap[c] || c)
  
  // Default to full width for attached-style-2/3; half width for everything else
  if (!mappedClasses.some(c => c.startsWith('col-span-'))) {
    const isFullWidthStyle =
      columnClass.includes(CLASS_CUSTOM_UI.attached_style_2.classReturn) ||
      columnClass.includes(CLASS_CUSTOM_UI.attached_style_3.classReturn)
    mappedClasses.push(isFullWidthStyle ? 'col-span-12' : 'col-span-6')
  }
  
  return mappedClasses.join(' ')
}

const getFileFieldBodyClass = (columnClass: string): string => {
  switch (true) {
    case String(columnClass || '').includes(CLASS_CUSTOM_UI.card_style_1.classReturn):
      return CLASS_CUSTOM_UI.card_style_1.bodyClass
    case String(columnClass || '').includes(CLASS_CUSTOM_UI.attached_style_1.classReturn):
      return CLASS_CUSTOM_UI.attached_style_1.bodyClass
    case String(columnClass || '').includes(CLASS_CUSTOM_UI.attached_style_2.classReturn):
      return CLASS_CUSTOM_UI.attached_style_2.bodyClass
    case String(columnClass || '').includes(CLASS_CUSTOM_UI.attached_style_3.classReturn):
      return CLASS_CUSTOM_UI.attached_style_3.bodyClass
    default:
      return ''
  }
}

const renderIcon = (columnClass: string) => {
  switch (true) {
    case String(columnClass || '').includes('card-style-1'):
      return Camera
    default:
      return null
  }
}

// Get unique field key
const getFieldKey = (field: any) => {
  return `${field.table_name}.${field.field_name}`
}

// Get checkbox value (handle different data types)
const getCheckboxValue = (field: any) => {
  const value = field.columnValue
  
  // Handle boolean
  if (typeof value === 'boolean') {
    return value
  }
  
  // Handle string
  if (typeof value === 'string') {
    const lowerValue = value.toLowerCase()
    return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes'
  }
  
  // Handle number
  if (typeof value === 'number') {
    return value === 1
  }
  
  // Default to false
  return false
}

// Get display text for multiSelect: returns comma-separated labels of selected options
const getMultiSelectDisplayText = (field: any): string => {
  const value = field.columnValue
  if (!value && value !== 0) return ''

  const options = getOptions(field)

  let selectedValues: string[] = []
  if (Array.isArray(value)) {
    selectedValues = value.map((v: any) =>
      typeof v === 'object' && v !== null
        ? String(v.value || v.id || v.Oid || v.oid || '')
        : String(v)
    )
  } else if (typeof value === 'string' && value.trim() !== '') {
    selectedValues = value.split(',').map((v: string) => v.trim()).filter(Boolean)
  } else {
    selectedValues = [String(value)]
  }

  if (selectedValues.length === 0) return ''

  const labels = selectedValues
    .map((val: string) => {
      const opt = options.find((o: any) => String(o.value) === val)
      return opt ? opt.label : val
    })
    .filter(Boolean)

  return labels.join(', ')
}

// Get or fetch options for dropdown
// Empty array reference dùng chung — tránh tạo mới `[]` mỗi lần gọi khi cache miss
// (mỗi mảng mới khiến :options của PrimeVue Select bị diff → reflow không cần thiết)
const EMPTY_OPTIONS: readonly unknown[] = Object.freeze([])

const getOptions = (field: any) => {
  const key = getFieldKey(field)
  return optionsCache.value[key] || (EMPTY_OPTIONS as any[])
}

// Normalize value for case-insensitive comparison (for Select component matching)
const getNormalizedValue = (value: any): any => {
  if (value === null || value === undefined || value === '') {
    return value
  }
  // Convert to string and lowercase for case-insensitive comparison
  return String(value).toLowerCase()
}

// Get PrimeVue options — fetchOptions đã normalize shape {value,label,isHtml,htmlContent}
// nên trả thẳng cache (reference ổn định) để Select không bị diff lại mỗi render
const getPrimeVueOptions = (field: any) => {
  return getOptions(field)
}

// Watch for field value changes to handle case-insensitive matching
const normalizeFieldValue = (field: any) => {
  const currentValue = field.columnValue
  if (currentValue === null || currentValue === undefined || currentValue === '') {
    return
  }
  
  const options = getOptions(field)
  const normalizedCurrent = getNormalizedValue(currentValue)
  
  // Find option that matches (case-insensitive)
  const matchedOption = options.find((opt: any) => 
    getNormalizedValue(opt.value) === normalizedCurrent
  )
  
  // If found a match with different case, update the field value to match the option's original value
  if (matchedOption && matchedOption.value !== currentValue) {
    field.columnValue = matchedOption.value
  }
}

// Get selected option for value template
const getSelectedOption = (field: any, value: any) => {
  if (!value) return null
  const options = getPrimeVueOptions(field)
  const normalizedValue = getNormalizedValue(value)
  return options.find((opt: any) =>
    getNormalizedValue(opt.value) === normalizedValue
  ) || null
}

// Convert autocompletes columnValue ("A1,A2" | array | null) → array of option objects
// for PrimeVue AutoComplete multiple mode
const getAutocompleteMultiValue = (field: any): any[] => {
  const raw = field.columnValue
  if (raw === null || raw === undefined || raw === '') return []

  const values: string[] = Array.isArray(raw)
    ? raw.map((v: any) =>
        typeof v === 'object' && v !== null
          ? String(v.value ?? v.id ?? v.Oid ?? v.oid ?? '')
          : String(v),
      )
    : String(raw)
        .split(',')
        .map((v: string) => v.trim())
        .filter((v: string) => v !== '')

  const options = getPrimeVueOptions(field)
  return values.map((val: string) => {
    const normalized = getNormalizedValue(val)
    const matched = options.find((opt: any) => getNormalizedValue(opt.value) === normalized)
    return matched || { value: val, label: val }
  })
}

// Convert AutoComplete (multiple) array of selected option objects → comma-separated string
const updateAutocompleteMultiValue = (field: any, val: any) => {
  if (!Array.isArray(val)) {
    field.columnValue = val ?? null
    handleFieldChange(field)
    return
  }
  const ids = val
    .map((v: any) =>
      typeof v === 'object' && v !== null
        ? String(v.value ?? v.id ?? v.Oid ?? v.oid ?? '')
        : String(v ?? ''),
    )
    .filter((s: string) => s !== '')
  field.columnValue = ids.length > 0 ? ids.join(',') : null
  handleFieldChange(field)
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
    console.warn('[DynamicForm] Failed to extract classes from HTML:', e)
    return ''
  }
}

// Get class for Select component with conditional class from HTML label
const getSelectClass = (field: any): string => {
  const baseClass = 'w-full'
  const selected = getSelectedOption(field, field.columnValue)
  
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
const getSelectInputClass = (field: any): string => {
  const baseClass = 'w-full h-9'
  const selected = getSelectedOption(field, field.columnValue)
  
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

// Get tree data for selectTree
const getTreeData = (field: any) => {
  const key = getFieldKey(field)
  return optionsCache.value[key] || []
}

// Get tree selected values
const getTreeSelectedValues = (field: any) => {
  if (!field.columnValue) {
    return []
  }
  
  // Handle array
  if (Array.isArray(field.columnValue)) {
    const result = field.columnValue.map((v: any) => {
      // If array contains objects, extract value
      if (typeof v === 'object' && v !== null) {
        return v.value || v.id || v.Oid || v.oid || String(v)
      }
      return String(v)
    })
    return result
  }

  // Handle object - extract value from object
  if (typeof field.columnValue === 'object' && field.columnValue !== null) {
    const objValue = field.columnValue.value || field.columnValue.id || field.columnValue.Oid || field.columnValue.oid
    const result = objValue ? [String(objValue)] : []
    return result
  }

  // Handle string - split by comma for selectTrees, single value for selectTree
  if (typeof field.columnValue === 'string' && field.columnValue.trim() !== '') {
    if (field.columnType === 'selectTrees') {
      // Multi-select: split by comma
      const result = field.columnValue.split(',').map((v: string) => v.trim()).filter((v: string) => v !== '')
      return result
    } else {
      // Single-select: return the string value directly (no need to split if no comma)
      // If it contains comma, take first value; otherwise use the whole string
      const trimmedValue = field.columnValue.trim()
      if (trimmedValue.includes(',')) {
        const values = trimmedValue.split(',').map((v: string) => v.trim()).filter((v: string) => v !== '')
        const result = values.length > 0 ? [values[0]] : []
        return result
      } else {
        // No comma - return the whole string as single value
        const result = [trimmedValue]
        return result
      }
    }
  }
  
  // Other types (number, boolean, etc.) - convert to string array
  if (field.columnValue !== null && field.columnValue !== undefined && field.columnValue !== '') {
    const result = [String(field.columnValue)]
    return result
  }
  
  return []
}

// Update tree value
const updateTreeValue = (field: any, values: any) => {
  
  // Convert values to string format
  let columnValueString: string | null = null
  
  if (values) {
    if (typeof values === 'string') {
      // Already string format
      // For selectTree (single), use as is
      // For selectTrees (multi), it's already comma-separated
      columnValueString = values.trim() !== '' ? values : null
    } else if (Array.isArray(values)) {
      // Convert array to string
      const filtered = values
        .filter(v => v !== '' && v !== 'undefined' && v !== 'null' && v !== null && v !== undefined)
        .map(v => {
          // If array contains objects, extract value
          if (typeof v === 'object' && v !== null) {
            return v.value || v.id || v.Oid || v.oid || String(v)
          }
          return String(v)
        })
      
      if (filtered.length === 0) {
        columnValueString = null
      } else if (field.columnType === 'selectTree') {
        // Single select: take first value only
        columnValueString = String(filtered[0])
      } else {
        // Multi select: join with comma
        columnValueString = filtered.join(',')
      }
    } else if (typeof values === 'object' && values !== null) {
      // Handle object - extract value from object
      const objValue = values.value || values.id || values.Oid || values.oid
      columnValueString = objValue ? String(objValue) : null
    } else {
      // Convert other types to string
      columnValueString = String(values)
    }
  }
  
  // Set string vào columnValue
  field.columnValue = columnValueString
  
  handleFieldChange(field)
}

// Fetch options from API
const fetchOptions = async (field: any) => {
  if (!field.columnObject) return
  
  const key = getFieldKey(field)
  
  try {
    // Check for mock filter options only (for filter forms)
    const mockFilterOptions = (window as any).__MOCK_FILTER_OPTIONS__
    if (mockFilterOptions && mockFilterOptions[field.columnObject]) {
      optionsCache.value[key] = mockFilterOptions[field.columnObject]
      return
    }
    
    // Parse URL and handle dependencies
    let url = field.columnObject
    
    // Replace dependency placeholders (e.g., {provinceOid})
    const matches = url.match(/\{(\w+)\}/g)
    if (matches) {
      matches.forEach((match: string) => {
        const fieldName = match.replace(/[{}]/g, '')
        // Find field value in form
        const dependentField = findFieldByName(fieldName)
        if (dependentField) {
          url = url.replace(match, dependentField.columnValue || '')
        } else {
          // If dependency not found, replace with empty string
          url = url.replace(match, '')
        }
      })
    }
    
    // Clean up URL - remove trailing ? or &= if empty
    url = url.replace(/[?&]$/, '').replace(/[?&]&/, '?').replace(/&&+/, '&')
    
    const httpRes = await apiShome.get(url)
    let payload: any = httpRes.data

    // Bóc envelope chuẩn (axios trả body trong .data; API có thể bọc thêm statusCode/data)
    if (
      payload &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      payload.data !== undefined &&
      payload.status === 'success'
    ) {
      payload = payload.data
    }

    // selectTree / selectTrees — thử nhiều dạng JSON như Form.demo
    if (field.columnType === 'selectTree' || field.columnType === 'selectTrees') {
      let treeData: any[] = []

      if (Array.isArray(payload)) {
        treeData = payload
      } else if (payload?.data) {
        if (Array.isArray(payload.data)) {
          treeData = payload.data
        } else if (payload.data.data && Array.isArray(payload.data.data)) {
          treeData = payload.data.data
        } else if (payload.data.children && Array.isArray(payload.data.children)) {
          treeData = payload.data.children
        } else if (payload.data.value || payload.data.id || payload.data.Oid) {
          treeData = [payload.data]
        }
      } else if (payload?.children && Array.isArray(payload.children)) {
        treeData = payload.children
      } else if (payload?.value || payload?.id || payload?.Oid) {
        treeData = [payload]
      }

      optionsCache.value[key] = treeData
      return
    }

    let options: any[] = []
    if (Array.isArray(payload)) {
      options = payload.map((item: any) => ({
        value: item.value || item.id || item.Oid,
        label: item.label || item.name || item.text,
        isHtml: item.isHtml || false,
        htmlContent: item.isHtml ? (item.label || item.name || item.text) : null,
      }))
    } else if (Array.isArray(payload?.data)) {
      options = payload.data.map((item: any) => ({
        value: item.value || item.id || item.Oid,
        label: item.label || item.name || item.text,
        isHtml: item.isHtml || false,
        htmlContent: item.isHtml ? (item.label || item.name || item.text) : null,
      }))
    } else if (payload?.data?.data && Array.isArray(payload.data.data)) {
      options = payload.data.data.map((item: any) => ({
        value: item.value || item.id || item.Oid,
        label: item.label || item.name || item.text,
        isHtml: item.isHtml || false,
        htmlContent: item.isHtml ? (item.label || item.name || item.text) : null,
      }))
    }

    optionsCache.value[key] = options
  } catch (error) {
    console.error('Failed to fetch options:', error)
    optionsCache.value[key] = []
  }
}

// Find field by field_name
const findFieldByName = (fieldName: string) => {
  for (const group of formData.value?.group_fields || []) {
    const field = group.fields?.find((f: any) => f.field_name === fieldName)
    if (field) return field
  }
  return null
}

// Handle input change
const handleInputChange = (field: any, event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value

  // Force update the field value
  field.columnValue = value

  // Trigger change handler
  handleFieldChange(field)
}


// Handle date change from PrimeVue DatePicker
const handleDateChange = (field: any, value: Date | Date[] | (Date | null)[] | null | undefined) => {
  // PrimeVue DatePicker returns Date object or array of Date objects
  // Convert to string format that API expects (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
  if (!value) {
    field.columnValue = null
  } else if (Array.isArray(value)) {
    // Multiple dates (shouldn't happen for single date, but handle it)
    field.columnValue = value.length > 0 ? formatDateForAPI(value[0] as Date, field.columnType) : null
  } else if (value instanceof Date) {
    // Single date
    field.columnValue = formatDateForAPI(value, field.columnType)
  } else {
    // Fallback: use as-is
    field.columnValue = value
  }
  
  // Trigger change handler
  handleFieldChange(field)
}

// Set Calendar ref for label click handling
const setCalendarRef = (field: any, el: any) => {
  if (el) {
    const key = getFieldKey(field)
    calendarRefs.value[key] = el
  }
}

// Handle label click - open calendar picker
const handleLabelClick = async (field: any) => {
  // Only handle for date/datetime/time/year/month fields
  if (!['date', 'datetimes', 'datefulltime', 'time', 'year', 'month', 'datetime'].includes(field.columnType)) {
    return
  }
  
  // Don't open if disabled or in view mode
  if (props.isView || field.isDisable) {
    return
  }
  
  // Wait for DOM to be ready
  await nextTick()
  
  // Get calendar ref and focus/click on input to open picker
  const key = getFieldKey(field)
  const calendarRef = calendarRefs.value[key]
  
  if (calendarRef) {
    // PrimeVue Calendar exposes input element via $el or input element
    // Try to find and focus/click the input element
    const calendarEl = calendarRef.$el || calendarRef
    const inputEl = calendarEl?.querySelector?.('input') || calendarEl?.querySelector?.('.p-inputtext')
    
    if (inputEl) {
      inputEl.focus()
      // Use setTimeout to ensure focus happens before click
      setTimeout(() => {
        inputEl.click()
      }, 10)
    } else {
      // Fallback: try to trigger show method if available
      if (typeof calendarRef.show === 'function') {
        calendarRef.show()
      }
    }
  } else {
    // Fallback: focus on input by ID
    const inputId = field.columnType === 'date' 
      ? `date_${key}` 
      : `datetime_${key}`
    const inputElement = document.getElementById(inputId)
    if (inputElement) {
      inputElement.focus()
      setTimeout(() => {
        inputElement.click()
      }, 10)
    }
  }
}

// Get Date value for Calendar component (convert string to Date object)
const getDateValue = (field: any): Date | null => {
  const value = field.columnValue
  if (!value) return null
  
  // If already a Date object, return as-is
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }
  
  // If string, parse it
  if (typeof value === 'string') {
    const cleanValue = value.trim()

    // Handle time format (HH:mm or HH:mm:ss)
    if (field.columnType === 'time') {
      const parts = cleanValue.split(':')
      if (parts.length >= 2) {
        const date = new Date()
        date.setHours(parseInt(parts[0]!, 10))
        date.setMinutes(parseInt(parts[1]!, 10))
        if (parts[2]) date.setSeconds(parseInt(parts[2], 10))
        return date
      }
    }

    // Handle year format (YYYY)
    if (field.columnType === 'year') {
      if (/^\d{4}$/.test(cleanValue)) {
        const date = new Date(parseInt(cleanValue, 10), 0, 1)
        return date
      }
    }

    // Handle month format (YYYY-MM or MM/YYYY)
    if (field.columnType === 'month') {
      if (/^\d{4}-\d{2}$/.test(cleanValue)) {
        const [year, month] = cleanValue.split('-') as [string, string]
        return new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1)
      } else if (/^\d{1,2}\/\d{4}$/.test(cleanValue)) {
        const [month, year] = cleanValue.split('/') as [string, string]
        return new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1)
      }
    }
    
    // Try parsing ISO format first (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
    if (/^\d{4}-\d{2}-\d{2}/.test(cleanValue)) {
      const date = new Date(cleanValue)
      if (!isNaN(date.getTime())) {
        return date
      }
    }
    
    // Try parsing DD/MM/YYYY format (API returns this format)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(cleanValue)) {
      const parts = cleanValue.split('/')
      if (parts.length === 3) {
        const day = parseInt(parts[0]!, 10)
        const month = parseInt(parts[1]!, 10) - 1 // Month is 0-indexed in Date
        const year = parseInt(parts[2]!, 10)
        
        // Validate date parts
        if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900 && year <= 2100) {
          const date = new Date(year, month, day)
          // Verify the date is valid and matches what we parsed
          if (!isNaN(date.getTime()) && 
              date.getDate() === day && 
              date.getMonth() === month && 
              date.getFullYear() === year) {
            return date
          }
        }
      }
    }
    
    // Fallback: try standard Date parsing (may parse as MM/DD/YYYY)
    const date = new Date(cleanValue)
    if (!isNaN(date.getTime())) {
      return date
    }
  }
  
  return null
}

// Format Date object to API format
const formatDateForAPI = (date: Date, columnType: string): string => {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return ''
  }
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  // For time
  if (columnType === 'time') {
    return `${hours}:${minutes}`
  }

  // For month — API: MM/YYYY
  if (columnType === 'month') {
    return `${month}/${year}`
  }

  // For year
  if (columnType === 'year') {
    return `${year}`
  }

  // For datetime fields, include time
  if (DATE_TIME_FIELD_TYPES.includes(columnType)) {
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
  }
  
  // For date fields, return date only
  return `${year}-${month}-${day}`
}

// Get form model (flat structure)
function getFormModel() {
  try {
    const model: Record<string, any> = {}
    
    if (!formData.value?.group_fields || !Array.isArray(formData.value.group_fields)) {
      return model
    }
    
    formData.value.group_fields.forEach((group: any) => {
      if (group && group.fields && Array.isArray(group.fields)) {
        group.fields.forEach((field: any) => {
          if (field && field.table_name && field.field_name) {
            try {
              const key = getFieldKey(field)
              if (key) {
                model[key] = field.columnValue
              }
            } catch (error) {
              console.error('Error getting field key:', error, field)
            }
          }
        })
      }
    })
    
    return model
  } catch (error) {
    console.error('Error in getFormModel:', error)
    return {}
  }
}

// Update field value
const updateFieldValue = (field: any, value: any) => {
  // Update the field value
  field.columnValue = value
  
  // Trigger change handler
  handleFieldChange(field)
}

// Handle field change
const handleFieldChange = (field: any) => {
  const key = getFieldKey(field)
  
  
  // Clear error
  delete errors.value[key]
  
  // Validate
  validateField(field)
  
  // Handle special field (trigger reload)
  if (field.isSpecial) {
    emit('callbackReload', {
      forms: props.responses,
      model: getFormModel(),
      actions: {
        type: 'special-change',
        fieldKey: key,
        tableName: field.table_name,
        name: field.field_name,
        value: field.columnValue,
        rawField: field,
      },
    })
    
    // Reload dependent fields
    reloadDependentFields(field)

    // Filter form + field đặc biệt → SetFilterDraft và gán lại form từ API (Form.demo)
    if (props.isFilter) {
      void applySetFilterDraftAndReloadForm(field.field_name)
    }
  } else if (
    String(field.field_name || '').toLowerCase() === 'isvehicle' &&
    String(field.columnType || '').toLowerCase() === 'checkbox'
  ) {
    /** Đăng ký xe (MAS_Guest_Cards.isVehicle) — BE thường để isSpecial: false; parent vẫn cần callback để gọi draft + GetVehicleInfo. */
    emit('callbackReload', {
      forms: props.responses,
      model: getFormModel(),
      actions: {
        type: 'vehicle-register-toggle',
        fieldKey: key,
        tableName: field.table_name,
        name: field.field_name,
        value: field.columnValue,
        rawField: field,
      },
    })
  }
}

const applySetFilterDraftAndReloadForm = async (changedFieldName?: string) => {
  formLoading.value = true
  try {
    const payload = buildPayload()
    const params = {
      ...formData.value,
      group_fields: payload.group_fields || [],
    }
    const changed = changedFieldName?.trim()
    const result = await reportService.setFilterDraft(
      params as Record<string, unknown>,
      changed ? { changed } : undefined,
    )

    if (result?.status === 'success' && result?.data) {
      formData.value = null
      await nextTick()
      formData.value = result.data
      await nextTick()
    } else if (result?.message) {
      toast.add({
        severity: 'warn',
        summary: 'Thông báo',
        detail: result.message,
        life: 4000,
      })
    }
  } catch (err: unknown) {
    console.warn('[DynamicForm] SetFilterDraft failed:', err)
    toast.add({
      severity: 'warn',
      summary: 'Thông báo',
      detail: err instanceof Error ? err.message : 'Không thể lưu bản nháp filter',
      life: 4000,
    })
  } finally {
    formLoading.value = false
  }
}

// Reload fields that depend on this field
const reloadDependentFields = (changedField: any) => {
  (formData.value?.group_fields || []).forEach((group: any) => {
    group.fields.forEach((field: any) => {
      // Check if this field's URL depends on changed field
      if (field.columnObject && field.columnObject.includes(`{${changedField.field_name}}`)) {
        // Clear current value
        field.columnValue = null
        // Reload options only if it's NOT an autocomplete (autocomplete fetches on typing)
        if (!['autocomplete', 'autocompletes'].includes(field.columnType)) {
          fetchOptions(field)
        }
      }
    })
  })
}

// Validate single field
const validateField = (field: any) => {
  const key = getFieldKey(field)
  const value = field.columnValue
  
  // Skip validation in filter mode (unless isEmpty is false)
  if (props.isFilter && field.isEmpty) {
    return true
  }
  
  // Skip in view mode
  if (props.isView) {
    return true
  }
  
  // Only validate required fields
  if (!field.isRequire) {
    return true
  }
  
  // Required check
  // Check for empty values: null, undefined, empty string, empty array
  // All of these are considered "not entered" for required fields
  let isEmpty = false

  // Check null or undefined
  if (value === null || value === undefined) {
    isEmpty = true
  }
  // Editor: contentEditable rỗng có thể trả `<br>` / `<p><br></p>` / `&nbsp;`.
  // Strip toàn bộ thẻ + `&nbsp;` rồi mới so sánh với chuỗi rỗng.
  else if (field.columnType === 'editor' && typeof value === 'string') {
    const plain = value
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim()
    if (plain === '') isEmpty = true
  }
  // Check empty string (including whitespace-only)
  else if (typeof value === 'string' && value.trim() === '') {
    isEmpty = true
  }
  // Check empty array (important for selectTree/selectTrees)
  else if (Array.isArray(value) && value.length === 0) {
    isEmpty = true
  }
  // 0 and false are considered valid values (not empty)
  else if (value === 0 || value === false) {
    isEmpty = false
  }
  // Any other truthy value is not empty
  else if (value) {
    isEmpty = false
  } else {
    // Fallback: if we get here, consider it empty
    isEmpty = true
  }
  
  if (field.isRequire && isEmpty) {
    // Use field name (columnLabel) in error message
    const fieldName = field.columnLabel || field.field_name || field.columnName || 'Trường này'
    errors.value[key] = `${fieldName} là bắt buộc`
    return false
  }
  
  // Max length check (only if value is not empty)
  if (field.maxLength && value && String(value).length > field.maxLength) {
    const fieldName = field.columnLabel || field.field_name || field.columnName || 'Trường này'
    errors.value[key] = `${fieldName} không được vượt quá ${field.maxLength} ký tự`
    return false
  }
  
  return true
}

// Helper: Check if a value is empty (null, undefined, empty string, or empty array)
const isEmptyValue = (value: any): boolean => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' && value.trim() === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

// Helper: Check if field should be validated
const shouldValidateField = (field: any): boolean => {
  // CHỈ check các trường có isVisiable = true VÀ isRequire = true
  return field.isVisiable === true && !!field.isRequire
}

// Helper: Get field display name
const getFieldDisplayName = (field: any): string => {
  return field.columnLabel || field.field_name || field.columnName || 'Trường này'
}

// Validate entire form
// Returns: { isValid: boolean, errorFields: string[] }
const validateForm = (): { isValid: boolean; errorFields: string[] } => {
  // Clear previous errors
  errors.value = {}
  
  // Check if form data exists
  if (!formData.value?.group_fields || formData.value.group_fields.length === 0) {
    return { isValid: true, errorFields: [] }
  }
  
  // Mảng để lưu các trường lỗi (chưa có dữ liệu)
  const errorFields: string[] = []
  
  // Duyệt qua tất cả các group_fields
  formData.value.group_fields.forEach((group: any) => {
    if (!group.fields || !Array.isArray(group.fields)) {
      return
    }
    
    // Duyệt qua tất cả các field trong group
    group.fields.forEach((field: any) => {
      // CHỈ check các trường có isVisiable = true VÀ isRequire = true
      if (!shouldValidateField(field)) {
        return
      }
      
      const fieldKey = getFieldKey(field)
      const fieldName = getFieldDisplayName(field)
      const value = field.columnValue
      
      // Check xem columnValue có giá trị không
      // Nếu giá trị = null, rỗng, hoặc mảng [] rỗng thì là lỗi
      if (isEmptyValue(value)) {
        errorFields.push(fieldName)
        errors.value[fieldKey] = `${fieldName} là bắt buộc`
      }
    })
  })
  
  // Return kết quả
  return {
    isValid: errorFields.length === 0,
    errorFields
  }
}

// Check if form has errors
const hasErrors = computed(() => {
  return Object.keys(errors.value).length > 0
})

// Build submit payload
// Convert date/datetime field value from YYYY-MM-DD to DD/MM/YYYY format
// This function is used by both buildPayload and getFormData
const convertDateFieldValue = (field: any, value: any): any => {
  if (!value || typeof value !== 'string') {
    return value
  }
  
  // month: YYYY-MM (legacy / nội bộ) → MM/YYYY
  if (field.columnType === 'month') {
    const yyyyMmPattern = /^(\d{4})-(\d{2})$/
    const mmYyyyPattern = /^(\d{2})\/(\d{4})$/
    const ym = value.match(yyyyMmPattern)
    if (ym) {
      return `${ym[2]}/${ym[1]}`
    }
    if (mmYyyyPattern.test(value)) {
      return value
    }
  }

  // Convert date fields from YYYY-MM-DD to DD/MM/YYYY format
  if (field.columnType === 'date') {
    // Check if value is in YYYY-MM-DD format
    const yyyyMMddPattern = /^\d{4}-\d{2}-\d{2}$/
    if (yyyyMMddPattern.test(value)) {
      const parts = value.split('-')
      if (parts.length === 3) {
        const year = parts[0]
        const month = parts[1]
        const day = parts[2]
        return `${day}/${month}/${year}`
      }
    }
  }
  
  // Convert datetime fields from YYYY-MM-DDTHH:mm:ss → DD/MM/YYYY HH:mm:ss (gồm cả columnType `datetime`)
  if (DATE_TIME_FIELD_TYPES.includes(field.columnType)) {
    const datetimePattern = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/
    const match = value.match(datetimePattern)
    if (match) {
      const datePart = match[1]!
      const timePart = match[2]!
      const dateParts = datePart.split('-')
      if (dateParts.length === 3) {
        const year = dateParts[0]!
        const month = dateParts[1]!
        const day = dateParts[2]!
        // Chỉ ngày: backend một số màn chỉ nhận DD/MM/YYYY (vd. billing period)
        if (field.columnType === 'datetime') {
          return `${day}/${month}/${year}`
        }
        return `${day}/${month}/${year} ${timePart}`
      }
    }
    // datetime: có thể đang lưu dạng YYYY-MM-DD không có phần giờ
    if (field.columnType === 'datetime') {
      const yyyyMMddPattern = /^\d{4}-\d{2}-\d{2}$/
      if (yyyyMMddPattern.test(value)) {
        const [y, m, d] = value.split('-')
        return `${d}/${m}/${y}`
      }
    }
  }
  
  return value
}

// Process group_fields: convert selectTree/selectTrees to string, convert date format
// This function is used by both buildPayload and getFormData
const processGroupFields = (groupFields: any[], isView: boolean = false): any[] => {
  if (!groupFields || !Array.isArray(groupFields)) {
    return []
  }
  
  return groupFields.map((group: any) => {
    if (!group.fields || !Array.isArray(group.fields)) {
      return group
    }
    
    const processedFields = group.fields.map((field: any) => {
      // Skip invisible fields (unless in view mode)
      if (!field.isVisiable && !isView) {
        return field
      }
      
      // Process selectTree/selectTrees fields
      if (field.columnType === 'selectTree' || field.columnType === 'selectTrees') {
        let finalValue: string | null = null
        
        // Check if field.columnValue is array
        if (Array.isArray(field.columnValue)) {
          // Empty array → null
          if (field.columnValue.length === 0) {
            finalValue = null
          } else {
            // Filter valid values and extract from objects if needed
            const filtered = field.columnValue
              .filter((v: any) => v !== '' && v !== 'undefined' && v !== 'null' && v !== null && v !== undefined)
              .map((v: any) => {
                // If array contains objects, extract value
                if (typeof v === 'object' && v !== null) {
                  return v.value || v.id || v.Oid || v.oid || String(v)
                }
                return String(v)
              })
            
            if (filtered.length === 0) {
              finalValue = null
            } else if (field.columnType === 'selectTree') {
              // selectTree (single): chỉ lấy value đầu tiên
              finalValue = String(filtered[0])
            } else {
              // selectTrees (multi): map tất cả values và join bằng comma
              finalValue = filtered.join(',')
            }
          }
        } else if (typeof field.columnValue === 'object' && field.columnValue !== null) {
          // Handle object - extract value from object
          const objValue = field.columnValue.value || field.columnValue.id || field.columnValue.Oid || field.columnValue.oid
          if (objValue) {
            finalValue = String(objValue)
          } else {
            finalValue = null
          }
        } else if (typeof field.columnValue === 'string' && field.columnValue.trim() !== '') {
          // Already string format
          if (field.columnType === 'selectTree') {
            // selectTree (single): split và lấy value đầu tiên
            const values = field.columnValue.split(',').filter((v: string) => v.trim() !== '')
            finalValue = values.length > 0 ? values[0].trim() : null
          } else {
            // selectTrees (multi): giữ nguyên string (đã là comma-separated)
            finalValue = field.columnValue
          }
        } else if (field.columnValue !== null && field.columnValue !== undefined && field.columnValue !== '') {
          // Other types: convert to string
          finalValue = String(field.columnValue)
        }
        
        // Return new field object with processed value (don't mutate original)
        return {
          ...field,
          columnValue: finalValue
        }
      }
      
      // Convert multiSelect array → comma-separated string
      if (field.columnType === 'multiSelect' || field.columnType === 'checkboxList') {
        const val = field.columnValue
        if (Array.isArray(val)) {
          const filtered = val
            .filter((v: any) => v !== null && v !== undefined && v !== '')
            .map((v: any) =>
              typeof v === 'object' && v !== null
                ? String(v.value || v.id || v.Oid || v.oid || v)
                : String(v)
            )
          return {
            ...field,
            columnValue: filtered.length > 0 ? filtered.join(',') : null
          }
        }
        // Already string or null — keep as-is
        return field
      }
      
      // Convert date/datetime fields from YYYY-MM-DD to DD/MM/YYYY format
      const convertedValue = convertDateFieldValue(field, field.columnValue)
      if (convertedValue !== field.columnValue) {
        return {
          ...field,
          columnValue: convertedValue
        }
      }
      
      // Return field as-is for other types
      return field
    })
    
    return {
      ...group,
      fields: processedFields
    }
  }).map((group: any) => {
    // Final check for any remaining empty arrays in selectTree/selectTrees
    if (group.fields && Array.isArray(group.fields)) {
      const finalFields = group.fields.map((field: any) => {
        if ((field.columnType === 'selectTree' || field.columnType === 'selectTrees') && 
            Array.isArray(field.columnValue) && field.columnValue.length === 0) {
          return {
            ...field,
            columnValue: null
          }
        }
        return field
      })
      
      return {
        ...group,
        fields: finalFields
      }
    }
    
    return group
  })
}

// Build values and flat structure from processed group_fields
// This function is used by buildPayload to create nested and flat data structures
const buildValuesAndFlat = (processedGroups: any[], isView: boolean = false): {
  values: Record<string, Record<string, any>>,
  flat: Record<string, any>,
  fields: Record<string, any>,
  hasFiles: boolean
} => {
  const values: Record<string, Record<string, any>> = {}
  const flat: Record<string, any> = {}
  const fields: Record<string, any> = {}
  let hasFiles = false
  
  processedGroups.forEach((group: any) => {
    if (!group.fields || !Array.isArray(group.fields)) {
      return
    }
    
    group.fields.forEach((field: any) => {
      // Skip invisible fields (unless in view mode)
      if (!field.isVisiable && !isView) {
        return
      }
      
      const tableName = field.table_name
      const fieldName = field.field_name
      const value = field.columnValue
      
      if (!tableName || !fieldName) {
        return
      }
      
      // Check for files
      if (['file', 'files', 'image'].includes(field.columnType)) {
        hasFiles = true
      }
      
      // Nested structure
      if (!values[tableName]) {
        values[tableName] = {}
      }
      values[tableName][fieldName] = value
      
      // Flat structure (with tableName prefix)
      flat[`${tableName}.${fieldName}`] = value
      
      // Simple structure (without tableName prefix, just fieldName)
      fields[fieldName] = value
    })
  })
  
  return { values, flat, fields, hasFiles }
}

const buildPayload = () => {
  try {
    if (!formData.value?.group_fields) {
      return {
        tableKey: formData.value?.tableKey || '',
        groupKey: formData.value?.groupKey || '',
        group_fields: [],
        values: {},
        flat: {},
        meta: {
          mode: props.isView ? 'view' : props.isFilter ? 'filter' : 'edit',
          hasFiles: false,
        },
      }
    }
    
    // Process group_fields using common function
    const processedGroups = processGroupFields(formData.value.group_fields || [], props.isView)
    
    // Build values and flat structure using common function
    const { values, flat, fields, hasFiles } = buildValuesAndFlat(processedGroups, props.isView)
    
    return {
      tableKey: formData.value?.tableKey || '',
      groupKey: formData.value?.groupKey || '',
      group_fields: processedGroups,
      values,
      flat,
      fields,
      meta: {
        mode: props.isView ? 'view' : props.isFilter ? 'filter' : 'edit',
        hasFiles,
      },
    }
  } catch (error) {
    console.error('Error in buildPayload:', error)
    return {
      tableKey: '',
      groupKey: '',
      group_fields: [],
      values: {},
      flat: {},
      fields: {},
      meta: {
        mode: 'edit',
        hasFiles: false,
      },
    }
  }
}

// Handle submit
const handleSubmit = () => {
  try {
    const validationResult = validateForm()
    
    if (!validationResult.isValid) {
      // Show error message với danh sách các trường chưa có dữ liệu
      if (validationResult.errorFields.length > 0) {
        // Tạo string từ mảng lỗi
        const errorFieldsString = validationResult.errorFields.join(', ')
        
        if (validationResult.errorFields.length === 1) {
          toast.add({
            severity: 'error',
            summary: 'Vui lòng kiểm tra dữ liệu',
            detail: `Trường "${errorFieldsString}" đang chưa có dữ liệu`,
            life: 4000,
          })
        } else {
          // Multiple errors
          toast.add({ severity: 'error', summary: 'Thông báo', detail: `Vui lòng kiểm tra dữ liệu các trường sau đang chưa có dữ liệu: ${errorFieldsString}`, life: 5000 })
        }
      } else {
        // Fallback (should not happen)
        toast.add({ severity: 'error', summary: 'Thông báo', detail: 'Vui lòng kiểm tra lại thông tin. Có một số trường bắt buộc chưa được nhập.', life: 5000 })
      }
      
      // Scroll to first error field
      if (validationResult.errorFields.length > 0) {
        // Try to find the first error field by its name
        // We need to find the field key from the field name
        const firstErrorFieldName = validationResult.errorFields[0]
        // Find field by name in formData
        let firstErrorKey = '';
        (formData.value?.group_fields || []).forEach((group: any) => {
          if (firstErrorKey) return
          group.fields.forEach((field: any) => {
            if (firstErrorKey) return
            const fieldName = field.columnLabel || field.field_name || field.columnName
            if (fieldName === firstErrorFieldName) {
              firstErrorKey = getFieldKey(field)
            }
          })
        })
        
        if (firstErrorKey) {
          const element = document.querySelector(`[data-field-key="${firstErrorKey}"]`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }
      
      return
    }
    
    const payload = buildPayload()
    emit('submit', payload)
  } catch (error) {
    console.error('Error in handleSubmit:', error)
    toast.add({ severity: 'error', summary: 'Thông báo', detail: 'Có lỗi xảy ra khi xử lý form', life: 5000 })
  }
}

// Multi-select helpers
const isOptionSelected = (field: any, value: any) => {
  if (field.columnValue === null || field.columnValue === undefined || field.columnValue === '') return false
  
  if (typeof field.columnValue === 'string') {
    const values = field.columnValue.split(',').map((v: string) => v.trim())
    return values.includes(String(value))
  }
  
  if (Array.isArray(field.columnValue)) {
    return field.columnValue.includes(value) || field.columnValue.includes(String(value)) || field.columnValue.includes(Number(value))
  }
  
  return String(field.columnValue) === String(value)
}

const toggleMultiSelect = (field: any, value: any, checked: boolean) => {
  if (field.columnValue === null || field.columnValue === undefined || field.columnValue === '') {
    field.columnValue = []
  } else if (typeof field.columnValue === 'string') {
    field.columnValue = field.columnValue.split(',').map((v: string) => v.trim()).filter(Boolean)
  } else if (!Array.isArray(field.columnValue)) {
    field.columnValue = [field.columnValue]
  }
  
  if (checked) {
    if (!field.columnValue.includes(value) && !field.columnValue.includes(String(value))) {
      field.columnValue.push(value)
    }
  } else {
    field.columnValue = field.columnValue.filter((v: any) => String(v) !== String(value))
  }
  
  handleFieldChange(field)
}

function attachedStyleFileInputId(field: any) {
  return `attached-file-${getFieldKey(field)}`
}

/** Danh sách token file: chuỗi cách bằng phẩy hoặc mảng (attached-style-1) */
function getAttachedStyleFileTokens(field: any): string[] {
  const v = field?.columnValue
  if (v == null || v === '') return []
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean)
  if (typeof v === 'string') return v.split(',').map((s: string) => s.trim()).filter(Boolean)
  return [String(v)]
}

/** Gộp path mới vào danh sách đã có (attached-style-1), không trùng path */
function mergeAttachedStyleFilePaths(field: any, newPaths: string[]) {
  const existing = getAttachedStyleFileTokens(field)
  const seen = new Set(existing)
  const merged = [...existing]
  for (const p of newPaths) {
    const path = String(p || '').trim()
    if (path && !seen.has(path)) {
      seen.add(path)
      merged.push(path)
    }
  }
  const raw = field.columnValue
  if (typeof raw === 'string' && !Array.isArray(raw)) {
    field.columnValue = merged.join(', ')
  } else {
    field.columnValue = merged
  }
}

/** Chỉ upload thêm: attached-style-1 + (multi files, hoặc single file đã có ít nhất 1 path) */
function shouldAppendAttachedStyleUpload(field: any): boolean {
  if (!String(field.columnClass || '').includes(CLASS_CUSTOM_UI.attached_style_1.classReturn)) {
    return false
  }
  if (field.columnType === 'files') return true
  if (field.columnType === 'file' && getAttachedStyleFileTokens(field).length > 0) return true
  return false
}

function getAttachedStyleFileDisplayName(token: string): string {
  const t = String(token || '').trim()
  if (!t) return ''
  const base = t.split(/[/\\]/).pop() || t
  const u = base.indexOf('_')
  if (u !== -1 && u < base.length - 1) return base.slice(u + 1)
  return base
}

function getAttachedStyleFileExt(token: string): string {
  const name = getAttachedStyleFileDisplayName(token)
  const dot = name.lastIndexOf('.')
  if (dot === -1) return ''
  return name.slice(dot + 1).toLowerCase()
}

function getExtFromFileName(fileName: string): string {
  const n = String(fileName || '').trim()
  const dot = n.lastIndexOf('.')
  if (dot === -1 || dot >= n.length - 1) return ''
  return n.slice(dot + 1).toLowerCase()
}

function isAttachedStyleImageExt(ext: string): boolean {
  return ATTACHED_STYLE_IMAGE_EXTENSIONS.has(ext)
}

function isAttachedStyleImageFile(token: string): boolean {
  return isAttachedStyleImageExt(getAttachedStyleFileExt(token))
}

function attachedStyleFileIconWrapClass(token: string): string {
  return attachedStyleFileIconWrapClass_byExt(getAttachedStyleFileExt(token))
}

/** Dòng phụ dưới tên file (chưa có API size/ngày từng file → hiển thị đuôi) */
function getAttachedStyleFileMetaLine(token: string): string {
  const ext = getAttachedStyleFileExt(token)
  return ext ? ext.toUpperCase() : '—'
}

/** Helper dùng trong template: dòng meta cho file object (size • ngày) */
function getFileItemMetaLine(fileItem: any): string {
  const parts: string[] = []
  if (fileItem?.size) {
    const kb = fileItem.size / 1024
    parts.push(kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`)
  }
  if (fileItem?.lastModified) {
    try {
      const d = new Date(fileItem.lastModified)
      const dd = String(d.getDate()).padStart(2, '0')
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const yyyy = d.getFullYear()
      parts.push(`${dd}/${mm}/${yyyy}`)
    } catch { /* ignore */ }
  }
  return parts.length ? parts.join(' • ') : '—'
}

/** Icon wrap class cho file object */
function fileItemIconWrapClass(fileItem: any): string {
  const name = String(fileItem?.fileName || '')
  const dot = name.lastIndexOf('.')
  const ext = dot !== -1 ? name.slice(dot + 1).toLowerCase() : ''
  return attachedStyleFileIconWrapClass_byExt(ext)
}

function attachedStyleFileIconWrapClass_byExt(ext: string): string {
  if (ext === 'pdf') return 'bg-orange-100 text-red-600'
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'bg-[var(--bz-success)] text-[var(--bz-success-text)]'
  if (['dwg', 'dxf', 'dwf'].includes(ext)) return 'bg-[var(--bz-status-blue-bg)] text-[var(--bz-status-blue-text)]'
  if (isAttachedStyleImageExt(ext)) return 'bg-[var(--bz-primary-soft)] text-[var(--bz-primary)]'
  return 'bg-gray-100 text-gray-600'
}

/** Check ảnh cho file object */
function isFileItemImage(fileItem: any): boolean {
  const name = String(fileItem?.fileName || '')
  const dot = name.lastIndexOf('.')
  const ext = dot !== -1 ? name.slice(dot + 1).toLowerCase() : ''
  return isAttachedStyleImageExt(ext)
}

/** Download từ file object */
async function handleDownloadByFileItem(fileItem: any) {
  if (!fileItem) return
  const url = fileItem.url
  if (url) {
    const a = document.createElement('a')
    a.href = url
    a.download = fileItem.fileName || 'file'
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}

function handleDownloadAttachedFile(field: any, token: string) {
  const t = String(token || '').trim()
  if (!t) return
  const subField = { ...field, columnValue: t, _fileData: null, _cachedFileInfo: null }
  void handleDownloadFile(subField)
}

async function removeAttachedStyleFile(field: any, index: number) {
  const key = getFieldKey(field)
  const files = [...(fieldLoadedFiles.value[key] || [])]
  const fileToDelete = files[index]

  // Gọi API xóa nếu có oid
  if (fileToDelete?.oid) {
    try {
      await storageService.deleteFileMeta(fileToDelete.oid)
    } catch (error) {
      console.error('[DynamicForm] deleteFileMeta failed:', error)
    }
  }

  files.splice(index, 1)
  fieldLoadedFiles.value[key] = files

  if (!files.length) {
    field.columnValue = null
    const input = document.getElementById(attachedStyleFileInputId(field)) as HTMLInputElement | null
    if (input) input.value = ''
  } else {
    // giữ groupFileId của nhóm (lấy từ file còn lại)
    field.columnValue = files[0]?.groupFileId || field.columnValue
  }

  handleFieldChange(field)
}

/** Gán file kéo thả vào input ẩn rồi kích hoạt upload như chọn file */
function onAttachedStyleDrop(field: any, e: DragEvent) {
  const dtIn = e.dataTransfer?.files
  if (!dtIn?.length) return
  const input = document.getElementById(attachedStyleFileInputId(field)) as HTMLInputElement | null
  if (!input) return
  const dt = new DataTransfer()
  const multi = field.columnType === 'files'
  if (multi) {
    Array.from(dtIn).forEach((f) => dt.items.add(f))
  } else {
    const f = dtIn[0]
    if (f) dt.items.add(f)
  }
  input.files = dt.files
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

/** attached-style-2: nhận FileList từ component con rồi gọi handleAttachedStyleFileChange */
async function handleAttachedStyle2Drop(field: any, files: FileList) {
  if (!files.length) return
  const fakeEvent = { target: { files, value: '' } } as unknown as Event
  await handleAttachedStyleFileChange(field, fakeEvent)
}

// File upload helpers
const handleFileChange = async (field: any, event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (!files || files.length === 0) {
    field.columnValue = null
    return
  }
  
  try {
    // Show loading state (optional - you can add a loading indicator here)
    if (field.columnType === 'files') {
      // Multiple files - upload each file
      const uploadPromises = Array.from(files).map(async (file: File) => {
        const response = await storageService.uploadFile(file, 'resident-web')
        if (response.status === 'success' && response.data) {
          return {
            filePath: response.data.filePath,
            url: response.data.url,
            fileName: response.data.fileName,
            size: response.data.size,
            contentType: response.data.contentType
          }
        }
        throw new Error(response.message || 'Upload failed')
      })
      
      const uploadedFiles = await Promise.all(uploadPromises)
      field.columnValue = uploadedFiles.map(f => f.filePath)
    } else {
      const file = files[0]!
      const response = await storageService.uploadFile(file, 'resident-web')
      
      if (response.status === 'success' && response.data) {
        field.columnValue = response.data.filePath
        field._fileData = {
          filePath: response.data.filePath,
          url: response.data.url,
          fileName: response.data.fileName,
          size: response.data.size,
          contentType: response.data.contentType
        }
      } else {
        throw new Error(response.message || 'Upload failed')
      }
    }
    
    handleFieldChange(field)
  } catch (error: any) {
    console.error('Error uploading file:', error)
    toast.add({ severity: 'error', summary: 'Thông báo', detail: 'Lỗi upload file' + ' - ' + (error.message || 'Không thể upload file. Vui lòng thử lại.'), life: 5000 })
    // Reset field value on error
    field.columnValue = null
    field._fileData = null
    // Reset input
    target.value = ''
  }
}

function validateAttachedStyleFilesForUpload(files: FileList | null): boolean {
  if (!files?.length) return true
  for (const file of Array.from(files)) {
    if (file.size > ATTACHED_STYLE_MAX_FILE_BYTES) {
      toast.add({
        severity: 'error',
        summary: 'Thông báo',
        detail: `Tệp "${file.name}" vượt quá 10MB. Vui lòng chọn tệp nhỏ hơn.`,
        life: 5000,
      })
      return false
    }
    const ext = getExtFromFileName(file.name)
    if (!ext || !ATTACHED_STYLE_ALLOWED_EXT_SET.has(ext)) {
      toast.add({
        severity: 'error',
        summary: 'Thông báo',
        detail: `Tệp "${file.name}" không đúng định dạng cho phép. Chỉ chấp nhận: ${ATTACHED_STYLE_FORMATS_HINT}`,
        life: 6000,
      })
      return false
    }
  }
  return true
}

/**
 * Upload cho attached-style-1 theo pattern groupFileId:
 * - File đầu tiên: upload không có parentOid → BE trả về groupFileId mới
 * - Các file tiếp theo: truyền groupFileId của nhóm làm parentOid
 * - columnValue lưu groupFileId (không phải filePath)
 */
async function handleAttachedStyleFileChange(field: any, event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) {
    target.value = ''
    return
  }

  if (!validateAttachedStyleFilesForUpload(files)) {
    target.value = ''
    return
  }

  const key = getFieldKey(field)
  const existingFiles = fieldLoadedFiles.value[key] || []
  // parentOid ưu tiên: 1) columnValue là GUID → dùng trực tiếp; 2) đã có file → dùng groupFileId; 3) thêm mới → undefined
  const isGuid = (v: any): v is string =>
    typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim())
  const parentOid: string | undefined = isGuid(field.columnValue)
    ? field.columnValue.trim()
    : (existingFiles.length > 0 ? (existingFiles[0].groupFileId || undefined) : undefined)

  formLoading.value = true
  try {
    const newFileObjects: any[] = []
    let activeGroupFileId: string | undefined = parentOid

    for (const file of Array.from(files)) {
      const response = await storageService.uploadFileWithParent(file, activeGroupFileId)
      if ((response.statusCode === 1 || response.status === 'success') && response.data) {
        const fileObj = response.data
        // File đầu tiên trả về groupFileId → dùng cho các file sau
        if (!activeGroupFileId && fileObj.groupFileId) {
          activeGroupFileId = fileObj.groupFileId
        }
        newFileObjects.push(fileObj)
      } else {
        throw new Error(response.message || 'Upload failed')
      }
    }

    // Gộp vào danh sách (image: thay thế; file/files: thêm vào)
    const mergedFiles = field.columnType === 'image'
      ? newFileObjects
      : [...existingFiles, ...newFileObjects]
    fieldLoadedFiles.value[key] = mergedFiles

    // Cập nhật parentOid trong columnObject sau lần upload đầu tiên:
    // - Nếu columnObject đã có parentOid= nhưng giá trị rỗng → replace bằng groupFileId mới
    // - Nếu columnObject chưa có parentOid → ghép thêm vào
    if (activeGroupFileId && field.columnObject) {
      const hasEmptyParentOid = /[?&]parentOid=(?:&|$)/.test(field.columnObject)
      const hasNoParentOid = !field.columnObject.includes('parentOid')
      if (hasEmptyParentOid) {
        field.columnObject = field.columnObject.replace(
          /([?&]parentOid=)(?=&|$)/,
          `$1${activeGroupFileId}`,
        )
      } else if (hasNoParentOid) {
        const sep = field.columnObject.includes('?') ? '&' : '?'
        field.columnObject = `${field.columnObject}${sep}parentOid=${activeGroupFileId}`
      }
    }

    // columnValue = groupFileId của nhóm
    // Gán columnValue mutate props.responses → deep watcher reset fieldLoadedFiles.
    // Dùng nextTick để khôi phục danh sách sau khi watcher chạy xong.
    field.columnValue = activeGroupFileId || null
    handleFieldChange(field)
    await nextTick()
    fieldLoadedFiles.value[key] = mergedFiles
  } catch (error: any) {
    console.error('Error uploading file:', error)
    toast.add({ severity: 'error', summary: 'Thông báo', detail: 'Lỗi upload file - ' + (error.message || 'Không thể upload file. Vui lòng thử lại.'), life: 5000 })
  } finally {
    formLoading.value = false
    target.value = ''
  }
}

// Get file info from API if needed (cache result)
const getFileInfoFromAPI = async (filePath: string): Promise<any> => {
  // Disable automatic API call per user request
  return null;
  /*
  // Check cache first
  if (fileInfoCache.value[filePath]) {
    return fileInfoCache.value[filePath]
  }
  
  try {
    const response = await storageService.getFileInfo(filePath)
    if (response.status === 'success' && response.data) {
      // Cache the result
      fileInfoCache.value[filePath] = response.data
      return response.data
    }
  } catch (error: any) {
    console.error('Error getting file info:', error)
  }
  
  return null
  */
}

// Get file name (synchronous version for template - uses cache)
const getFileName = (value: any, field?: any): string => {
  if (!value) return ''
  
  // Priority 1: If field has _fileData (from upload API response), use fileName from there
  if (field?._fileData?.fileName) {
    return field._fileData.fileName
  }
  
  // Priority 2: If field has cached file info (from GetFileInfo API), use fileName from there
  if (field?._cachedFileInfo?.fileName) {
    return field._cachedFileInfo.fileName
  }
  
  // Priority 3: If it's a File object, use its name
  if (value instanceof File) return value.name
  
  // Priority 4: If it's an array, process each item
  if (Array.isArray(value)) {
    return value.map((f: any) => {
      if (f instanceof File) return f.name
      // If it's a filePath string, try to get from cache
      if (typeof f === 'string') {
        const cachedInfo = fileInfoCache.value[f]
        if (cachedInfo?.fileName) {
          return cachedInfo.fileName
        }
        // Fallback: extract filename from path
        const parts = f.split('/')
        return parts[parts.length - 1] || f
      }
      return String(f)
    }).join(', ')
  }
  
  // Priority 5: If it's a filePath string, try to get from cache
  if (typeof value === 'string') {
    const cachedInfo = fileInfoCache.value[value]
    if (cachedInfo?.fileName) {
      return cachedInfo.fileName
    }
    // Fallback: extract filename from path
    const parts = value.split('/')
    return parts[parts.length - 1] || value
  }
  
  return String(value)
}

// Get file URL for display (handles both File objects and URL strings)
const getFileUrl = (value: any, field?: any): string => {
  if (!value) return ''
  
  // If field has _fileData (from API response), use url from there
  if (field?._fileData?.url) {
    return field._fileData.url
  }
  
  // If field has cached file info, use url from there
  if (field?._cachedFileInfo?.url) {
    return field._cachedFileInfo.url
  }
  
  // Check cache for file info
  if (typeof value === 'string' && fileInfoCache.value[value]?.url) {
    return fileInfoCache.value[value].url
  }
  
  if (value instanceof File) {
    const key = field?.columnField ?? field?.field_name ?? 'file'
    const fileId = `${value.name}_${value.size}_${value.lastModified}`
    const cacheEntry = fileBlobUrlsCache.value[key]
    if (typeof cacheEntry === 'object' && cacheEntry?.fileId === fileId && cacheEntry?.url) {
      return cacheEntry.url
    }
    if (cacheEntry?.url) {
      URL.revokeObjectURL(cacheEntry.url)
    }
    const url = URL.createObjectURL(value)
    fileBlobUrlsCache.value[key] = { fileId, url }
    return url
  }
  if (typeof value === 'string') {
    // If it's already a URL, return it
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:') || value.startsWith('/')) {
      return value
    }
    
    // If it's a filePath (from API), try to construct URL
    // filePath format: "minio://bucket/path/to/file" or "bucket/path/to/file"
    if (value.includes('minio://') || value.includes('/')) {
      // Extract bucket and path from filePath
      let bucket = ''
      let path = ''
      
      if (value.startsWith('minio://')) {
        // Format: minio://bucket/path/to/file
        const parts = value.replace('minio://', '').split('/')
        bucket = parts[0] || ''
        path = parts.slice(1).join('/')
      } else {
        // Format: bucket/path/to/file
        const parts = value.split('/')
        bucket = parts[0] || ''
        path = parts.slice(1).join('/')
      }
      
      // Construct storage URL (adjust base URL as needed)
      // Based on the API response example: https://storage-dev.unicloudgroup.com.vn/bucket/path
      if (bucket && path) {
        return `https://storage-dev.unicloudgroup.com.vn/${bucket}/${path}`
      }
    }
    
    // Otherwise, treat as relative path
    return value
  }
  return ''
}

// Handle image load error
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

// Handle file download
const handleDownloadFile = async (field: any) => {
  const value = field.columnValue
  if (!value) return
  
  // If field has _fileData (from API response), use url from there
  if (field._fileData?.url) {
    window.open(field._fileData.url, '_blank')
    return
  }
  
  // If field has cached file info, use url from there
  if (field._cachedFileInfo?.url) {
    window.open(field._cachedFileInfo.url, '_blank')
    return
  }
  
  // Check cache for file info
  if (typeof value === 'string' && fileInfoCache.value[value]?.url) {
    window.open(fileInfoCache.value[value].url, '_blank')
    return
  }
  
  // If it's a filePath string, get file info from API
  if (typeof value === 'string' && (value.startsWith('minio://') || value.includes('/'))) {
    try {
      const fileInfo = await getFileInfoFromAPI(value)
      if (fileInfo?.url) {
        // Store in field for future use
        field._cachedFileInfo = fileInfo
        window.open(fileInfo.url, '_blank')
        return
      }
    } catch (error: any) {
      console.error('Error getting file info for download:', error)
      toast.add({ severity: 'error', summary: 'Thông báo', detail: 'Lỗi - Không thể tải thông tin file. Vui lòng thử lại.', life: 5000 })
      return
    }
  }
  
  if (value instanceof File) {
    // Create download link for File object
    const url = URL.createObjectURL(value)
    const a = document.createElement('a')
    a.href = url
    a.download = value.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } else if (typeof value === 'string') {
    // If it's a URL string, open in new tab or download
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
      // Open in new tab
      window.open(value, '_blank')
    } else {
      // Try to download as file
      const a = document.createElement('a')
      a.href = value
      a.download = getFileName(value, field)
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }
}

// Chips/Tags helpers
const getChips = (field: any) => {
  if (!field.columnValue) return []
  if (Array.isArray(field.columnValue)) return field.columnValue
  if (typeof field.columnValue === 'string') {
    return field.columnValue.split(',').map((s: string) => s.trim()).filter(Boolean)
  }
  return []
}

const addChip = (field: any, event: Event) => {
  const input = event.target as HTMLInputElement
  const value = input.value.trim()
  
  if (!value) return
  
  const chips = getChips(field)
  if (!chips.includes(value)) {
    chips.push(value)
    field.columnValue = chips
    handleFieldChange(field)
  }
  
  input.value = ''
}

const removeChip = (field: any, index: number) => {
  const chips = getChips(field)
  chips.splice(index, 1)
  field.columnValue = chips
  handleFieldChange(field)
}

// Store timeout IDs for debouncing autocomplete searches
const autocompleteTimeouts: Record<string, number | NodeJS.Timeout> = {}

// Autocomplete search logic
const searchAutocomplete = async (field: any, event: any) => {
  const query = event.query
  const key = getFieldKey(field)
  
  // Clear existing timeout for this field
  if (autocompleteTimeouts[key]) {
    clearTimeout(autocompleteTimeouts[key] as any)
  }
  
  // If no columnObject, fallback to filter local cached options (no debounce needed for local filter, but handle it instantly)
  if (!field.columnObject) {
    const options = getPrimeVueOptions(field)
    if (!query) {
      autocompleteSuggestions.value[key] = options
      return
    }
    const originalQuery = query.toLowerCase()
    autocompleteSuggestions.value[key] = options.filter((opt: any) => {
      return opt.label.toLowerCase().includes(originalQuery) || 
             getNormalizedValue(opt.value).toString().includes(originalQuery)
    })
    return
  }
  
  // Connect to API if columnObject is provided (Debounced)
  autocompleteTimeouts[key] = setTimeout(async () => {
    try {
    let url = field.columnObject
    
    // Replace dependency placeholders (e.g., {provinceOid})
    const matches = url.match(/\{(\w+)\}/g)
    if (matches) {
      matches.forEach((match: string) => {
        const fieldName = match.replace(/[{}]/g, '')
        // Find field value in form
        const dependentField = findFieldByName(fieldName)
        if (dependentField) {
          url = url.replace(match, dependentField.columnValue || '')
        } else {
          url = url.replace(match, '')
        }
      })
    }
    
    // Set keyword `filter` param (idempotent — replace nếu URL từ BE đã có sẵn `filter=`)
    let requestUrl = setUrlQueryParam(url, 'filter', query || '')

    // Clean up URL
    requestUrl = requestUrl.replace(/[?&]$/, '').replace(/[?&]&/, '?').replace(/&&+/, '&')

    // Pass skipProjectCd: true to prevent interceptor from automatically adding project ID
    const response = await apiShome.get(requestUrl, { skipProjectCd: true } as any)
    
    // Normalize response options
    let options: any[] = []
    if (Array.isArray(response)) {
      options = response.map((item: any) => ({
        value: item.value || item.id || item.Oid,
        label: item.label || item.name || item.text,
        isHtml: item.isHtml || false,
        htmlContent: item.isHtml ? (item.label || item.name || item.text) : null
      }))
    } else if (response?.data?.data) {
      options = response.data.data.map((item: any) => ({
        value: item.value || item.id || item.Oid,
        label: item.label || item.name || item.text,
        isHtml: item.isHtml || false,
        htmlContent: item.isHtml ? (item.label || item.name || item.text) : null
      }))
    } else if (response?.data && Array.isArray(response.data)) {
      options = response.data.map((item: any) => ({
         value: item.value || item.id || item.Oid,
         label: item.label || item.name || item.text,
         isHtml: item.isHtml || false,
         htmlContent: item.isHtml ? (item.label || item.name || item.text) : null
      }))
    } else if ((response as any)?.data?.children && Array.isArray((response as any).data.children)) {
      options = (response as any).data.children.map((item: any) => ({
         value: item.value || item.id || item.Oid,
         label: item.label || item.name || item.text,
         isHtml: item.isHtml || false,
         htmlContent: item.isHtml ? (item.label || item.name || item.text) : null
      }))
    }
    
    autocompleteSuggestions.value[key] = options
  } catch (error) {
    console.error('Failed to fetch autocomplete options:', error)
    autocompleteSuggestions.value[key] = []
  }
  }, 300) // 300ms debounce
}

// Fetch specific option for autocomplete when initialized with a value
const fetchAutocompleteOptionByValue = async (field: any) => {
  if (!field.columnObject || !field.columnValue) return

  // For multi autocomplete: split "A1,A2" and fetch label for each
  if (field.columnType === 'autocompletes') {
    const raw = field.columnValue
    const values: string[] = Array.isArray(raw)
      ? raw.map((v: any) =>
          typeof v === 'object' && v !== null
            ? String(v.value ?? v.id ?? v.Oid ?? v.oid ?? '')
            : String(v),
        )
      : String(raw)
          .split(',')
          .map((v: string) => v.trim())
          .filter((v: string) => v !== '')

    for (const val of values) {
      await fetchAutocompleteOptionByValueSingle(field, val)
    }
    return
  }

  await fetchAutocompleteOptionByValueSingle(field, String(field.columnValue))
}

// Fetch a single value's label and merge into optionsCache
const fetchAutocompleteOptionByValueSingle = async (field: any, value: string) => {
  if (!value) return

  const key = getFieldKey(field)
  try {
    let url = field.columnObject

    // Replace dependency placeholders
    const matches = url.match(/\{(\w+)\}/g)
    if (matches) {
      matches.forEach((match: string) => {
        const fieldName = match.replace(/[{}]/g, '')
        const dependentField = findFieldByName(fieldName)
        if (dependentField) {
          url = url.replace(match, dependentField.columnValue || '')
        } else {
          url = url.replace(match, '')
        }
      })
    }

    // Initial fetch theo columnValue:
    //   - Nếu BE đã embed value vào columnObject (vd. `?filter=&cardOid=<value>`)
    //     → BE tự lookup qua cardOid/Oid/... — call as-is, KHÔNG ghi đè `filter=<value>`
    //   - Ngược lại (URL chỉ là endpoint list chung) → append filter=<value> theo legacy
    let requestUrl = urlHasParamValue(url, value) ? url : setUrlQueryParam(url, 'filter', value)
    requestUrl = requestUrl.replace(/[?&]$/, '').replace(/[?&]&/, '?').replace(/&&+/, '&')

    const response = await apiShome.get(requestUrl, { skipProjectCd: true } as any)
    
    // Normalize response options
    let options: any[] = []
    if (Array.isArray(response)) {
      options = response.map((item: any) => ({
        value: item.value || item.id || item.Oid,
        label: item.label || item.name || item.text,
        isHtml: item.isHtml || false,
        htmlContent: item.isHtml ? (item.label || item.name || item.text) : null
      }))
    } else if (response?.data?.data) {
      options = response.data.data.map((item: any) => ({
        value: item.value || item.id || item.Oid,
        label: item.label || item.name || item.text,
        isHtml: item.isHtml || false,
        htmlContent: item.isHtml ? (item.label || item.name || item.text) : null
      }))
    } else if (response?.data && Array.isArray(response.data)) {
      options = response.data.map((item: any) => ({
         value: item.value || item.id || item.Oid,
         label: item.label || item.name || item.text,
         isHtml: item.isHtml || false,
         htmlContent: item.isHtml ? (item.label || item.name || item.text) : null
      }))
    } else if ((response as any)?.data?.children && Array.isArray((response as any).data.children)) {
      options = (response as any).data.children.map((item: any) => ({
         value: item.value || item.id || item.Oid,
         label: item.label || item.name || item.text,
         isHtml: item.isHtml || false,
         htmlContent: item.isHtml ? (item.label || item.name || item.text) : null
      }))
    }
    
    if (options.length > 0) {
      const normalizeVal = getNormalizedValue(value)
      const exactMatch = options.find((o: any) => getNormalizedValue(o.value) === normalizeVal)

      const existingCache = optionsCache.value[key] || []
      if (exactMatch) {
        if (!existingCache.find((o: any) => getNormalizedValue(o.value) === normalizeVal)) {
          optionsCache.value[key] = [...existingCache, exactMatch]
        }
      } else {
        const newValidOptions = options.filter(o => !existingCache.find((ec: any) => ec.value === o.value))
        optionsCache.value[key] = [...existingCache, ...newValidOptions]
      }
    }
  } catch (error) {
    console.error('Failed to fetch initial autocomplete option:', error)
  }
}

// Helper function to initialize form fields
const initializeFormFields = (formDataData: any) => {
  if (!formDataData?.group_fields) return
  
  formDataData.group_fields.forEach((group: any) => {
    group.fields.forEach((field: any) => {
      // For autocomplete with ID: fetch label. Otherwise fallback to standard fetchOptions
      if (['autocomplete', 'autocompletes'].includes(field.columnType)) {
        if (field.columnValue) {
          fetchAutocompleteOptionByValue(field)
        } else {
          fetchOptions(field)
        }
      } else if (['dropdown', 'select', 'multiSelect', 'checkboxList', 'checkboxradiolist', 'selectTree', 'selectTrees'].includes(field.columnType)) {
        fetchOptions(field)
      }
      
      // Initialize multi-select as array
      if (['multiSelect', 'checkboxList'].includes(field.columnType) && !Array.isArray(field.columnValue)) {
        if (typeof field.columnValue === 'string' && field.columnValue.trim() !== '') {
          field.columnValue = field.columnValue.split(',').map((v: string) => v.trim()).filter(Boolean)
        } else if (field.columnValue !== null && field.columnValue !== undefined && field.columnValue !== '') {
          field.columnValue = [field.columnValue]
        } else {
          field.columnValue = []
        }
      }
      
      // Initialize selectTree/selectTrees as array ONLY if columnValue is null/undefined
      if ((field.columnType === 'selectTree' || field.columnType === 'selectTrees')) {
        if (field.columnValue === null || field.columnValue === undefined) {
          field.columnValue = null
        }
      }
      
      // Initialize chips as array
      if (field.columnType === 'chips' && !field.columnValue) {
        field.columnValue = []
      }
      
      // Load danh sách file từ API khi field có columnValue (groupFileId) và columnObject (URL)
      if (['file', 'files', 'image'].includes(field.columnType) && field.columnValue && field.columnObject) {
        loadFieldFiles(field).catch(() => {})
      }
    })
  })
}

// Lazy-load options: chỉ gọi API khi người dùng tương tác mà cache chưa có
const ensureOptionsLoaded = (field: any) => {
  if (!field?.columnObject) return
  const key = getFieldKey(field)
  if (optionsCache.value[key]?.length) return
  fetchOptions(field)
}

// Initialize: Load all dropdown options and file info
onMounted(() => {
  initializeFormFields(formData.value)
})

onUnmounted(() => {
  Object.values(fileBlobUrlsCache.value).forEach((entry) => {
    if (entry?.url) URL.revokeObjectURL(entry.url)
  })
  fileBlobUrlsCache.value = {}
})

// Get form data for external submission
// This function processes the form data similar to buildPayload() and returns full object with values, flat, etc.
// Used by parent components that call getFormData() directly instead of using @submit event
// IMPORTANT: This function validates the form before returning data. If validation fails, it throws an error.
const getFormData = (skipValidation: boolean = false) => {
  if (!skipValidation) {
    const validation = validateForm()
    if (!validation.isValid) {
      const errorMessages = Object.values(errors.value).join(', ')
      throw new Error(`Validation failed: ${errorMessages}`)
    }
  }
  
  if (!formData.value?.group_fields) {
    return {
      tableKey: formData.value?.tableKey || '',
      groupKey: formData.value?.groupKey || '',
      group_fields: [],
      values: {},
      flat: {},
      fields: {},
      meta: {
        mode: props.isView ? 'view' : props.isFilter ? 'filter' : 'edit',
        hasFiles: false,
      },
    }
  }
  
  // Process fields using common function (includes final check for empty arrays)
  const processedGroups = processGroupFields(formData.value.group_fields || [], props.isView)
  
  // Build values and flat structure using common function
  const { values, flat, fields, hasFiles } = buildValuesAndFlat(processedGroups, props.isView)
  
  return {
    tableKey: formData.value?.tableKey || '',
    groupKey: formData.value?.groupKey || '',
    group_fields: processedGroups,
    values,
    flat,
    fields,
    meta: {
      mode: props.isView ? 'view' : props.isFilter ? 'filter' : 'edit',
      hasFiles,
    },
  }
}

// Get group icon based on group name or key
const getGroupIcon = (group: any) => {
  const groupName = group.group_name?.toLowerCase() || group.group_key?.toLowerCase() || ''
  
  // Map based on group name (common patterns)
  if (groupName.includes('thông tin') || groupName.includes('information') || groupName.includes('info')) return Info
  if (groupName.includes('cá nhân') || groupName.includes('personal') || groupName.includes('người dùng') || groupName.includes('user')) return User
  if (groupName.includes('công ty') || groupName.includes('company') || groupName.includes('tổ chức') || groupName.includes('organization')) return Building
  if (groupName.includes('địa chỉ') || groupName.includes('address') || groupName.includes('location')) return MapPin
  if (groupName.includes('liên hệ') || groupName.includes('contact') || groupName.includes('phone') || groupName.includes('email')) return Phone
  if (groupName.includes('thẻ') || groupName.includes('card') || groupName.includes('credit')) return CreditCard
  if (groupName.includes('tài liệu') || groupName.includes('document') || groupName.includes('file') || groupName.includes('hồ sơ')) return FileText
  if (groupName.includes('thư mục') || groupName.includes('folder') || groupName.includes('category')) return Folder
  if (groupName.includes('gói') || groupName.includes('package') || groupName.includes('bundle')) return Package
  if (groupName.includes('cài đặt') || groupName.includes('setting') || groupName.includes('config')) return Settings
  if (groupName.includes('danh sách') || groupName.includes('list') || groupName.includes('checklist')) return ClipboardList
  if (groupName.includes('kiểm tra') || groupName.includes('check') || groupName.includes('verify')) return FileCheck
  if (groupName.includes('lớp') || groupName.includes('layer') || groupName.includes('nhóm')) return Layers
  
  // Default icon
  return FileText
}

// Get field icon based on field type and name
// const getFieldIcon = (field: any) => {
//   // Map based on field name (common patterns)
//   const fieldName = field.columnLabel?.toLowerCase() || field.field_name?.toLowerCase() || ''
  
//   if (fieldName.includes('email') || fieldName.includes('mail')) return Mail
//   if (fieldName.includes('phone') || fieldName.includes('điện thoại') || fieldName.includes('sdt')) return Phone
//   if (fieldName.includes('name') || fieldName.includes('tên') || fieldName.includes('họ')) return User
//   if (fieldName.includes('company') || fieldName.includes('công ty') || fieldName.includes('organization')) return Building
//   if (fieldName.includes('id') || fieldName.includes('mã') || fieldName.includes('code')) return IdCard
//   if (fieldName.includes('address') || fieldName.includes('địa chỉ') || fieldName.includes('location')) return MapPin
//   if (fieldName.includes('card') || fieldName.includes('thẻ')) return CreditCard
//   if (fieldName.includes('date') || fieldName.includes('ngày')) return CalendarIcon
//   if (fieldName.includes('time') || fieldName.includes('giờ') || fieldName.includes('thời gian')) return Clock
//   if (fieldName.includes('department') || fieldName.includes('phòng ban')) return Building
  
//   // Map based on field type
//   switch (field.columnType) {
//     case 'input':
//     case 'text':
//       return Type
//     case 'textarea':
//       return MessageSquare
//     case 'number':
//       return Hash
//     case 'select':
//     case 'dropdown':
//       return List
//     case 'checkbox':
//     case 'multiSelect':
//       return CheckSquare
//     case 'date':
//       return CalendarIcon
//     case 'time':
//       return Clock
//     default:
//       return User // Default icon
//   }
// }

// Expose methods for parent component
defineExpose({
  handleSubmit,
  getFormData,
  validateForm,
  hasErrors: () => Object.keys(errors.value).length > 0, // Use function instead of computed
  getErrors: () => ({ ...errors.value }) // Return a copy instead of readonly wrapper
})
</script>

<style scoped>
.form-loading-fade-enter-active,
.form-loading-fade-leave-active {
  transition: opacity 0.15s ease;
}
.form-loading-fade-enter-from,
.form-loading-fade-leave-to {
  opacity: 0;
}

.dynamic-form {
  display: flex;
  flex-direction: column;
  gap: 1rem; /* space-y-4 equivalent */
  /* Removed padding and background-color - handled by BizzoneCard and parent container */
}

/* 12-column grid system - matching Bootstrap layout exactly */

/* Field styling to match mockup */
.dynamic-form .grid {
  gap: 0.75rem; /* gap-3 equivalent */
}

.dynamic-form .grid > div {
  gap: 0; /* space-y-0 equivalent */
  display: flex !important;
  flex-direction: column !important;
  justify-content: flex-start !important;
}

/* Ensure all field wrappers align items consistently */
.dynamic-form [data-field-key] {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  justify-content: flex-start !important;
}

/* Ensure labels are aligned consistently */
.dynamic-form [data-field-key] > div:first-child {
  display: flex !important;
  align-items: center !important;
  margin-bottom: 0.25rem !important; /* 4px - matching mockup spacing */
  min-height: 20px !important;
}

/* Label color */
.dynamic-form label {
  color: #6b7280 !important;
}

/* Ensure all input components have consistent vertical alignment */
.dynamic-form [data-field-key] > .p-select,
.dynamic-form [data-field-key] > .p-dropdown,
.dynamic-form [data-field-key] > .p-calendar,
.dynamic-form [data-field-key] > input:not([type="hidden"]),
.dynamic-form [data-field-key] > textarea {
  margin-top: 0 !important;
  vertical-align: top !important;
}

/* Input styling adjustments */
.dynamic-form input,
.dynamic-form textarea,
.dynamic-form select {
  font-size: 0.875rem; /* text-sm = 14px */
  line-height: 1.25rem; /* text-sm line-height */
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  border: 1px solid #E6E8EB !important;
  border-radius: 6px !important;
  padding: 0.5rem 0.75rem !important;
  outline: none;
}

.dynamic-form input:focus,
.dynamic-form textarea:focus,
.dynamic-form select:focus {
  border-color: #F76808 !important;
  box-shadow: 0 0 0 1px #F76808 !important;
}

/* Disabled input styling - match mockup */
.dynamic-form input:disabled,
.dynamic-form textarea:disabled {
  background-color: #E6E8EB !important;
  color: #888D96 !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
}

/* PrimeVue Select - Match height and font size with other inputs (same as Calendar) */
.dynamic-form .p-select,
.dynamic-form .p-dropdown {
  width: 100%; /* w-full */
  font-size: 0.875rem !important; /* text-sm = 14px */
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}
.p-select {
  border: 1px solid #E6E8EB !important;
}
.dynamic-form .p-select .p-select-label,
.dynamic-form .p-select .p-select-trigger,
.dynamic-form .p-dropdown .p-dropdown-label,
.dynamic-form .p-dropdown .p-dropdown-trigger {
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
.dynamic-form .p-select .p-select-label.p-placeholder,
.dynamic-form .p-dropdown .p-dropdown-label.p-placeholder {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-start !important;
  height: 36px !important;
  line-height: 36px !important;
}


.dynamic-form .p-select .p-select-label input,
.dynamic-form .p-dropdown .p-dropdown-label input {
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

.dynamic-form .p-select .p-select-label .flex,
.dynamic-form .p-dropdown .p-dropdown-label .flex {
  display: flex !important;
  align-items: center !important;
  height: 100% !important;
  line-height: 36px !important;
  font-size: 0.875rem !important; /* text-sm = 14px */
  color: inherit !important;
  font-weight: inherit !important;
}

.dynamic-form .p-select .p-select-label .flex div,
.dynamic-form .p-dropdown .p-dropdown-label .flex div {
  font-size: 0.875rem !important; /* text-sm = 14px */
}

/* Badge styling in selected value - match option badge size */
/* Only target badge elements inside the label, not the label itself */
.dynamic-form .p-select .p-select-label .flex div .noti-number,
.dynamic-form .p-select .p-select-label .flex div [data-slot="badge"],
.dynamic-form .p-select .p-select-label .noti-number,
.dynamic-form .p-select .p-select-label [data-slot="badge"],
.dynamic-form .p-dropdown .p-dropdown-label .flex div .noti-number,
.dynamic-form .p-dropdown .p-dropdown-label .flex div [data-slot="badge"],
.dynamic-form .p-dropdown .p-dropdown-label .noti-number,
.dynamic-form .p-dropdown .p-dropdown-label [data-slot="badge"] {
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
.dynamic-form .p-select .p-select-label .flex div,
.dynamic-form .p-dropdown .p-dropdown-label .flex div {
  display: inline-flex !important;
  align-items: center !important;
  height: auto !important;
  min-height: auto !important;
  max-height: 100% !important;
  line-height: normal !important;
}

.dynamic-form .p-select .p-placeholder,
.dynamic-form .p-dropdown .p-placeholder {
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


.dynamic-form .p-select .p-select-trigger-icon,
.dynamic-form .p-dropdown .p-dropdown-trigger-icon {
  height: 36px !important;
  width: 36px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* PrimeVue DatePicker - Match Select styling (same font size and color) */
.dynamic-form .p-datepicker {
  width: 100%; /* w-full */
  font-size: 0.875rem; /* text-sm = 14px */
  line-height: 1.25rem; /* text-sm line-height */
  font-size: 0.875rem !important; /* text-sm = 14px */
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

.dynamic-form .p-datepicker * {
  font-size: 0.875rem !important; /* text-sm = 14px - Apply to all children */
}

.dynamic-form .p-datepicker .p-inputtext,
.dynamic-form .p-datepicker input,
.dynamic-form .p-datepicker .p-datepicker-input {
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

.dynamic-form .p-datepicker .p-inputwrapper {
  width: 100%; /* w-full */
  font-size: 0.875rem !important; /* text-sm = 14px */
}

.dynamic-form .p-datepicker .p-datepicker-trigger {
  height: 36px !important;
  width: 36px !important;
  font-size: 0.875rem !important; /* text-sm = 14px */
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* Hide duplicate inputs if any */
.dynamic-form .p-datepicker input[type="hidden"] {
  display: none !important;
}

/* Ensure only DatePicker input is visible for date fields - hide any other inputs in the same container */

/* Hide any Input component that appears after DatePicker for date fields */
.dynamic-form [data-field-key]:has(.p-datepicker) > input[type="text"]:not(.p-inputtext),
.dynamic-form [data-field-key]:has(.date-field-calendar) > input[type="text"]:not(.p-inputtext) {
  display: none !important;
}

/* Ensure only one input is visible in date field container */
.dynamic-form [data-field-key]:has(.date-field-calendar) {
  position: relative;
}

.dynamic-form [data-field-key]:has(.date-field-calendar) > input[type="text"]:not(.p-inputtext):not(.p-datepicker-input) {
  display: none !important;
}


/* bắt đầu - style thẻ với class [card-style-1] */
.card-style-1-body {
  position: relative;
  width: 100%;
  max-width: 450px;
}
.card-style-1 label, .card-style-1 p, .card-style-1 svg {
  display: none;
}
.card-style-1-body input {
  width: 40px;
  height: 40px;
  position: absolute;
  bottom: 10px;
  right: 30px;
  opacity: 0;
  z-index: 1;
  cursor: pointer;
}
.card-style-1-body svg {
  display: block;
  position: absolute;
  bottom: 18px;
  right: 38px;
  width: 25px;
  height: 25px;
  z-index: 1;
  pointer-events: none;
}
.card-style-1-body svg{
  color:black !important;
}
.card-style-1-body img {
  border-radius: 40px;
  width: 100%;
  max-width: 450px;
  height: 265px;
  min-height: 265px;
}
/* kết thúc - style thẻ với class [card-style-1] */

/* bắt đầu - style thẻ với class [attached-style-1] */
.attached-style-1-body {
  width: 100%;
}
/* kết thúc - style thẻ với class [attached-style-1] */

/* bắt đầu - style thẻ với class [attached-style-2] */
.attached-style-2-body {
  width: 100%;
}
/* kết thúc - style thẻ với class [attached-style-2] */

/* bắt đầu - style thẻ với class [attached-style-3] */
.attached-style-3-body {
  width: 100%;
}
/* kết thúc - style thẻ với class [attached-style-3] */
</style>


