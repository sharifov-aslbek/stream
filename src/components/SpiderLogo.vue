<script setup>
// A white line-art spider, used as the fallback "logo" for items/participants
// when no uploaded image is present — mirrors the artwork in the overlay design.
defineProps({
  size: { type: [Number, String], default: 56 },
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    stroke-width="2.4"
    stroke-linecap="round"
    aria-hidden="true"
  >
    <!-- legs -->
    <path d="M50 46 L22 30 L14 38" />
    <path d="M50 49 L18 44 L9 49" />
    <path d="M50 53 L20 58 L12 66" />
    <path d="M50 57 L26 70 L20 80" />
    <path d="M50 46 L78 30 L86 38" />
    <path d="M50 49 L82 44 L91 49" />
    <path d="M50 53 L80 58 L88 66" />
    <path d="M50 57 L74 70 L80 80" />
    <!-- body (line-art so a centered number badge stays readable) -->
    <ellipse cx="50" cy="39" rx="7" ry="6" />
    <ellipse cx="50" cy="56" rx="11" ry="14" />
    <!-- mandibles -->
    <path d="M46 33 L44 28" />
    <path d="M54 33 L56 28" />
  </svg>
</template>
