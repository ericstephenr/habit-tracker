<script lang="ts">
  type Dir = 'up' | 'down' | 'left' | 'right';
  let { class: klass = '', dir = 'down' }: { class?: string; dir?: Dir } = $props();
  const rotate = { down: 0, up: 180, right: -90, left: 90 } as const;
</script>

<svg
  viewBox="0 0 24 24"
  class={klass}
  fill="none"
  stroke="currentColor"
  stroke-width="2.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  style="transition: transform var(--t-quick) var(--ease-out); transform: rotate({rotate[dir]}deg);"
>
  <path d="m6 9 6 6 6-6" />
</svg>
