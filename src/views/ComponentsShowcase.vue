<template>
  <div class="showcase" data-build-exclude>
    <div class="container">
      <div class="showcase-header">
        <h1>shadcn/ui 风格组件库</h1>
        <p>使用 CSS 变量实现的 shadcn/ui 风格组件，保持玻璃态设计风格</p>
      </div>

      <!-- Buttons Section -->
      <section class="showcase-section">
        <h2>Button</h2>
        <p class="section-desc">多种变体和尺寸的按钮组件</p>

        <div class="showcase-group">
          <h3>变体 (Variants)</h3>
          <div class="button-grid">
            <Button variant="default">Default</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
          </div>
        </div>

        <div class="showcase-group">
          <h3>尺寸 (Sizes)</h3>
          <div class="button-grid">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
        </div>

        <div class="showcase-group">
          <h3>带图标 (With Icons)</h3>
          <div class="button-grid">
            <Button :icon="Mail" icon-position="left">Email</Button>
            <Button :icon="Download" icon-position="right" variant="outline">Download</Button>
            <Button :icon="Plus" size="icon" variant="secondary" />
            <Button :icon="Trash2" size="icon" variant="destructive" />
          </div>
        </div>

        <div class="showcase-group">
          <h3>状态 (States)</h3>
          <div class="button-grid">
            <Button :loading="true">Loading</Button>
            <Button :disabled="true">Disabled</Button>
            <Button :loading="true" variant="outline">Loading</Button>
          </div>
        </div>
      </section>

      <!-- Input Section -->
      <section class="showcase-section">
        <h2>Input</h2>
        <p class="section-desc">表单输入框组件</p>

        <div class="showcase-group">
          <div class="form-demo">
            <FormField label="用户名" description="请输入您的用户名">
              <Input v-model="inputDemo" placeholder="请输入..." />
            </FormField>

            <FormField label="邮箱" error="请输入有效的邮箱地址">
              <Input v-model="inputDemo" type="email" error placeholder="example@email.com" />
            </FormField>

            <FormField label="密码" :required="true">
              <Input v-model="inputDemo" type="password" placeholder="••••••••" />
            </FormField>

            <FormField label="禁用状态" :disabled="true">
              <Input v-model="inputDemo" disabled placeholder="已禁用" />
            </FormField>
          </div>
        </div>
      </section>

      <!-- Select Section -->
      <section class="showcase-section">
        <h2>Select</h2>
        <p class="section-desc">下拉选择框组件</p>

        <div class="showcase-group">
          <div class="form-demo">
            <FormField label="选择主题">
              <Select v-model="selectDemo">
                <option value="">请选择...</option>
                <option value="light">浅色</option>
                <option value="dark">深色</option>
                <option value="system">跟随系统</option>
              </Select>
            </FormField>
          </div>
        </div>
      </section>

      <!-- Textarea Section -->
      <section class="showcase-section">
        <h2>Textarea</h2>
        <p class="section-desc">多行文本输入框</p>

        <div class="showcase-group">
          <div class="form-demo">
            <FormField label="留言" description="最多 500 字符">
              <Textarea v-model="textareaDemo" placeholder="请输入您的留言..." />
            </FormField>
          </div>
        </div>
      </section>

      <!-- Checkbox & Switch Section -->
      <section class="showcase-section">
        <h2>Checkbox & Switch</h2>
        <p class="section-desc">复选框和开关切换组件</p>

        <div class="showcase-group">
          <h3>Checkbox</h3>
          <div class="checkbox-demo">
            <label class="checkbox-label">
              <Checkbox v-model="checkboxDemo" />
              <span>接受服务条款</span>
            </label>
            <label class="checkbox-label">
              <Checkbox v-model="checkboxDemo2" />
              <span>订阅邮件通知</span>
            </label>
            <label class="checkbox-label">
              <Checkbox :model-value="true" :indeterminate="true" />
              <span>部分选中状态</span>
            </label>
          </div>
        </div>

        <div class="showcase-group">
          <h3>Switch</h3>
          <div class="switch-demo">
            <label class="switch-label">
              <Switch v-model="switchDemo" />
              <span>启用通知</span>
            </label>
            <label class="switch-label">
              <Switch v-model="switchDemo2" size="sm" />
              <span>小尺寸</span>
            </label>
            <label class="switch-label">
              <Switch v-model="switchDemo3" size="lg" />
              <span>大尺寸</span>
            </label>
          </div>
        </div>
      </section>

      <!-- RadioGroup Section -->
      <section class="showcase-section">
        <h2>RadioGroup</h2>
        <p class="section-desc">单选框组</p>

        <div class="showcase-group">
          <RadioGroup v-model="radioDemo" :options="radioOptions" />
        </div>
      </section>

      <!-- Slider Section -->
      <section class="showcase-section">
        <h2>Slider</h2>
        <p class="section-desc">滑块组件</p>

        <div class="showcase-group">
          <div class="slider-demo">
            <FormField label="音量">
              <Slider v-model="sliderDemo" :show-value="true" />
            </FormField>
          </div>
        </div>
      </section>

      <!-- Progress Section -->
      <section class="showcase-section">
        <h2>Progress</h2>
        <p class="section-desc">进度条组件</p>

        <div class="showcase-group">
          <div class="progress-demo">
            <Progress :value="65" />
            <Progress :value="80" variant="success" />
            <Progress :value="45" variant="warning" />
            <Progress :value="25" variant="error" />
            <Progress :indeterminate="true" />
          </div>
        </div>
      </section>

      <!-- Badge Section -->
      <section class="showcase-section">
        <h2>Badge</h2>
        <p class="section-desc">徽章组件</p>

        <div class="showcase-group">
          <div class="badge-demo">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
          </div>
        </div>
      </section>

      <!-- Avatar Section -->
      <section class="showcase-section">
        <h2>Avatar</h2>
        <p class="section-desc">头像组件</p>

        <div class="showcase-group">
          <div class="avatar-demo">
            <Avatar src="https://i.pravatar.cc/150?img=1" alt="User" size="xs" />
            <Avatar src="https://i.pravatar.cc/150?img=2" alt="User" size="sm" />
            <Avatar src="https://i.pravatar.cc/150?img=3" alt="User" size="default" />
            <Avatar src="https://i.pravatar.cc/150?img=4" alt="User" size="lg" />
            <Avatar src="https://i.pravatar.cc/150?img=5" alt="User" size="xl" />
            <Avatar fallback="JD" size="lg" />
            <Avatar size="lg" />
          </div>
        </div>
      </section>

      <!-- Card Section -->
      <section class="showcase-section">
        <h2>Card</h2>
        <p class="section-desc">卡片组件</p>

        <div class="showcase-group">
          <div class="card-demo">
            <Card>
              <template #header>
                <h3>默认卡片</h3>
              </template>
              <p>这是一个使用玻璃态效果的卡片组件。</p>
              <template #footer>
                <Button variant="outline" size="sm">取消</Button>
                <Button size="sm">确认</Button>
              </template>
            </Card>

            <Card variant="outline" :interactive="true">
              <template #header>
                <h3>可交互卡片</h3>
              </template>
              <p>悬停查看效果</p>
            </Card>
          </div>
        </div>
      </section>

      <!-- Separator Section -->
      <section class="showcase-section">
        <h2>Separator</h2>
        <p class="section-desc">分隔线组件</p>

        <div class="showcase-group">
          <div class="separator-demo">
            <p>上方内容</p>
            <Separator />
            <p>下方内容</p>
          </div>
        </div>
      </section>

      <!-- Tabs Section -->
      <section class="showcase-section">
        <h2>Tabs</h2>
        <p class="section-desc">标签页组件</p>

        <div class="showcase-group">
          <Tabs v-model="activeTab" :tabs="tabsDemo">
            <div v-if="activeTab === 'account'" class="tab-content">
              <p>账户设置内容</p>
            </div>
            <div v-else-if="activeTab === 'password'" class="tab-content">
              <p>密码设置内容</p>
            </div>
            <div v-else-if="activeTab === 'notifications'" class="tab-content">
              <p>通知设置内容</p>
            </div>
          </Tabs>
        </div>
      </section>

      <!-- Tooltip Section -->
      <section class="showcase-section">
        <h2>Tooltip</h2>
        <p class="section-desc">工具提示组件</p>

        <div class="showcase-group">
          <div class="tooltip-demo">
            <Tooltip content="上方提示" side="top">
              <Button variant="outline">上</Button>
            </Tooltip>
            <Tooltip content="右侧提示" side="right">
              <Button variant="outline">右</Button>
            </Tooltip>
            <Tooltip content="下方提示" side="bottom">
              <Button variant="outline">下</Button>
            </Tooltip>
            <Tooltip content="左侧提示" side="left">
              <Button variant="outline">左</Button>
            </Tooltip>
          </div>
        </div>
      </section>

      <!-- Dialog Section -->
      <section class="showcase-section">
        <h2>Dialog & AlertDialog</h2>
        <p class="section-desc">对话框组件</p>

        <div class="showcase-group">
          <div class="dialog-demo">
            <Button @click="showDialog = true">打开对话框</Button>
            <Button variant="destructive" @click="showAlertDialog = true">打开警告对话框</Button>
          </div>

          <Dialog v-model:is-open="showDialog" title="编辑个人资料" description="修改您的个人信息">
            <div class="dialog-form">
              <FormField label="昵称">
                <Input placeholder="请输入昵称" />
              </FormField>
              <FormField label="简介">
                <Textarea placeholder="介绍一下自己..." />
              </FormField>
            </div>
            <template #footer>
              <Button variant="outline" @click="showDialog = false">取消</Button>
              <Button @click="showDialog = false">保存</Button>
            </template>
          </Dialog>

          <AlertDialog
            v-model:is-open="showAlertDialog"
            title="确认删除"
            description="此操作不可撤销，确定要删除这个项目吗？"
            variant="destructive"
            confirm-text="删除"
            cancel-text="取消"
            @confirm="showAlertDialog = false"
          />
        </div>
      </section>

      <!-- Skeleton Section -->
      <section class="showcase-section">
        <h2>Skeleton</h2>
        <p class="section-desc">骨架屏加载组件</p>

        <div class="showcase-group">
          <div class="skeleton-demo">
            <div class="skeleton-item">
              <Skeleton variant="avatar" />
              <div class="skeleton-text">
                <Skeleton variant="title" width="60%" />
                <Skeleton variant="text" width="100%" />
                <Skeleton variant="text" width="80%" />
              </div>
            </div>
            <Skeleton variant="image" />
            <Skeleton variant="card" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Mail, Download, Plus, Trash2, User, Lock, Bell } from 'lucide-vue-next'
import {
  Button,
  Input,
  Select,
  Textarea,
  Checkbox,
  Switch,
  RadioGroup,
  Slider,
  Progress,
  Badge,
  Avatar,
  Card,
  Separator,
  Tabs,
  Tooltip,
  Dialog,
  AlertDialog,
  FormField,
  Skeleton,
} from '@/components/ui'

const inputDemo = ref('')
const selectDemo = ref('')
const textareaDemo = ref('')
const checkboxDemo = ref(false)
const checkboxDemo2 = ref(true)
const switchDemo = ref(true)
const switchDemo2 = ref(false)
const switchDemo3 = ref(true)
const radioDemo = ref('option1')
const sliderDemo = ref(50)
const activeTab = ref('account')
const showDialog = ref(false)
const showAlertDialog = ref(false)

const radioOptions = [
  { value: 'option1', label: '选项一' },
  { value: 'option2', label: '选项二' },
  { value: 'option3', label: '选项三', disabled: true },
]

const tabsDemo = [
  { value: 'account', label: '账户', icon: User },
  { value: 'password', label: '密码', icon: Lock },
  { value: 'notifications', label: '通知', icon: Bell },
]
</script>

<style scoped>
.showcase {
  min-height: 100vh;
  padding: var(--spacing-8) 0;
  background: var(--color-background);
}

.showcase-header {
  text-align: center;
  margin-bottom: var(--spacing-12);
}

.showcase-header h1 {
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-3);
}

.showcase-header p {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
}

.showcase-section {
  margin-bottom: var(--spacing-12);
  padding: var(--spacing-6);
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
}

.showcase-section h2 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-2);
}

.section-desc {
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-6);
}

.showcase-group {
  margin-bottom: var(--spacing-6);
}

.showcase-group:last-child {
  margin-bottom: 0;
}

.showcase-group h3 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-3);
}

.button-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
  align-items: center;
}

.form-demo {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  max-width: 400px;
}

.checkbox-demo,
.switch-demo {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.checkbox-label,
.switch-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-foreground);
}

.slider-demo {
  max-width: 400px;
}

.progress-demo {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
  max-width: 400px;
}

.badge-demo,
.avatar-demo,
.tooltip-demo,
.dialog-demo {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-3);
  align-items: center;
}

.card-demo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--spacing-4);
}

.card-demo h3 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.card-demo p {
  margin: 0;
  color: var(--color-muted-foreground);
}

.separator-demo {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  max-width: 400px;
}

.separator-demo p {
  margin: 0;
  color: var(--color-foreground);
}

.tab-content {
  padding: var(--spacing-4);
  background: var(--glass-bg-light);
  border-radius: var(--radius);
}

.dialog-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

.skeleton-demo {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
  max-width: 400px;
}

.skeleton-item {
  display: flex;
  gap: var(--spacing-3);
}

.skeleton-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-2);
}

@media (max-width: 768px) {
  .showcase {
    padding: var(--spacing-4) 0;
  }

  .showcase-header h1 {
    font-size: var(--text-2xl);
  }

  .showcase-section {
    padding: var(--spacing-4);
  }

  .button-grid {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
