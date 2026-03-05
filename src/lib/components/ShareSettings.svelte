<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ShareSettings } from '$lib/types';

  let { settings, saved }: { settings: ShareSettings; saved?: boolean } = $props();

  // Local state for form editing
  let rateLimitSongs = $state(settings.rateLimitSongs);
  let rateLimitMinutes = $state(settings.rateLimitMinutes);
  let allowExplicit = $state(settings.allowExplicit);
  let yearFrom = $state<number | string>(settings.yearFrom ?? '');
  let yearTo = $state<number | string>(settings.yearTo ?? '');

  let rateLimitEnabled = $state(settings.rateLimitSongs > 0);

  // Sync local state when settings prop updates (e.g. after save)
  $effect(() => {
    rateLimitSongs = settings.rateLimitSongs;
    rateLimitMinutes = settings.rateLimitMinutes;
    allowExplicit = settings.allowExplicit;
    yearFrom = settings.yearFrom ?? '';
    yearTo = settings.yearTo ?? '';
    rateLimitEnabled = settings.rateLimitSongs > 0;
  });

  $effect(() => {
    if (!rateLimitEnabled) rateLimitSongs = 0;
    else if (rateLimitSongs === 0) rateLimitSongs = 1;
  });
</script>

<form method="POST" action="?/updateSettings" use:enhance class="settings-form">
  <!-- Rate limit -->
  <fieldset class="settings-form__group">
    <legend class="settings-form__legend">Rate Limiting</legend>

    <label class="settings-form__toggle">
      <input
        type="checkbox"
        class="settings-form__checkbox"
        bind:checked={rateLimitEnabled}
      />
      <span>Limit songs per visitor</span>
    </label>

    {#if rateLimitEnabled}
      <div class="settings-form__row">
        <div class="settings-form__field">
          <label class="settings-form__label" for="rateLimitSongs">Max songs</label>
          <input
            id="rateLimitSongs"
            name="rateLimitSongs"
            type="number"
            min="1"
            max="50"
            class="input settings-form__number"
            bind:value={rateLimitSongs}
          />
        </div>
        <span class="settings-form__sep">per</span>
        <div class="settings-form__field">
          <label class="settings-form__label" for="rateLimitMinutes">Minutes</label>
          <input
            id="rateLimitMinutes"
            name="rateLimitMinutes"
            type="number"
            min="1"
            max="1440"
            class="input settings-form__number"
            bind:value={rateLimitMinutes}
          />
        </div>
        <span class="settings-form__sep">min</span>
      </div>
    {:else}
      <input type="hidden" name="rateLimitSongs" value="0" />
      <input type="hidden" name="rateLimitMinutes" value={rateLimitMinutes} />
    {/if}
  </fieldset>

  <!-- Content filters -->
  <fieldset class="settings-form__group">
    <legend class="settings-form__legend">Content Filters</legend>

    <label class="settings-form__toggle">
      <input
        type="checkbox"
        class="settings-form__checkbox"
        name="allowExplicit"
        value="true"
        bind:checked={allowExplicit}
      />
      <span>Allow explicit tracks</span>
    </label>
    <!-- Hidden field to handle unchecked state -->
    {#if !allowExplicit}
      <input type="hidden" name="allowExplicit" value="false" />
    {/if}

    <div class="settings-form__row">
      <div class="settings-form__field">
        <label class="settings-form__label" for="yearFrom">Year from</label>
        <input
          id="yearFrom"
          name="yearFrom"
          type="number"
          min="1900"
          max={new Date().getFullYear()}
          placeholder="Any"
          class="input settings-form__number"
          bind:value={yearFrom}
        />
      </div>
      <span class="settings-form__sep">–</span>
      <div class="settings-form__field">
        <label class="settings-form__label" for="yearTo">Year to</label>
        <input
          id="yearTo"
          name="yearTo"
          type="number"
          min="1900"
          max={new Date().getFullYear()}
          placeholder="Any"
          class="input settings-form__number"
          bind:value={yearTo}
        />
      </div>
    </div>
  </fieldset>

  <div class="settings-form__actions">
    <button class="btn btn--primary" type="submit">Save settings</button>
    {#if saved}
      <span class="settings-form__saved">Saved!</span>
    {/if}
  </div>
</form>

<style lang="scss">
  @use '../../styles/variables' as *;
  @use '../../styles/mixins' as *;

  .settings-form {
    display: flex;
    flex-direction: column;
    gap: $space-6;
  }

  .settings-form__group {
    border: none;
    display: flex;
    flex-direction: column;
    gap: $space-4;
  }

  .settings-form__legend {
    font-size: $font-size-sm;
    font-weight: $font-weight-semibold;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: $color-text-secondary;
    margin-bottom: $space-2;
  }

  .settings-form__toggle {
    @include flex-start;
    gap: $space-3;
    cursor: pointer;
    font-size: $font-size-base;
  }

  .settings-form__checkbox {
    width: 18px;
    height: 18px;
    accent-color: $color-green;
    cursor: pointer;
  }

  .settings-form__row {
    @include flex-start;
    gap: $space-3;
    flex-wrap: wrap;
  }

  .settings-form__field {
    display: flex;
    flex-direction: column;
    gap: $space-1;
  }

  .settings-form__label {
    font-size: $font-size-xs;
    color: $color-text-secondary;
  }

  .settings-form__number {
    width: 90px;
  }

  .settings-form__sep {
    color: $color-text-muted;
    align-self: flex-end;
    padding-bottom: $space-3;
  }

  .settings-form__actions {
    @include flex-start;
    gap: $space-4;
  }

  .settings-form__saved {
    color: $color-green;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
  }
</style>
