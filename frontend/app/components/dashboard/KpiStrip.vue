<script setup lang="ts">
defineProps<{
  kpis: Array<{
    label: string
    value: number
    delta: string
    positive?: boolean
    href: string
  }>
}>()
</script>

<template>
  <div class="kpis">
    <DashboardKpiCard
      v-for="kpi in kpis"
      :key="kpi.label"
      :label="kpi.label"
      :value="kpi.value"
      :delta="kpi.delta"
      :positive="kpi.positive"
      :href="kpi.href"
    />
  </div>
</template>

<style scoped>
.kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}
@media (max-width: 900px) {
  .kpis {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 500px) {
  .kpis {
    grid-template-columns: 1fr;
  }
}
</style>
