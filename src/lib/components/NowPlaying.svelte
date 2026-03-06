<script lang="ts">
  import { untrack } from 'svelte';
  import { formatDuration } from '$lib/utils';
  import type { SpotifyTrack } from '$lib/types';

  let {
    track,
    progressMs = 0,
    isPlaying = false
  }: {
    track: SpotifyTrack | null;
    progressMs?: number;
    isPlaying?: boolean;
  } = $props();

  let localProgressMs = $state(untrack(() => progressMs));

  // Sync local progress when server data arrives
  $effect(() => {
    localProgressMs = progressMs;
  });

  // Tick every second while playing, aligning to the next second boundary first
  $effect(() => {
    if (!isPlaying || !track) return;
    const duration = track.durationMs;

    const startProgress = untrack(() => localProgressMs);
    const msToNextSecond = 1000 - (startProgress % 1000);

    let interval: ReturnType<typeof setInterval>;
    const timeout = setTimeout(() => {
      localProgressMs = Math.min(localProgressMs + msToNextSecond, duration);
      interval = setInterval(() => {
        localProgressMs = Math.min(localProgressMs + 1000, duration);
        if (localProgressMs >= duration) clearInterval(interval);
      }, 1000);
    }, msToNextSecond);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  });

  let progress = $derived(track ? Math.min(100, (localProgressMs / track.durationMs) * 100) : 0);
</script>

<div class="now-playing">
  <div class="now-playing__header">
    <span class="now-playing__label">Now Playing</span>
    <span class="now-playing__status" class:now-playing__status--playing={isPlaying}>
      {#if isPlaying}
        <span class="now-playing__bars" aria-label="Playing">
          <span></span><span></span><span></span>
        </span>
      {:else}
        Paused
      {/if}
    </span>
  </div>

  {#if track}
    <div class="now-playing__track">
      {#if track.imageUrl}
        <img src={track.imageUrl} alt={track.album} class="now-playing__art" />
      {:else}
        <div class="now-playing__art now-playing__art--placeholder">
          <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        </div>
      {/if}

      <div class="now-playing__info">
        <p class="now-playing__name">{track.name}</p>
        <p class="now-playing__artist">{track.artist}</p>
        <div class="now-playing__progress-wrap">
          <div class="now-playing__progress">
            <div class="now-playing__bar" style="width:{progress}%"></div>
          </div>
          <div class="now-playing__times">
            <span>{formatDuration(localProgressMs)}</span>
            <span>{formatDuration(track.durationMs)}</span>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="now-playing__empty">
      Nothing playing right now.
    </div>
  {/if}
</div>

<style lang="scss">
  @use '../../styles/variables' as *;
  @use '../../styles/mixins' as *;

  .now-playing {
    display: flex;
    flex-direction: column;
    gap: $space-4;
  }

  .now-playing__header {
    @include flex-between;
  }

  .now-playing__label {
    font-size: $font-size-xs;
    font-weight: $font-weight-semibold;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: $color-text-secondary;
  }

  .now-playing__status {
    font-size: $font-size-xs;
    color: $color-text-muted;

    &--playing {
      color: $color-green;
    }
  }

  // Animated bars for "playing" state
  .now-playing__bars {
    display: inline-flex;
    align-items: flex-end;
    gap: 2px;
    height: 14px;

    span {
      display: block;
      width: 3px;
      background: $color-green;
      border-radius: 1px;
      animation: bar-bounce 1s ease-in-out infinite;

      &:nth-child(1) { animation-delay: 0s; height: 8px; }
      &:nth-child(2) { animation-delay: 0.2s; height: 14px; }
      &:nth-child(3) { animation-delay: 0.4s; height: 6px; }
    }
  }

  @keyframes bar-bounce {
    0%, 100% { transform: scaleY(0.4); }
    50% { transform: scaleY(1); }
  }

  .now-playing__track {
    @include flex-start;
    gap: $space-4;
    align-items: flex-start;
  }

  .now-playing__art {
    width: 80px;
    height: 80px;
    border-radius: $radius-md;
    object-fit: cover;
    flex-shrink: 0;
    background: $color-elevated;

    &--placeholder {
      @include flex-center;
      color: $color-text-muted;
    }
  }

  .now-playing__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: $space-1;
  }

  .now-playing__name {
    font-weight: $font-weight-semibold;
    font-size: $font-size-base;
    @include truncate;
  }

  .now-playing__artist {
    color: $color-text-secondary;
    font-size: $font-size-sm;
    @include truncate;
  }

  .now-playing__progress-wrap {
    display: flex;
    flex-direction: column;
    gap: $space-1;
    margin-top: $space-2;
  }

  .now-playing__progress {
    height: 4px;
    background: $color-elevated-2;
    border-radius: $radius-full;
    overflow: hidden;
  }

  .now-playing__bar {
    height: 100%;
    background: $color-green;
    border-radius: $radius-full;
    transition: width 1s linear;
  }

  .now-playing__times {
    @include flex-between;
    font-size: $font-size-xs;
    color: $color-text-muted;
  }

  .now-playing__empty {
    color: $color-text-muted;
    font-size: $font-size-sm;
    padding: $space-4 0;
  }
</style>
