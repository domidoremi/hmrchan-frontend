<template><JournalRouteState :error="moduleError" /></template>

<script setup lang="ts">
import JournalRouteState from './JournalRouteState.vue'

// Page props must not override the module failure state.
defineOptions({ inheritAttrs: false })
const moduleError = new Error('Page module unavailable')
</script>
