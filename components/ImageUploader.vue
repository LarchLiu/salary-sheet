<!-- eslint-disable no-alert -->
<!-- eslint-disable no-console -->
<script setup lang="ts">
import type { ImageInfo, User } from '~/types'

const images = ref<ImageInfo[]>([])
const salaryPeriod = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const making = ref(false)
const selectedUser = ref<User[]>([])
const editingCell = ref<{ rowIndex: number, field: keyof User } | null>(null)

const { data: users, error: usersError, refresh } = await useFetch('/api/users')

const allSelected = computed({
  get: () => users.value && users.value.length > 0 && selectedUser.value.length === users.value.length,
  set: (value: boolean) => {
    if (users.value) {
      selectedUser.value = value ? [...users.value] : []
    }
  },
})

function toggleUser(user: User) {
  const index = selectedUser.value.findIndex(u => u.id === user.id)
  if (index > -1) {
    selectedUser.value.splice(index, 1)
  }
  else {
    selectedUser.value.push(user)
  }
}

watch(usersError, () => {
  if (usersError && usersError.value) {
    alert(`获取人员信息失败：${usersError.value.message || usersError.value.statusMessage}`)
  }
})

function startEditing(rowIndex: number, field: keyof User) {
  editingCell.value = { rowIndex, field }
}

async function finishEditing() {
  let user
  if (users.value && users.value.length && editingCell.value && editingCell.value.rowIndex) {
    user = users.value[editingCell.value.rowIndex]
    await $fetch('/api/users', {
      method: 'PATCH',
      body: user,
    })
    await refresh()
  }
  nextTick(() => {
    editingCell.value = null
  })
}

function updateCellValue(_event: Event, _rowIndex: number, _field: keyof User) {
  finishEditing()
}

function openFileInput() {
  images.value = []
  fileInput.value && fileInput.value.click()
}

function handleFileChange(event: any) {
  const files = event.target.files
  console.log(files.length)
  if (files) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const reader = new FileReader()
      reader.onload = (e) => {
        images.value.push({
          file,
          url: e.target!.result as string,
          name: file.name,
        })
      }
      reader.readAsDataURL(file)
    }
  }
}

async function uploadImages() {
  if (images.value.length === 0) {
    alert('Please select images to upload.')
    return
  }

  uploading.value = true
  const formData = new FormData()
  images.value.forEach((image) => {
    formData.append(`image`, image.file)
  })

  try {
    const res = await $fetch('/api/users', {
      method: 'POST',
      body: formData,
    })

    alert(`有效人员信息: ${res.users.map(u => u.name).join(', ')}\n${res.errorMessages.length ? `无效人员信息: \n${res.errorMessages.join('\n')}` : ''}`)
    console.log('Upload successful:', res)
  }
  catch (error: any) {
    console.error('Error uploading images:', error)
    alert(error.message || error.statusMessage)
  }
  finally {
    uploading.value = false
    await refresh()
  }
}

async function makeSheet() {
  making.value = true
  try {
    const response = await $fetch('/api/sheet', {
      method: 'POST',
      body: {
        salaryDate: salaryPeriod.value,
        users: selectedUser.value,
      },
      responseType: 'arrayBuffer', // Changed to arrayBuffer
    })

    if (response) {
      const url = window.URL.createObjectURL(new Blob([response as ArrayBuffer])) // Cast to ArrayBuffer
      const link = document.createElement('a')
      link.href = url
      const filename = `工资表_${salaryPeriod.value || '未知日期'}.xlsx`
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    }
  }
  catch (error: any) {
    console.error('Error generating sheet:', error)
    alert(error.message || error.statusMessage)
  }
  finally {
    making.value = false
    await refresh()
  }
}

async function deleteSelectedUsers() {
  if (selectedUser.value.length === 0) {
    alert('请选择要删除的人员。')
    return
  }

  if (!confirm(`确定要删除选中的 ${selectedUser.value.length} 位人员吗？`)) {
    return
  }

  try {
    const idsToDelete = selectedUser.value.map(u => u.id)
    await $fetch('/api/users', {
      method: 'DELETE',
      body: { ids: idsToDelete },
    })
    alert('人员删除成功！')
    selectedUser.value = [] // Clear selection after deletion
    await refresh() // Refresh the user list
  }
  catch (error: any) {
    console.error('Error deleting users:', error)
    alert(`删除人员失败：${error.message || error.statusMessage}`)
  }
}
</script>

<template>
  <div class="p-4 border border-gray-300 rounded-lg shadow-md">
    <h2 class="text-xl font-semibold mb-4">
      添加人员
    </h2>

    <button
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      @click="openFileInput"
    >
      选择图片(可多选)
    </button>

    <div v-if="images.length > 0" class="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="(image, index) in images" :key="index" class="relative">
        <img :src="image.url" :alt="image.name" class="w-full h-32 object-cover rounded-md">
        <p class="text-sm text-gray-600 mt-1 truncate">
          {{ image.name }}
        </p>
      </div>
    </div>

    <button
      v-if="images.length > 0"
      class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
      :disabled="images.length === 0 || uploading"
      @click="uploadImages"
    >
      {{ uploading ? 'Uploading...' : '上传' }}
    </button>

    <input
      ref="fileInput"
      type="file"
      multiple
      accept="image/*"
      class="hidden"
      @change="handleFileChange"
    >
    <div class="my-4">
      <label for="salaryPeriod" class="block text-gray-700 text-xl font-semibold mb-2">工资属期:</label>
      <input
        id="salaryPeriod"
        v-model="salaryPeriod"
        type="date"
        class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
      >
    </div>

    <div v-if="users && users.length > 0" class="mt-8">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">
          {{ `选择已有人员 (共 ${users.length} 人)` }}
        </h2>
        <button
          v-if="selectedUser.length > 0"
          class="bg-red-500 hover:bg-red-700 text-white text-sm font-bold py-1 px-2 rounded focus:outline-none focus:shadow-outline"
          @click="deleteSelectedUsers"
        >
          删除选中人员
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th colspan="8" class="px-6 py-3 text-left text-lg font-medium text-gray-700">
                工资属期: {{ salaryPeriod }} <span v-if="!salaryPeriod && selectedUser.length" class="text-red-500 text-base">请选择工资属期以生成工资表</span>
              </th>
            </tr>
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  v-model="allSelected"
                  type="checkbox"
                  class="form-checkbox h-4 w-4 text-blue-600"
                >
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                姓名
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                身份证号码
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                电话号码
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                银行卡
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                开户行名称
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                工资
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                工种
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(user, rowIndex) in users" :key="rowIndex">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                <input
                  type="checkbox"
                  :checked="selectedUser.some(u => u.id === user.id)"
                  class="form-checkbox h-4 w-4 text-blue-600"
                  @change="toggleUser(user)"
                >
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" @click="startEditing(rowIndex, 'name')">
                <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'name'">
                  {{ user.name }}
                </span>
                <input
                  v-else
                  v-model="user.name"
                  type="text"
                  class="w-full border rounded px-0 py-1"
                  @blur="updateCellValue($event, rowIndex, 'name')"
                  @keydown.enter="updateCellValue($event, rowIndex, 'name')"
                >
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500" @click="startEditing(rowIndex, 'identity')">
                <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'identity'">
                  {{ `${user.identity}` }}
                </span>
                <input
                  v-else
                  v-model="user.identity"
                  type="text"
                  class="w-full border rounded px-0 py-1"
                  @blur="updateCellValue($event, rowIndex, 'identity')"
                  @keydown.enter="updateCellValue($event, rowIndex, 'identity')"
                >
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" @click="startEditing(rowIndex, 'phone')">
                <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'phone'">
                  {{ user.phone }}
                </span>
                <input
                  v-else
                  v-model="user.phone"
                  type="text"
                  class="w-full border rounded px-0 py-1"
                  @blur="updateCellValue($event, rowIndex, 'phone')"
                  @keydown.enter="updateCellValue($event, rowIndex, 'phone')"
                >
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" @click="startEditing(rowIndex, 'bankcard')">
                <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'bankcard'">
                  {{ `${user.bankcard}` }}
                </span>
                <input
                  v-else
                  v-model="user.bankcard"
                  type="text"
                  class="w-full border rounded px-0 py-1"
                  @blur="updateCellValue($event, rowIndex, 'bankcard')"
                  @keydown.enter="updateCellValue($event, rowIndex, 'bankcard')"
                >
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" @click="startEditing(rowIndex, 'address')">
                <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'address'">
                  {{ user.address }}
                </span>
                <input
                  v-else
                  v-model="user.address"
                  type="text"
                  class="w-full border rounded px-0 py-1"
                  @blur="updateCellValue($event, rowIndex, 'address')"
                  @keydown.enter="updateCellValue($event, rowIndex, 'address')"
                >
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" @click="startEditing(rowIndex, 'salary')">
                <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'salary'">
                  {{ user.salary }}
                </span>
                <input
                  v-else
                  v-model.number="user.salary"
                  type="number"
                  class="w-full border rounded px-0 py-1"
                  @blur="updateCellValue($event, rowIndex, 'salary')"
                  @keydown.enter="updateCellValue($event, rowIndex, 'salary')"
                >
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500" @click="startEditing(rowIndex, 'job')">
                <span v-if="editingCell?.rowIndex !== rowIndex || editingCell?.field !== 'job'">
                  {{ user.job }}
                </span>
                <input
                  v-else
                  v-model="user.job"
                  type="text"
                  class="w-full border rounded px-0 py-1"
                  @blur="updateCellValue($event, rowIndex, 'job')"
                  @keydown.enter="updateCellValue($event, rowIndex, 'job')"
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div>
      <button
        v-if="selectedUser.length && salaryPeriod"
        class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mt-4"
        :disabled="making"
        @click="makeSheet"
      >
        {{ making ? '正在生成...' : '生成工资表' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* No specific styles needed here, Tailwind handles most of it */
</style>
