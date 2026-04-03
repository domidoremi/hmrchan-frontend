<script lang="ts">
import { computed, defineComponent, h } from 'vue'
import { sanitizeHtml } from '@/utils/security'

export default defineComponent({
  name: 'SafeHtml',
  inheritAttrs: false,
  props: {
    as: {
      type: String,
      default: 'div',
    },
    html: {
      type: String,
      required: true,
    },
    class: {
      type: String,
      default: '',
    },
  },
  setup(props, { attrs }) {
    const safeHtml = computed(() => sanitizeHtml(props.html))

    return () =>
      h(props.as || 'div', {
        ...attrs,
        class: props.class,
        innerHTML: safeHtml.value,
      })
  },
})
</script>
