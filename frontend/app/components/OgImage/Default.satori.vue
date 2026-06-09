<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()
</script>

<template>
  <div
    style="
      width: 100%;
      height: 100%;
      background: #1a1815;
      display: flex;
      flex-direction: column;
      padding: 64px 72px;
      font-family: 'Inter', sans-serif;
      position: relative;
    "
  >
    <!-- Top: wordmark -->
    <div
      style="
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: #6b6760;
        margin-bottom: auto;
      "
    >
      CREWLY
    </div>

    <!-- Center: title -->
    <div style="margin-bottom: 28px">
      <div
        style="
          font-size: 56px;
          font-weight: 700;
          line-height: 1.12;
          color: #f5f1ea;
          max-width: 880px;
          letter-spacing: -0.02em;
        "
      >
        {{ title }}
      </div>
    </div>

    <!-- Description -->
    <div
      v-if="description"
      style="
        font-size: 22px;
        color: #8a8278;
        max-width: 760px;
        line-height: 1.5;
        margin-bottom: 56px;
      "
    >
      {{ description }}
    </div>

    <!-- Bottom row -->
    <div style="display: flex; align-items: center; gap: 16px">
      <div style="width: 36px; height: 3px; background: #c84a1f; border-radius: 2px" />
      <div style="font-size: 15px; color: #6b6760; letter-spacing: 0.04em; font-weight: 400">
        crewly.uz
      </div>
    </div>
  </div>
</template>
