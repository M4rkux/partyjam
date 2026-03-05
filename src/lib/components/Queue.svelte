<script lang="ts">
  import { formatDuration } from '$lib/utils';
  import type { SpotifyTrack, QueueAddition } from '$lib/types';

  let {
    spotifyQueue = [],
    additions = [],
    onRemove
  }: {
    spotifyQueue?: SpotifyTrack[];
    additions?: QueueAddition[];
    onRemove?: (id: string) => void;
  } = $props();
</script>

<div class="queue">
  <!-- Spotify upcoming queue -->
  {#if spotifyQueue.length > 0}
    <div class="queue__section">
      <h3 class="queue__section-title">Up Next</h3>
      <ul class="queue__list">
        {#each spotifyQueue.slice(0, 10) as track (track.id + track.uri)}
          <li class="queue__item">
            {#if track.imageUrl}
              <img src={track.imageUrl} alt={track.album} class="queue__art" />
            {:else}
              <div class="queue__art queue__art--placeholder">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
            {/if}
            <div class="queue__info">
              <p class="queue__name">{track.name}</p>
              <p class="queue__artist">{track.artist}</p>
            </div>
            <span class="queue__duration">{formatDuration(track.durationMs)}</span>
          </li>
        {/each}
      </ul>
    </div>
  {:else}
    <p class="queue__empty">Queue is empty.</p>
  {/if}

  <!-- Visitor additions tracking -->
  {#if additions.length > 0}
    <div class="queue__section">
      <h3 class="queue__section-title">Added via Party Jam</h3>
      <ul class="queue__list">
        {#each additions as item (item.id)}
          <li class="queue__item">
            {#if item.trackImageUrl}
              <img src={item.trackImageUrl} alt={item.trackName} class="queue__art" />
            {:else}
              <div class="queue__art queue__art--placeholder">
                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
            {/if}
            <div class="queue__info">
              <p class="queue__name">{item.trackName}</p>
              <p class="queue__artist">{item.trackArtist}</p>
            </div>
            {#if item.isOwn && onRemove}
              <button
                class="queue__remove btn btn--ghost btn--sm"
                onclick={() => onRemove(item.id)}
                title="Remove your addition"
                aria-label="Remove {item.trackName} from queue"
              >
                Remove
              </button>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

<style lang="scss">
  @use 'sass:color';
  @use '../../styles/variables' as *;
  @use '../../styles/mixins' as *;

  .queue {
    display: flex;
    flex-direction: column;
    gap: $space-6;
  }

  .queue__section {
    display: flex;
    flex-direction: column;
    gap: $space-3;
  }

  .queue__section-title {
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: $color-text-secondary;
  }

  .queue__list {
    display: flex;
    flex-direction: column;
    gap: $space-1;
  }

  .queue__item {
    @include flex-start;
    gap: $space-3;
    padding: $space-2 $space-3;
    border-radius: $radius-md;
    transition: background $transition-base;

    &:hover {
      background: $color-elevated;
    }
  }

  .queue__art {
    width: 40px;
    height: 40px;
    border-radius: $radius-sm;
    object-fit: cover;
    flex-shrink: 0;
    background: $color-elevated;

    &--placeholder {
      @include flex-center;
      color: $color-text-muted;
    }
  }

  .queue__info {
    flex: 1;
    min-width: 0;
  }

  .queue__name {
    font-size: $font-size-sm;
    font-weight: $font-weight-medium;
    @include truncate;
  }

  .queue__artist {
    font-size: $font-size-xs;
    color: $color-text-secondary;
    @include truncate;
  }

  .queue__duration {
    font-size: $font-size-xs;
    color: $color-text-muted;
    flex-shrink: 0;
  }

  .queue__remove {
    flex-shrink: 0;
    color: $color-error;
    font-size: $font-size-xs;

    &:hover {
      color: color.adjust($color-error, $lightness: 10%);
    }
  }

  .queue__empty {
    color: $color-text-muted;
    font-size: $font-size-sm;
    padding: $space-2 0;
  }
</style>
