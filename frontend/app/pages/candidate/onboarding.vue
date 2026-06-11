<script setup lang="ts">
definePageMeta({ layout: 'empty', auth: 'guest' })

const store = useOnboardingStore()
const api = useCandidateApi()
const router = useRouter()
const toast = useToast()

const saving = ref(false)
const autosaved = ref(false)
let autosaveTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => ({ ...store.$state }),
  () => {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(() => {
      autosaved.value = true
      setTimeout(() => {
        autosaved.value = false
      }, 2000)
    }, 600)
  },
  { deep: true },
)

const STEP_META = [
  {
    label: 'RESUME',
    title: 'Upload your CV',
    desc: "CV yuklab, AI-ga profilingizni avtomatik to'ldirish imkonini bering.",
    why: "AI CV-ni tahlil qilib, ko'nikmalar va tajribani chiqaradi — sizga kerakli ish o'rinlarini aniqroq topadi.",
  },
  {
    label: 'LOCATION',
    title: 'Qayerda yashaysiz?',
    desc: "Joylashuvingizni kiriting — mahalliy va eng mos imkoniyatlarni birinchi ko'rsatamiz.",
    why: "Ko'pgina ish beruvchilar kandidatlarni manzil bo'yicha filtrlaydi. Bu ma'lumot mos takliflarni aniqlashda yordam beradi.",
  },
  {
    label: 'CONTACT',
    title: "Siz bilan qanday bog'lanish mumkin?",
    desc: "Ish beruvchilar qiziqsalar, to'g'ridan-to'g'ri siz bilan bog'lana olsin.",
    why: "To'g'ridan-to'g'ri murojaat sekin ariza portallari orqali emas — javob tezroq keladi.",
  },
  {
    label: 'SKILLS',
    title: "Ko'nikmalar va tajriba",
    desc: "Ko'nikmalaringizni tanlang va tajriba darajangizni belgilang.",
    why: "Ko'nikmalar moslamasi — bizning asosiy algoritmimiz. Qanchalik to'g'ri bo'lsa, shunchalik yaxshi natija.",
  },
  {
    label: 'JOB PREFS',
    title: 'Nima qidirmoqdasiz?',
    desc: 'Istagan lavozim, maosh kutishi va ish formatini belgilang.',
    why: "Faqat mezon bo'yicha mos ish o'rinlarini yuboramiz — spam yo'q, mos kelmagan takliflar yo'q.",
  },
  {
    label: 'CHECKLIST',
    title: 'Bir necha savol',
    desc: "Ish beruvchilar ko'pincha bu savollarni oldindan so'raydi.",
    why: 'Bularni oldindan hal qilish ariza jarayonini tezlashtiradi.',
  },
  {
    label: 'SETTINGS',
    title: 'Ariza sozlamalari',
    desc: 'AI arizalaringizni qanday boshqarishini tanlang.',
    why: "Bu sozlamalar avtomatlashtirishni qanchalik xohlashingizni nazorat qiladi. Istalgan vaqt o'zgartirish mumkin.",
  },
]

const meta = computed(() => STEP_META[store.currentStep - 1] ?? STEP_META[0]!)
const progress = computed(() => ((store.currentStep - 1) / 7) * 100)

const canContinue = computed(() => {
  if (store.isUploadingCv) return false
  switch (store.currentStep) {
    case 2:
      return !!store.location.city && !!store.location.region
    case 4:
      return store.skills.tags.length > 0 && !!store.skills.experienceLevel
    case 5:
      return !!store.jobPreferences.desiredRole
    default:
      return true
  }
})

function deriveWorkMode() {
  const f = store.jobPreferences.formats
  if (f.remote) return 'remote'
  if (f.hybrid) return 'hybrid'
  if (f.onsite) return 'office'
  if (f.abroad) return 'remote'
  return undefined
}

function yearsFromLevel(lvl: string) {
  const map: Record<string, number> = {
    Intern: 0,
    Junior: 1,
    Middle: 3,
    Senior: 5,
    Lead: 7,
    'C-Level': 10,
  }
  return map[lvl] ?? undefined
}

async function handleFinish() {
  saving.value = true
  try {
    const workMode = deriveWorkMode()
    const linkedin = store.contact.linkedin
      ? store.contact.linkedin.startsWith('http')
        ? store.contact.linkedin
        : `https://linkedin.com/in/${store.contact.linkedin}`
      : undefined

    await api.patch('/api/v1/candidate-portal/profile', {
      fullName: store.contact.fullName || undefined,
      phone: store.contact.phone || undefined,
      city: store.location.city || undefined,
      country: store.location.country !== "O'zbekiston" ? store.location.country : undefined,
      linkedinUrl: linkedin,
      telegramUsername: store.contact.telegram || undefined,
      preferredWorkMode: workMode,
      willingToRelocate: store.checklist.willingToRelocate,
      skills: store.skills.tags.length ? store.skills.tags : undefined,
      yearsExperience: store.skills.experienceLevel
        ? yearsFromLevel(store.skills.experienceLevel)
        : undefined,
      currentPosition: store.jobPreferences.desiredRole || undefined,
      noticePeriodDays: store.checklist.noticePeriodDays ?? undefined,
    })

    const salaryMax = store.jobPreferences.salaryMax
    const salaryUzs = salaryMax
      ? store.jobPreferences.currency === 'USD'
        ? salaryMax * 12700
        : salaryMax
      : undefined

    await api.patch('/api/v1/candidate-portal/preferences', {
      preferredWorkMode: workMode,
      expectedSalaryUzs: salaryUzs,
    })

    const { triggerConfetti } = useConfetti()
    triggerConfetti()
    toast.add({ title: 'Profil sozlash tugadi!', color: 'success' })
    router.push('/candidate/dashboard')
  } catch (e) {
    toast.add({
      title: 'Saqlashda xatolik',
      description: extractApiErrorMessage(e),
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}

async function handleContinue() {
  if (!canContinue.value) return
  if (store.currentStep === 7) {
    await handleFinish()
  } else {
    store.nextStep()
  }
}

function handleKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName
  if (e.key === 'Enter' && !e.shiftKey && tag !== 'TEXTAREA' && tag !== 'BUTTON') {
    e.preventDefault()
    handleContinue()
  }
  if (e.key === 'Tab' && e.shiftKey) {
    if (store.currentStep > 1) {
      e.preventDefault()
      store.prevStep()
    }
  }
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onUnmounted(() => document.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <div class="ob-root">
    <!-- Progress bar -->
    <div class="ob-prog-track">
      <div class="ob-prog-fill" :style="{ width: progress + '%' }" />
    </div>

    <!-- Content area -->
    <div class="ob-body">
      <!-- Left panel -->
      <aside class="ob-left">
        <NuxtLink to="/" class="ob-logo">
          <img
            src="/crewly-logo-horizontal.svg"
            alt="Crewly"
            class="block dark:hidden"
            height="22"
          />
          <img
            src="/crewly-logo-horizontal-white.svg"
            alt="Crewly"
            class="hidden dark:block"
            height="22"
          />
        </NuxtLink>

        <div class="ob-step-info">
          <div class="ob-step-label-row">
            <span class="ob-step-label">{{ meta.label }}</span>
            <span
              class="ob-step-dot"
              :class="store.completed.includes(store.currentStep) ? 'dot-done' : 'dot-active'"
            />
          </div>
          <p class="ob-step-desc">{{ meta.desc }}</p>
        </div>

        <div class="ob-why">
          <p class="ob-why-title">Nega so'raymiz</p>
          <p class="ob-why-text">{{ meta.why }}</p>
        </div>

        <!-- Step dots nav -->
        <div class="ob-dots-nav">
          <button
            v-for="n in 7"
            :key="n"
            type="button"
            class="step-dot-btn"
            :class="{
              'dot-btn-active': store.currentStep === n,
              'dot-btn-done': store.completed.includes(n),
            }"
            :title="`Step ${n}`"
            @click="
              store.completed.includes(n) || n === store.currentStep ? store.setStep(n) : null
            "
          />
        </div>
      </aside>

      <!-- Right panel -->
      <main class="ob-right">
        <!-- Right header -->
        <div class="ob-right-header">
          <div class="ob-step-badge">Step {{ store.currentStep }} of 7</div>
          <button
            v-if="store.currentStep > 1"
            type="button"
            class="ob-back-btn"
            @click="store.prevStep()"
          >
            ← Back
          </button>
        </div>

        <!-- Step title -->
        <h2 class="ob-step-title">{{ meta.title }}</h2>

        <!-- Autosave indicator -->
        <Transition name="fade">
          <span v-if="autosaved" class="autosave-badge">• Autosaved</span>
        </Transition>

        <!-- Step content -->
        <div class="ob-step-content">
          <Transition name="step" mode="out-in">
            <div :key="store.currentStep" class="ob-step-inner">
              <OnboardingStepResume v-if="store.currentStep === 1" />
              <OnboardingStepLocation v-else-if="store.currentStep === 2" />
              <OnboardingStepContact v-else-if="store.currentStep === 3" />
              <OnboardingStepSkills v-else-if="store.currentStep === 4" />
              <OnboardingStepJobPrefs v-else-if="store.currentStep === 5" />
              <OnboardingStepChecklist v-else-if="store.currentStep === 6" />
              <OnboardingStepSettings v-else-if="store.currentStep === 7" />
            </div>
          </Transition>
        </div>

        <!-- Bottom bar -->
        <div class="ob-bottom">
          <div class="ob-kbd-hints">
            <span class="kbd-hint"><kbd>Enter</kbd> Continue</span>
            <span class="kbd-hint"><kbd>⇧ Tab</kbd> Back</span>
          </div>
          <button
            type="button"
            class="ob-continue-btn"
            :disabled="!canContinue || saving"
            @click="handleContinue"
          >
            <span v-if="saving" class="btn-spinner" />
            <span v-else>{{ store.currentStep === 7 ? 'Finish Setup →' : 'Continue →' }}</span>
          </button>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.ob-root {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--ink);
}

/* Progress bar */
.ob-prog-track {
  height: 3px;
  background: var(--line);
  flex-shrink: 0;
}
.ob-prog-fill {
  height: 100%;
  background: var(--ink);
  transition: width 0.4s ease;
}

/* Body layout */
.ob-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

/* Left panel */
.ob-left {
  width: 280px;
  flex-shrink: 0;
  padding: 32px 28px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  border-right: 1px solid var(--line);
  background: var(--bg-deep);
  overflow-y: auto;
}

.ob-logo {
  display: flex;
  align-items: center;
}
.ob-logo img {
  height: 22px;
  width: auto;
}

.ob-step-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.ob-step-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ob-step-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--ink-subtle);
}
.ob-step-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-active {
  background: var(--accent);
}
.dot-done {
  background: var(--positive);
}

.ob-step-desc {
  font-size: 13px;
  color: var(--ink-muted);
  line-height: 1.55;
}

.ob-why {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ob-why-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-subtle);
}
.ob-why-text {
  font-size: 12.5px;
  color: var(--ink-muted);
  line-height: 1.6;
}

.ob-dots-nav {
  margin-top: auto;
  display: flex;
  gap: 6px;
}
.step-dot-btn {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  border: none;
  background: var(--line);
  cursor: pointer;
  padding: 0;
  transition: all 0.15s;
}
.dot-btn-active {
  background: var(--ink);
  transform: scale(1.3);
}
.dot-btn-done {
  background: var(--positive);
  cursor: pointer;
}

/* Right panel */
.ob-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-y: auto;
}

.ob-right-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 40px 0;
  flex-shrink: 0;
}

.ob-step-badge {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-subtle);
  letter-spacing: 0.02em;
}

.ob-back-btn {
  font-size: 13px;
  color: var(--ink-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.12s;
}
.ob-back-btn:hover {
  color: var(--ink);
  background: var(--bg-elevated);
}

.ob-step-title {
  padding: 16px 40px 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--ink-strong);
  letter-spacing: -0.02em;
  flex-shrink: 0;
}

.autosave-badge {
  display: block;
  padding: 0 40px;
  font-size: 11px;
  color: var(--positive);
  font-weight: 500;
  margin-top: 4px;
  flex-shrink: 0;
}

.ob-step-content {
  flex: 1;
  padding: 20px 40px;
  overflow-y: auto;
}

.ob-step-inner {
  width: 100%;
  max-width: 520px;
}

/* Bottom bar */
.ob-bottom {
  padding: 16px 40px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-top: 1px solid var(--line-soft);
  flex-shrink: 0;
}

.ob-kbd-hints {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}
.kbd-hint {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--ink-subtle);
}
kbd {
  display: inline-block;
  padding: 2px 5px;
  font-size: 10px;
  font-family: inherit;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--bg-elevated);
  color: var(--ink-subtle);
}

.ob-continue-btn {
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  background: var(--ink);
  color: var(--bg);
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 140px;
  justify-content: center;
}
.ob-continue-btn:hover:not(:disabled) {
  background: var(--ink-strong);
  transform: translateY(-1px);
}
.ob-continue-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Step transitions */
.step-enter-active,
.step-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.step-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
.step-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile */
@media (max-width: 768px) {
  .ob-left {
    display: none;
  }
  .ob-right-header {
    padding: 16px 20px 0;
  }
  .ob-step-title {
    padding: 12px 20px 0;
    font-size: 18px;
  }
  .ob-step-content {
    padding: 16px 20px;
  }
  .ob-bottom {
    padding: 12px 20px 20px;
  }
  .ob-kbd-hints {
    display: none;
  }
  .autosave-badge {
    padding: 0 20px;
  }
}

@media (max-width: 480px) {
  .ob-continue-btn {
    min-width: 120px;
  }
}
</style>
