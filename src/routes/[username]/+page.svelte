<script lang="ts">
  import { enhance } from '$app/forms';
  import NowPlaying from '$lib/components/NowPlaying.svelte';
  import Queue from '$lib/components/Queue.svelte';
  import SearchBox from '$lib/components/SearchBox.svelte';
  import type { PageData, ActionData } from './$types';
  import type { PlayerState, QueueAddition, SpotifyTrack } from '$lib/types';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // ── Passcode form state ────────────────────────────────────────────────────
  let digits = $state(['', '', '', '', '', '']);
  let inputs: HTMLInputElement[] = [];

  function onDigitInput(index: number, e: Event) {
    const val = (e.target as HTMLInputElement).value.replace(/\D/, '');
    digits[index] = val.slice(-1);
    if (val && index < 5) inputs[index + 1]?.focus();
  }

  function onDigitKeydown(index: number, e: KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputs[index - 1]?.focus();
    }
  }

  function onDigitPaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text') ?? '';
    const nums = text.replace(/\D/g, '').slice(0, 6).split('');
    nums.forEach((n, i) => {
      if (i < 6) digits[i] = n;
    });
    if (nums.length > 0) inputs[Math.min(nums.length, 5)]?.focus();
    e.preventDefault();
  }

  // ── Player state (only when passcode is valid) ─────────────────────────────
  let playerState = $state<PlayerState>({ isPlaying: false, track: null, progressMs: 0, queue: [] });
  let additions = $state<QueueAddition[]>([]);
  async function fetchPlayer() {
    try {
      const res = await fetch(`/api/${encodeURIComponent(data.username)}/player`);
      if (res.status === 401) { location.reload(); return; }
      if (res.ok) playerState = await res.json();
    } catch {}
  }

  async function fetchAdditions() {
    try {
      const res = await fetch(`/api/${encodeURIComponent(data.username)}/queue`);
      if (res.status === 401) { location.reload(); return; }
      if (res.ok) additions = await res.json();
    } catch {}
  }

  async function addTrack(track: SpotifyTrack) {
    const res = await fetch(`/api/${encodeURIComponent(data.username)}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackId: track.id,
        trackName: track.name,
        trackArtist: track.artist,
        trackUri: track.uri,
        trackImageUrl: track.imageUrl,
        explicit: track.explicit,
        releaseYear: track.releaseYear
      })
    });

    if (res.status === 401) { location.reload(); return; }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to add track');
    }

    const addition: QueueAddition = await res.json();
    additions = [...additions, addition];
  }

  async function removeAddition(id: string) {
    const res = await fetch(
      `/api/${encodeURIComponent(data.username)}/queue/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
    if (res.status === 401) { location.reload(); return; }
    if (res.ok) {
      additions = additions.filter((a) => a.id !== id);
    }
  }

  $effect(() => {
    if (data.requiresPasscode) return;

    fetchPlayer();
    fetchAdditions();
    const interval = setInterval(() => {
      fetchPlayer();
      fetchAdditions();
    }, 5000);

    return () => clearInterval(interval);
  });
</script>

<svelte:head>
  <title>{data.displayName ?? data.username}'s Party Jam</title>
</svelte:head>

{#if data.requiresPasscode}
  <!-- ── Passcode gate ── -->
  <div class="gate">
    <div class="gate__card">
      <div class="gate__logo">
        <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.623.623 0 01-.277-1.215c3.809-.87 7.076-.496 9.712 1.115a.623.623 0 01.207.857zm1.223-2.723a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 01-.973-.517.78.78 0 01.517-.972c3.632-1.102 8.147-.568 11.236 1.326a.78.78 0 01.257 1.072zm.105-2.835C14.692 9.15 8.375 8.938 5.042 9.96a.937.937 0 11-.543-1.794c3.798-1.15 10.115-.928 14.1 1.442a.937.937 0 01-.685 1.258z"/>
        </svg>
        <span>Party Jam</span>
      </div>

      <h1 class="gate__title">
        {data.displayName ? `${data.displayName}'s Queue` : `@${data.username}`}
      </h1>
      <p class="gate__subtitle">Enter the passcode to add songs to the queue.</p>

      <form
        method="POST"
        action="?/validatePasscode"
        use:enhance
        class="gate__form"
      >
        <div class="gate__digits">
          {#each digits as digit, i}
            <input
              type="tel"
              inputmode="numeric"
              maxlength="1"
              name="d{i + 1}"
              class="gate__digit"
              class:gate__digit--filled={!!digit}
              value={digit}
              oninput={(e) => onDigitInput(i, e)}
              onkeydown={(e) => onDigitKeydown(i, e)}
              onpaste={onDigitPaste}
              bind:this={inputs[i]}
              autocomplete="one-time-code"
              aria-label="Digit {i + 1}"
            />
          {/each}
        </div>

        {#if form?.error}
          <p class="error-msg gate__error">{form.error}</p>
        {/if}

        <button class="btn btn--primary btn--lg gate__submit" type="submit">
          Enter
        </button>
      </form>
    </div>
  </div>
{:else}
  <!-- ── Share page ── -->
  <div class="share-page">
    <header class="share-header">
      <a href="/" class="share-header__brand">Party Jam</a>
      <div class="share-header__owner">
        {#if data.avatarUrl}
          <img src={data.avatarUrl} alt={data.displayName ?? data.username} class="share-header__avatar" />
        {/if}
        <span>{data.displayName ?? data.username}</span>
      </div>
    </header>

    <main class="share-main">
      <!-- Now Playing -->
      <section class="share-card">
        <NowPlaying
          track={playerState.track}
          progressMs={playerState.progressMs}
          isPlaying={playerState.isPlaying}
        />
      </section>

      <!-- Queue -->
      <section class="share-card">
        <Queue
          spotifyQueue={playerState.queue}
          {additions}
          onRemove={removeAddition}
        />
      </section>

      <!-- Search & Add -->
      <section class="share-card">
        <h2 class="share-section-title">Add a Song</h2>
        <SearchBox username={data.username} onAdd={addTrack} />
      </section>
    </main>

    <footer class="share-footer">
      <p><a href="https://github.com/M4rkux/partyjam" target="_blank" rel="noopener noreferrer" class="share-footer__link"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true" style="vertical-align:middle;margin-right:4px"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg><strong>Party Jam</strong></a></p>
    </footer>
  </div>
{/if}

<style lang="scss">
  @use '../../styles/variables' as *;
  @use '../../styles/mixins' as *;

  // ── Passcode gate ─────────────────────────────────────────────────────────
  .gate {
    @include flex-center;
    min-height: 100dvh;
    padding: $space-4;
  }

  .gate__card {
    @include card($color-surface);
    width: 100%;
    max-width: $max-width-sm;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-6;
    text-align: center;
  }

  .gate__logo {
    @include flex-center;
    gap: $space-2;
    color: $color-green;
    font-weight: $font-weight-bold;
    font-size: $font-size-lg;
  }

  .gate__title {
    font-size: $font-size-xl;
    font-weight: $font-weight-bold;
  }

  .gate__subtitle {
    color: $color-text-secondary;
    font-size: $font-size-sm;
    margin-top: -$space-4;
  }

  .gate__form {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-4;
  }

  .gate__digits {
    display: flex;
    gap: $space-2;
    justify-content: center;
  }

  .gate__digit {
    width: 48px;
    height: 60px;
    text-align: center;
    font-size: $font-size-xl;
    font-weight: $font-weight-bold;
    background: $color-elevated;
    border: 2px solid $color-border;
    border-radius: $radius-md;
    color: $color-text;
    caret-color: $color-green;
    transition: border-color $transition-base;

    &:focus {
      outline: none;
      border-color: $color-green;
    }

    &--filled {
      border-color: $color-border-hover;
    }
  }

  .gate__error {
    width: 100%;
    text-align: center;
  }

  .gate__submit {
    width: 100%;
    max-width: 200px;
  }

  // ── Share page ────────────────────────────────────────────────────────────
  .share-page {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  .share-header {
    @include flex-between;
    padding: $space-4 $space-6;
    border-bottom: 1px solid $color-border;
    position: sticky;
    top: 0;
    background: $color-bg;
    z-index: 10;
  }

  .share-header__brand {
    font-weight: $font-weight-bold;
    color: $color-green;
    font-size: $font-size-lg;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .share-header__owner {
    @include flex-start;
    gap: $space-2;
    font-size: $font-size-sm;
    color: $color-text-secondary;
  }

  .share-header__avatar {
    width: 28px;
    height: 28px;
    border-radius: $radius-full;
    object-fit: cover;
  }

  .share-main {
    flex: 1;
    max-width: $max-width-md;
    margin: 0 auto;
    width: 100%;
    padding: $space-6 $space-4;
    display: flex;
    flex-direction: column;
    gap: $space-6;
  }

  .share-card {
    @include card;
  }

  .share-section-title {
    font-size: $font-size-base;
    font-weight: $font-weight-semibold;
    margin-bottom: $space-4;
  }

  .share-footer {
    text-align: center;
    padding: $space-6 $space-4;
    color: $color-text-muted;
    font-size: $font-size-xs;
    border-top: 1px solid $color-border;

    &__link {
      color: inherit;
      text-decoration: none;
      display: inline-flex;
      align-items: center;

      &:hover {
        text-decoration: underline;
      }
    }
  }
</style>
