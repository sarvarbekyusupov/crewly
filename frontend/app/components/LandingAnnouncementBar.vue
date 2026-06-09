<script setup lang="ts">
const { audience, set } = useAudience()
const dismissed = useState('annc_dismissed', () => false)
</script>

<template>
  <div v-if="!dismissed" class="banner">
    <template v-if="audience === 'employer'">
      <span>Looking for a new job? Crewly matches you with the right roles.</span>
      <NuxtLink to="/candidate" @click="set('candidate')">See Crewly for candidates →</NuxtLink>
    </template>
    <template v-else>
      <span>Are you hiring? Crewly sources and screens candidates for you.</span>
      <NuxtLink to="/" @click="set('employer')">See Crewly for employers →</NuxtLink>
    </template>
    <button class="banner-x" aria-label="Dismiss" @click="dismissed = true">✕</button>
  </div>
</template>

<style scoped>
.banner {
  background: var(--ld-acc-s);
  border-bottom: 1px solid var(--ld-bd2);
  padding: 9px 48px 9px 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  color: var(--ld-t2);
  position: relative;
  font-family: 'Manrope', system-ui, sans-serif;
}

.banner a {
  color: var(--ld-acc-t);
  font-weight: 600;
  text-decoration: none;
  transition: text-decoration 0.1s;
}

.banner a:hover {
  text-decoration: underline;
}

.banner-x {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--ld-t3);
  font-size: 14px;
  padding: 4px 6px;
  border-radius: 4px;
  line-height: 1;
  cursor: pointer;
  transition: color 0.15s;
}

.banner-x:hover {
  color: var(--ld-t2);
}

@media (max-width: 768px) {
  .banner {
    display: none;
  }
}
</style>
