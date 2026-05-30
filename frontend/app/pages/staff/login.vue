<script setup lang="ts">
definePageMeta({ layout: 'empty', auth: false })

const staffStore = useStaffStore()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()

const form = reactive({ email: '', password: '' })
const loading = ref(false)

async function handleLogin() {
  if (loading.value) return
  loading.value = true
  try {
    await staffStore.login(form.email, form.password)
    router.push('/staff/dashboard')
  } catch (e) {
    toast.add({
      title: t('common.error'),
      description: extractApiErrorMessage(e, 'Invalid credentials'),
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (staffStore.isAuthenticated) router.push('/staff/dashboard')
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4" style="background: var(--bg-deep)">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <p
          style="
            font-family: 'JetBrains Mono', monospace;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: var(--ink-subtle);
            margin-bottom: 8px;
          "
        >
          Staff Portal
        </p>
        <h1
          style="
            font-family: 'Fraunces', serif;
            font-size: 36px;
            letter-spacing: -0.04em;
            color: var(--ink);
            font-weight: 400;
          "
        >
          my<em style="font-style: italic; color: var(--accent)">hr</em>
        </h1>
      </div>

      <UCard>
        <form class="space-y-4" @submit.prevent="handleLogin">
          <UFormField label="Email">
            <UInput
              v-model="form.email"
              type="email"
              required
              autocomplete="email"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Password">
            <UInput
              v-model="form.password"
              type="password"
              required
              autocomplete="current-password"
              class="w-full"
            />
          </UFormField>
          <UButton type="submit" block :loading="loading" :disabled="loading" class="mt-2">
            Login
          </UButton>
        </form>
      </UCard>

      <p class="text-center mt-4">
        <NuxtLink
          to="/employer/login"
          class="text-sm hover:underline"
          style="color: var(--ink-muted)"
          >← Client portal</NuxtLink
        >
      </p>
    </div>
  </div>
</template>
