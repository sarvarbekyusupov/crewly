<script setup lang="ts">
const { audience, set } = useAudience()
const dismissed = useState('annc_dismissed', () => false)
</script>

<template>
  <div v-if="!dismissed" class="annc-wrap">
    <div v-if="audience === 'employer'" class="annc">
      Looking for a new job? myHR matches you with the right roles.
      <NuxtLink to="/candidate" @click="set('candidate')">See myHR for candidates →</NuxtLink>
      <button class="x" aria-label="Dismiss" @click="dismissed = true">✕</button>
    </div>
    <div v-else class="annc">
      Hiring? Let myHR source and screen for you.
      <NuxtLink to="/" @click="set('employer')">See myHR for employers →</NuxtLink>
      <button class="x" aria-label="Dismiss" @click="dismissed = true">✕</button>
    </div>
  </div>
</template>

<style scoped>
.annc-wrap {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  z-index: 110;
  height: 39px;
  box-sizing: border-box;
}

.annc {
  height: 39px;
  box-sizing: border-box;
  background: #fde8df;
  color: #7a2d10;
  font-family: var(--l-sans);
  font-size: 14px;
  font-weight: 400;
  padding: 6px 48px 8px 16px;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
}

.annc a {
  text-decoration: underline;
  font-weight: 600;
  color: #c84a1f;
  cursor: pointer;
}

.x {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.6;
  font-size: 14px;
  padding: 4px;
  color: #7a2d10;
  line-height: 1;
}

.x:hover {
  opacity: 1;
}
</style>
