<template>
  <div class="discussion-composer glass-card">
    <h3 class="composer-title">{{ $t('community.newDiscussion') }}</h3>

    <div class="composer-body">
      <!-- 标题输入 -->
      <Input
        v-model="title"
        type="text"
        class="composer-title-input"
        :placeholder="$t('community.discussionTitle')"
        maxlength="100"
      />

      <!-- 分类选择 -->
      <div class="category-selector">
        <button
          v-for="cat in categories"
          :key="cat.value"
          type="button"
          class="category-btn"
          :class="{ active: category === cat.value }"
          @click="category = cat.value"
        >
          {{ cat.label }}
        </button>
      </div>

      <Textarea
        ref="textareaRef"
        v-model="content"
        class="composer-textarea"
        :placeholder="$t('community.discussionPlaceholder')"
        rows="4"
        @update:modelValue="handleInput"
        @keydown="handleKeydown"
      />

      <div v-if="showMentions" class="mentions-dropdown glass-card">
        <div v-if="isSearching" class="mentions-loading">
          <span class="spinner spinner-sm" />
        </div>
        <div
          v-for="(post, index) in searchResults"
          :key="post.id"
          class="mention-item"
          :class="{ active: index === selectedIndex }"
          @click="selectMention(post)"
        >
          <img
            v-if="post.thumbnail_url"
            :src="post.thumbnail_url"
            :alt="post.title"
            class="mention-thumb"
            loading="lazy"
          />
          <div class="mention-info">
            <span class="mention-title">{{ post.title }}</span>
            <span v-if="post.author_name" class="mention-author">{{ post.author_name }}</span>
          </div>
        </div>
        <div v-if="!isSearching && searchResults.length === 0" class="mentions-empty">
          {{ $t('common.noResults') }}
        </div>
      </div>

      <div v-if="selectedPosts.length > 0" class="selected-posts">
        <div v-for="post in selectedPosts" :key="post.id" class="selected-post-tag">
          <span>@{{ post.title }}</span>
          <button
            type="button"
            class="remove-tag"
            :aria-label="$t('common.remove')"
            @click="removePost(post.id)"
          >
            ×
          </button>
        </div>
      </div>

      <div class="tags-input">
        <Input
          v-model="tagInput"
          type="text"
          class="tag-input"
          :placeholder="$t('community.addTags')"
          @keydown.enter.prevent="addTag"
          @keydown.space.prevent="addTag"
        />
        <div v-if="tags.length > 0" class="tags-list">
          <span v-for="tag in tags" :key="tag" class="tag-badge">
            #{{ tag }}
            <button
              type="button"
              class="remove-tag"
              :aria-label="$t('common.remove')"
              @click="removeTag(tag)"
            >
              ×
            </button>
          </span>
        </div>
      </div>
    </div>

    <div class="composer-footer">
      <div class="composer-hints">
        <span class="hint">{{ $t('community.mentionHint') }}</span>
      </div>
      <Button :disabled="!canSubmit || isSubmitting" @click="handleSubmit">
        <span v-if="isSubmitting" class="spinner spinner-sm" />
        {{ $t('community.publish') }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  discussionService,
  type PostReference,
  type Discussion,
  type CreateDiscussionRequest,
} from '@/api'
import { useToastStore } from '@/stores'
import { debounce } from '@/utils/performance'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'

const emit = defineEmits<{
  created: [discussion: Discussion]
}>()

const { t } = useI18n()
const toastStore = useToastStore()

const textareaRef = ref<{ el: HTMLTextAreaElement | null } | null>(null)
const content = ref('')
const tagInput = ref('')
const tags = ref<string[]>([])
const selectedPosts = ref<PostReference[]>([])
const title = ref('')
const category = ref<'general' | 'question' | 'sharing' | 'feedback'>('general')

const showMentions = ref(false)
const searchResults = ref<PostReference[]>([])
const isSearching = ref(false)
const selectedIndex = ref(0)
const mentionStart = ref(-1)
const isSubmitting = ref(false)

const canSubmit = computed(() => title.value.trim().length > 0 && content.value.trim().length > 0)

const categories = [
  { value: 'general' as const, label: '💬 综合' },
  { value: 'question' as const, label: '❓ 提问' },
  { value: 'sharing' as const, label: '📢 分享' },
  { value: 'feedback' as const, label: '💡 反馈' },
]

// 使用 debounce 优化帖子搜索
const debouncedSearchPosts = debounce(async (query: string) => {
  isSearching.value = true
  try {
    searchResults.value = await discussionService.searchPosts(query, 5)
  } catch {
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}, 300)

function handleInput() {
  const textarea = textareaRef.value?.el
  if (!textarea) return

  const cursorPos = textarea.selectionStart
  const textBeforeCursor = content.value.slice(0, cursorPos)

  const atMatch = textBeforeCursor.match(/@(\S*)$/)

  if (atMatch && atMatch[1] !== undefined) {
    mentionStart.value = cursorPos - atMatch[0].length
    const query = atMatch[1]

    if (query.length > 0) {
      showMentions.value = true
      debouncedSearchPosts(query)
    } else {
      showMentions.value = true
      searchResults.value = []
    }
  } else {
    showMentions.value = false
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (!showMentions.value) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selectedIndex.value = Math.min(selectedIndex.value + 1, searchResults.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
  } else if (e.key === 'Enter' && searchResults.value.length > 0) {
    e.preventDefault()
    selectMention(searchResults.value[selectedIndex.value]!)
  } else if (e.key === 'Escape') {
    showMentions.value = false
  }
}

function selectMention(post: PostReference) {
  if (!selectedPosts.value.some((p) => p.id === post.id)) {
    selectedPosts.value.push(post)
  }

  const textarea = textareaRef.value?.el
  if (textarea && mentionStart.value >= 0) {
    const before = content.value.slice(0, mentionStart.value)
    const after = content.value.slice(textarea.selectionStart)
    content.value = before + `@${post.title} ` + after
  }

  showMentions.value = false
  selectedIndex.value = 0
  textareaRef.value?.el?.focus()
}

function removePost(postId: string) {
  selectedPosts.value = selectedPosts.value.filter((p) => p.id !== postId)
}

function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#/, '').replace(/\s+/g, '')
}

function addTag() {
  const tag = normalizeTag(tagInput.value)
  if (tag && !tags.value.includes(tag)) {
    tags.value.push(tag)
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  tags.value = tags.value.filter((t) => t !== tag)
}

async function handleSubmit() {
  if (!canSubmit.value || isSubmitting.value) return

  isSubmitting.value = true

  const payload: CreateDiscussionRequest = {
    title: title.value.trim(),
    content: content.value.trim(),
    category: category.value,
  }

  const normalizedTags = tags.value.map(normalizeTag).filter(Boolean)
  if (normalizedTags.length > 0) {
    payload.tags = normalizedTags.slice(0, 5)
  }

  // 添加引用帖子（只支持单个引用）
  if (selectedPosts.value.length > 0) {
    payload.referenced_post_id = selectedPosts.value[0]!.id
  }

  try {
    const discussion = await discussionService.create(payload)

    title.value = ''
    content.value = ''
    tags.value = []
    selectedPosts.value = []

    toastStore.success(t('community.publishSuccess'))
    emit('created', discussion)
  } catch (err) {
    const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 0
    const canRetry = status === 422 && (payload.tags?.length || payload.referenced_post_id)
    if (canRetry) {
      try {
        const fallbackPayload: CreateDiscussionRequest = {
          title: payload.title,
          content: payload.content,
          category: payload.category,
        }
        const discussion = await discussionService.create(fallbackPayload)

        title.value = ''
        content.value = ''
        tags.value = []
        selectedPosts.value = []

        toastStore.success(t('community.publishSuccess'))
        emit('created', discussion)
        return
      } catch {
        // fall through to error handling
      }
    }

    if (status === 422) {
      const apiErr = err as { details?: { detail?: string }; message?: string }
      const errorMsg = apiErr.details?.detail || apiErr.message || t('error.validationError')
      toastStore.error(errorMsg)
    } else {
      toastStore.error(t('community.publishFailed'))
    }
  } finally {
    isSubmitting.value = false
  }
}

watch(searchResults, () => {
  selectedIndex.value = 0
})
</script>

<style scoped>
.discussion-composer {
  padding: var(--spacing-4);
}

.composer-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin-bottom: var(--spacing-4);
}

.composer-body {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.composer-title-input {
  width: 100%;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
}

.category-selector {
  display: flex;
  gap: var(--spacing-2);
  flex-wrap: wrap;
}

.category-btn {
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  background: var(--glass-bg-light);
  border: 1px solid var(--glass-border);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.category-btn:hover {
  background: var(--glass-bg);
  border-color: var(--color-primary-light);
}

.category-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.composer-textarea {
  width: 100%;
  resize: vertical;
  min-height: 100px;
  font-size: var(--text-base);
}

.mentions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
  margin-top: var(--spacing-1);
}

.mentions-loading,
.mentions-empty {
  padding: var(--spacing-3);
  text-align: center;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.mention-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-2) var(--spacing-3);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.mention-item:hover,
.mention-item.active {
  background: var(--glass-bg-light);
}

.mention-thumb {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.mention-info {
  flex: 1;
  min-width: 0;
}

.mention-title {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mention-author {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.selected-posts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin-top: var(--spacing-3);
}

.selected-post-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  background: var(--color-primary-light);
  color: var(--color-primary);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
}

.remove-tag {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 12px;
  line-height: 1;
  opacity: 0.7;
  transition: opacity var(--transition-fast);
}

.remove-tag:hover {
  opacity: 1;
}

.tags-input {
  margin-top: var(--spacing-3);
}

.tag-input {
  width: 100%;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin-top: var(--spacing-2);
}

.tag-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: var(--spacing-1) var(--spacing-2);
  background: var(--glass-bg-light);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--spacing-4);
  padding-top: var(--spacing-3);
  border-top: 1px solid var(--glass-border);
}

.composer-hints {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.hint {
  display: block;
}
</style>
