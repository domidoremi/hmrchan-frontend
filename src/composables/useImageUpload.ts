/**
 * 图片上传 Composable
 * 支持图片压缩、裁剪、预览
 */
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables'
import { logger } from '@/utils/logger'
import { toLogContext } from '@/utils/typeGuards'

interface ImageUploadOptions {
  maxSize?: number // MB
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0-1
  accept?: string
}

const DEFAULT_OPTIONS: Required<ImageUploadOptions> = {
  maxSize: 5, // 5MB
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
  accept: 'image/jpeg,image/png,image/webp',
}

export function useImageUpload(options: ImageUploadOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const { t } = useI18n()
  const toast = useToast()

  const uploading = ref(false)
  const preview = ref<string | null>(null)
  const error = ref<string | null>(null)

  /**
   * 验证文件
   */
  function validateFile(file: File): boolean {
    error.value = null

    // 检查文件类型
    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      error.value = t('upload.onlyImages')
      toast.error(error.value)
      return false
    }

    // 检查文件大小
    const sizeMB = file.size / 1024 / 1024
    if (sizeMB > config.maxSize) {
      error.value = t('upload.tooLarge')
      toast.error(error.value)
      return false
    }

    return true
  }

  /**
   * 压缩图片
   */
  async function compressImage(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        const img = new Image()

        img.onload = () => {
          // 计算新尺寸
          let width = img.width
          let height = img.height

          if (width > config.maxWidth || height > config.maxHeight) {
            const ratio = Math.min(config.maxWidth / width, config.maxHeight / height)
            width = Math.floor(width * ratio)
            height = Math.floor(height * ratio)
          }

          // 创建canvas
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          // 绘制图片
          ctx.drawImage(img, 0, 0, width, height)

          // 转换为Blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob)
              } else {
                reject(new Error('Failed to compress image'))
              }
            },
            file.type,
            config.quality,
          )
        }

        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = e.target?.result as string
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  /**
   * 创建预览
   */
  function createPreview(file: File | Blob) {
    // 清除旧预览
    if (preview.value) {
      URL.revokeObjectURL(preview.value)
    }

    preview.value = URL.createObjectURL(file)
  }

  /**
   * 选择文件
   */
  async function selectImage(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = config.accept

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) {
          resolve(null)
          return
        }

        if (!validateFile(file)) {
          resolve(null)
          return
        }

        try {
          uploading.value = true

          // 压缩图片
          const compressed = await compressImage(file)

          // 创建新的File对象
          const compressedFile = new File([compressed], file.name, {
            type: file.type,
            lastModified: Date.now(),
          })

          // 创建预览
          createPreview(compressedFile)

          // 显示压缩信息
          const originalSizeMB = (file.size / 1024 / 1024).toFixed(2)
          const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2)
          logger.info(`Image compressed: ${originalSizeMB}MB → ${compressedSizeMB}MB`)

          resolve(compressedFile)
        } catch (err) {
          logger.error('Image compression failed', toLogContext(err))
          error.value = t('upload.processingFailed')
          toast.error(error.value)
          resolve(null)
        } finally {
          uploading.value = false
        }
      }

      input.click()
    })
  }

  /**
   * 上传图片到服务器
   */
  async function uploadImage(file: File, uploadUrl: string): Promise<string> {
    uploading.value = true
    error.value = null

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const data = await response.json()
      toast.success('上传成功')

      return data.url || data.file_url || data.path
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : '上传失败'
      error.value = errorMsg
      toast.error(errorMsg)
      logger.error('Image upload failed', toLogContext(err))
      throw err
    } finally {
      uploading.value = false
    }
  }

  /**
   * 清除预览
   */
  function clearPreview() {
    const previewUrl = preview.value
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      preview.value = null
    }
  }

  return {
    uploading,
    preview,
    error,
    selectImage,
    uploadImage,
    clearPreview,
  }
}
