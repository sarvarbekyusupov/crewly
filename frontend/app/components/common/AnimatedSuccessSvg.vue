<template>
  <div class="flex flex-col items-center justify-center p-4 text-center">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 52 52"
      class="success-svg"
      style="width: 56px; height: 56px"
    >
      <circle class="success-circle" cx="26" cy="26" r="25" fill="none" />
      <path class="success-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
    </svg>
  </div>
</template>

<style scoped>
.success-svg {
  display: block;
}
.success-circle {
  stroke-width: 2;
  stroke: var(--positive);
  stroke-dasharray: 166;
  stroke-dashoffset: 166;
  stroke-linecap: round;
  animation: stroke-circle 0.6s cubic-bezier(0.65, 0, 0.45, 1) forwards;
}
.success-check {
  transform-origin: 50% 50%;
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  stroke-width: 3;
  stroke: var(--positive);
  stroke-linecap: round;
  animation: stroke-check 0.3s cubic-bezier(0.65, 0, 0.45, 1) 0.6s forwards;
}

@keyframes stroke-circle {
  100% {
    stroke-dashoffset: 0;
  }
}
@keyframes stroke-check {
  100% {
    stroke-dashoffset: 0;
  }
}
</style>
