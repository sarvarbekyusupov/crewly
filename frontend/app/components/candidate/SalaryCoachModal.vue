<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const expectedSalaryUzs = ref(120_000_000) // 120,000,000 UZS/Year default

const marketRange = {
  min: 80_000_000,
  mid: 140_000_000,
  max: 220_000_000,
}

const comparison = computed(() => {
  const val = expectedSalaryUzs.value
  if (val < marketRange.min) return { status: 'Under market rate', color: 'text-amber-500', feedback: 'Your expectation is below standard ranges. Consider bumping it up!' }
  if (val <= marketRange.mid) return { status: 'Competitive market alignment', color: 'text-positive', feedback: 'Your expectation aligns perfectly with current Tashkent market averages.' }
  if (val <= marketRange.max) return { status: 'High-tier candidate range', color: 'text-accent', feedback: 'An excellent premium range. Highlight your complex project history!' }
  return { status: 'Above market threshold', color: 'text-red-500', feedback: 'This is a premium executive salary. Highlight clear business ROI / leadership achievements.' }
})

const talkingPoints = [
  'Highlight your TypeScript & Nuxt 3 full-stack autonomy: "I build responsive, type-safe SPAs from scratch, saving 40% in frontend overhead."',
  'Leverage Matchmaker alignment: "Our semantic mapping ranks my skills as a 92% strong fit for your performance criteria."',
  'Discuss local cost efficiency: "My expected rate reflects direct regional market expertise with zero onboarding overhead."'
]
</script>

<template>
  <UModal
    :model-value="open"
    title="AI Salary Coach & Negotiator"
    class="w-full max-w-lg"
    @update:model-value="emit('update:open', $event)"
  >
    <template #content>
      <div class="p-6 space-y-6">
        <!-- Header -->
        <div class="text-center">
          <div class="inline-flex w-10 h-10 rounded-full bg-accent-soft text-accent items-center justify-center mb-3">
            <UIcon name="i-heroicons-banknotes" class="w-5 h-5" />
          </div>
          <h3 class="text-lg font-serif font-semibold text-ink">AI Salary Coach & Negotiator</h3>
          <p class="text-xs text-ink-subtle mt-0.5">Evaluate and align your expected salary with real-time market data.</p>
        </div>

        <!-- Slider calculator -->
        <div class="space-y-3.5 bg-bg-deep border border-line-soft rounded-xl p-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-mono font-bold text-ink-muted uppercase tracking-wider">Your Expected Salary</span>
            <span class="text-sm font-semibold text-accent font-mono">
              {{ (expectedSalaryUzs / 1_000_000).toFixed(0) }}M UZS / Yr
            </span>
          </div>
          
          <input
            v-model.number="expectedSalaryUzs"
            type="range"
            :min="60_000_000"
            :max="300_000_000"
            :step="10_000_000"
            class="w-full accent-accent cursor-pointer"
          />

          <div class="flex items-center justify-between text-[10px] text-ink-subtle font-mono">
            <span>60M (Junior)</span>
            <span>180M (Senior)</span>
            <span>300M (Lead)</span>
          </div>
        </div>

        <!-- Market comparison report -->
        <div class="bg-surface border border-line-soft rounded-xl p-4 space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs text-ink-muted font-medium">Market Evaluation:</span>
            <span class="text-xs font-bold font-mono" :class="comparison.color">
              {{ comparison.status }}
            </span>
          </div>
          <p class="text-xs leading-relaxed text-ink-muted">
            {{ comparison.feedback }}
          </p>
          <div class="w-full h-1.5 rounded-full bg-bg-deep overflow-hidden flex relative">
            <div class="h-full bg-amber-400 w-1/4" title="Below Market" />
            <div class="h-full bg-positive w-1/2" title="Average Market" />
            <div class="h-full bg-accent w-1/4" title="Top Tier" />
            <div
              class="absolute top-0 w-2.5 h-2.5 -mt-0.5 rounded-full bg-ink border border-white transition-all duration-300"
              :style="{ left: `${((expectedSalaryUzs - 60_000_000) / 240_000_000) * 100}%` }"
            />
          </div>
        </div>

        <!-- AI Talking Points -->
        <div class="space-y-3">
          <h4 class="text-xs font-mono font-bold text-accent uppercase tracking-wider">Your 3-Tap Negotiation Script</h4>
          <div class="space-y-2.5">
            <div
              v-for="(point, idx) in talkingPoints"
              :key="idx"
              class="flex items-start gap-2.5 text-xs bg-bg-deep border border-line-soft p-3 rounded-xl"
            >
              <span class="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center font-mono font-bold shrink-0 text-[10px]">
                {{ idx + 1 }}
              </span>
              <p class="text-ink-muted leading-relaxed">{{ point }}</p>
            </div>
          </div>
        </div>

        <!-- Close -->
        <div class="flex justify-end pt-2 border-t border-line-soft">
          <UButton size="sm" @click="emit('update:open', false)">Done Coach</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
