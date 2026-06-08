<script setup lang="ts">
import * as Sentry from '@sentry/nuxt'

const props = defineProps<{ error: { statusCode: number; message: string } }>()

const isNotFound = computed(() => props.error.statusCode === 404)

function goHome() {
  clearError({ redirect: '/' })
}

function goTo(path: string) {
  clearError({ redirect: path })
}

onMounted(() => {
  if (!isNotFound.value) {
    Sentry.captureException(new Error(props.error.message || `HTTP ${props.error.statusCode}`))
  }
})
</script>

<template>
  <div class="grid-hero min-h-screen flex flex-col" style="background: var(--bg)">
    <nav
      style="
        border-bottom: 1px solid var(--line);
        padding: 14px 24px;
        display: flex;
        align-items: center;
        gap: 24px;
        background: var(--bg);
      "
    >
      <span
        style="
          font-family: 'Fraunces', serif;
          font-size: 18px;
          font-weight: 400;
          color: var(--ink);
          cursor: pointer;
        "
        @click="goHome"
      >
        Crewly
      </span>
      <button
        style="
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--ink-muted);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        "
        @click="goTo('/candidate/dashboard')"
      >
        Dashboard
      </button>
      <button
        style="
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--ink-muted);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        "
        @click="goTo('/candidate/jobs')"
      >
        Job Discovery
      </button>
    </nav>
    <div class="flex-1 flex items-center justify-center p-6">
      <div class="text-center max-w-sm">
        <p
          style="
            font-family: 'Fraunces', serif;
            font-size: 96px;
            line-height: 1;
            letter-spacing: -0.06em;
            color: var(--ink);
            font-weight: 400;
            opacity: 0.12;
          "
        >
          {{ error.statusCode }}
        </p>
        <div style="margin-top: -32px">
          <p
            style="
              font-family: 'JetBrains Mono', monospace;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              color: var(--ink-subtle);
              margin-bottom: 10px;
            "
          >
            {{ isNotFound ? 'Error 404' : `Error ${error.statusCode}` }}
          </p>
          <h1
            style="
              font-family: 'Fraunces', serif;
              font-size: 32px;
              line-height: 1.1;
              letter-spacing: -0.035em;
              color: var(--ink);
              font-weight: 400;
              margin-bottom: 10px;
            "
          >
            {{ isNotFound ? 'Page not found' : 'Something went wrong' }}
          </h1>
          <p style="font-size: 14px; color: var(--ink-muted); margin-bottom: 24px">
            {{
              isNotFound ? "The page you're looking for doesn't exist or was moved." : error.message
            }}
          </p>
          <UButton icon="i-heroicons-home" @click="goHome">Go to Dashboard</UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.grid-hero {
  position: relative;
}
.grid-hero::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(var(--line-soft) 1px, transparent 1px),
    linear-gradient(90deg, var(--line-soft) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
  z-index: 0;
}
.grid-hero::after {
  content: '';
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse 60% 60% at 50% 40%, transparent 0%, var(--bg) 80%);
  pointer-events: none;
  z-index: 0;
}
.grid-hero > * {
  position: relative;
  z-index: 1;
}
</style>
