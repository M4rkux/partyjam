<script lang="ts">
  import type { SpotifyTrack } from '$lib/types';

  let {
    username,
    onAdd
  }: {
    username: string;
    onAdd?: (track: SpotifyTrack) => Promise<void>;
  } = $props();

  let query = $state('');
  let results = $state<SpotifyTrack[]>([]);
  let loading = $state(false);
  let adding = $state<string | null>(null); // track URI being added
  let error = $state('');
  let successId = $state<string | null>(null);

  let debounceTimer: ReturnType<typeof setTimeout>;

  function onInput() {
    clearTimeout(debounceTimer);
    error = '';
    if (!query.trim() || query.trim().length < 2) {
      results = [];
      return;
    }
    debounceTimer = setTimeout(search, 400);
  }

  async function search() {
    loading = true;
    try {
      const res = await fetch(
        `/api/${encodeURIComponent(username)}/search?q=${encodeURIComponent(query.trim())}`
      );
      if (!res.ok) throw new Error(await res.text());
      results = await res.json();
    } catch (e) {
      error = 'Search failed. Try again.';
      results = [];
    } finally {
      loading = false;
    }
  }

  async function addTrack(track: SpotifyTrack) {
    if (adding) return;
    adding = track.uri;
    error = '';
    try {
      await onAdd?.(track);
      successId = track.id;
      query = '';
      results = [];
      setTimeout(() => (successId = null), 2500);
    } catch (e: unknown) {
      error = e instanceof Error ? e.message : 'Failed to add track.';
    } finally {
      adding = null;
    }
  }

  function formatDuration(ms: number) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }
</script>

<div class="search">
  <div class="search__input-wrap">
    <svg class="search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <input
      type="search"
      class="input search__input"
      placeholder="Search for a song to add..."
      bind:value={query}
      oninput={onInput}
      autocomplete="off"
    />
    {#if loading}
      <span class="search__spinner" aria-label="Searching"></span>
    {/if}
  </div>

  {#if error}
    <p class="error-msg search__error">{JSON.parse(error).message}</p>
  {/if}

  {#if successId}
    <p class="search__success">Song added to queue!</p>
  {/if}

  {#if results.length > 0}
    <ul class="search__results">
      {#each results as track (track.id)}
        <li class="search__result">
          {#if track.imageUrl}
            <img src={track.imageUrl} alt={track.album} class="search__art" />
          {:else}
            <div class="search__art search__art--placeholder"></div>
          {/if}
          <div class="search__info">
            <p class="search__name">{track.name}</p>
            <p class="search__meta">
              {track.artist}
              {#if track.releaseYear} · {track.releaseYear}{/if}
              {#if track.explicit}
                <span class="search__explicit">E</span>
              {/if}
            </p>
          </div>
          <span class="search__duration">{formatDuration(track.durationMs)}</span>
          <button
            class="btn btn--primary btn--sm search__add"
            onclick={() => addTrack(track)}
            disabled={adding === track.uri}
            aria-label="Add {track.name} to queue"
          >
            {adding === track.uri ? '...' : 'Add'}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style lang="scss">
  @use '../../styles/variables' as *;
  @use '../../styles/mixins' as *;

  .search {
    display: flex;
    flex-direction: column;
    gap: $space-3;
  }

  .search__input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search__icon {
    position: absolute;
    left: $space-3;
    color: $color-text-muted;
    pointer-events: none;
  }

  .search__input {
    padding-left: $space-10;
    padding-right: $space-8;
  }

  .search__spinner {
    position: absolute;
    right: $space-3;
    width: 16px;
    height: 16px;
    border: 2px solid $color-border;
    border-top-color: $color-green;
    border-radius: $radius-full;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .search__success {
    color: $color-green;
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
  }

  .search__error {
    margin-top: 0;
  }

  .search__results {
    display: flex;
    flex-direction: column;
    gap: $space-1;
    max-height: 360px;
    overflow-y: auto;
    @include custom-scrollbar;
  }

  .search__result {
    @include flex-start;
    gap: $space-3;
    padding: $space-2 $space-3;
    border-radius: $radius-md;
    transition: background $transition-base;
    cursor: default;

    &:hover {
      background: $color-elevated;
    }
  }

  .search__art {
    width: 44px;
    height: 44px;
    border-radius: $radius-sm;
    object-fit: cover;
    flex-shrink: 0;
    background: $color-elevated;

    &--placeholder {
      background: $color-elevated-2;
    }
  }

  .search__info {
    flex: 1;
    min-width: 0;
  }

  .search__name {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    @include truncate;
  }

  .search__meta {
    font-size: $font-size-xs;
    color: $color-text-secondary;
    @include truncate;
    display: flex;
    align-items: center;
    gap: $space-1;
  }

  .search__explicit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    background: $color-text-muted;
    color: $color-bg;
    font-size: 9px;
    font-weight: $font-weight-bold;
    border-radius: 2px;
  }

  .search__duration {
    font-size: $font-size-xs;
    color: $color-text-muted;
    flex-shrink: 0;
  }

  .search__add {
    flex-shrink: 0;
  }
</style>
