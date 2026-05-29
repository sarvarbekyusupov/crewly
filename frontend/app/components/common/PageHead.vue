<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  subtitle?: string
  accentWord?: string
}>()
</script>

<template>
  <div class="mb-7 pb-6" style="border-bottom: 1px solid var(--line)">
    <p
      v-if="eyebrow"
      class="mb-3"
      style="
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--ink-subtle);
      "
    >
      {{ eyebrow }}
    </p>
    <h1
      class="font-normal sm:text-4xl"
      style="
        font-family: 'Fraunces', serif;
        font-size: 28px;
        line-height: 1.05;
        letter-spacing: -0.035em;
        color: var(--ink);
      "
    >
      <slot name="title">
        <template v-if="accentWord">
          {{ title.replace(accentWord, '')
          }}<em style="font-style: italic; color: var(--accent)">{{ accentWord }}</em>
        </template>
        <template v-else>{{ title }}</template>
      </slot>
    </h1>
    <p v-if="subtitle" class="mt-2 text-sm" style="color: var(--ink-muted); max-width: 540px">
      {{ subtitle }}
    </p>
    <slot />
  </div>
</template>
