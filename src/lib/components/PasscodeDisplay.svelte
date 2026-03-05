<script lang="ts">
  let { passcode }: { passcode: string } = $props();

  let visible = $state(false);

  function toggle() {
    visible = !visible;
  }

  async function copy() {
    await navigator.clipboard.writeText(passcode);
  }
</script>

<div class="passcode">
  <span class="passcode__label">Passcode</span>
  <div class="passcode__row">
    <span class="passcode__value" aria-label={visible ? passcode : 'Hidden passcode'}>
      {#if visible}
        <span class="passcode__digits">{passcode}</span>
      {:else}
        <span class="passcode__dots" aria-hidden="true">••••••</span>
      {/if}
    </span>
    <button class="passcode__btn" onclick={toggle} title={visible ? 'Hide passcode' : 'Show passcode'} aria-label={visible ? 'Hide passcode' : 'Show passcode'}>
      {#if visible}
        <!-- Eye-off icon -->
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
      {:else}
        <!-- Eye icon -->
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      {/if}
    </button>
    {#if visible}
      <button class="passcode__btn" onclick={copy} title="Copy passcode" aria-label="Copy passcode">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
      </button>
    {/if}
  </div>
</div>

<style lang="scss">
  @use '../../styles/variables' as *;
  @use '../../styles/mixins' as *;

  .passcode {
    display: flex;
    flex-direction: column;
    gap: $space-2;
  }

  .passcode__label {
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: $color-text-secondary;
  }

  .passcode__row {
    @include flex-start;
    gap: $space-2;
    padding: $space-3 $space-4;
    background: $color-elevated;
    border-radius: $radius-md;
    border: 1px solid $color-border;
  }

  .passcode__value {
    flex: 1;
    font-family: monospace;
    font-size: $font-size-xl;
    letter-spacing: 0.3em;
  }

  .passcode__digits {
    color: $color-green;
  }

  .passcode__dots {
    color: $color-text-muted;
  }

  .passcode__btn {
    @include btn-reset;
    color: $color-text-secondary;
    padding: $space-1;
    border-radius: $radius-sm;
    display: flex;
    align-items: center;
    transition: color $transition-base;

    &:hover {
      color: $color-text;
    }
  }
</style>
