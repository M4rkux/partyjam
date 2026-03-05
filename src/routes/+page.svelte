<script lang="ts">
  import { enhance } from '$app/forms';
  import QRCode from '$lib/components/QRCode.svelte';
  import PasscodeDisplay from '$lib/components/PasscodeDisplay.svelte';
  import ShareSettings from '$lib/components/ShareSettings.svelte';
  import type { PageData, ActionData } from './$types';

  import { untrack } from 'svelte';

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let passcode = $state(untrack(() => data.user?.passcode ?? ''));

  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';

  let shareUrl = $derived(
    data.user
      ? `${origin}/${data.user.username}?passcode=${passcode}`
      : ''
  );
  let copied = $state(false);
  let settingsSaved = $state(false);

  $effect(() => {
    // Update passcode when form returns a new one
    if (form && 'passcode' in form && form.passcode) {
      passcode = form.passcode as string;
    }
    if (form && 'success' in form && form.success) {
      settingsSaved = true;
      setTimeout(() => (settingsSaved = false), 2000);
    }
  });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      // fallback: select text
    }
  }
</script>

<svelte:head>
  <title>Party Jam</title>
</svelte:head>

<div class="page">
  {#if !data.user}
    <!-- ── Login page ── -->
    <div class="login">
      <div class="login__logo">
        <svg viewBox="0 0 24 24" fill="currentColor" class="login__logo-icon">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424a.622.622 0 01-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.623.623 0 01-.277-1.215c3.809-.87 7.076-.496 9.712 1.115a.623.623 0 01.207.857zm1.223-2.723a.78.78 0 01-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.78.78 0 01-.973-.517.78.78 0 01.517-.972c3.632-1.102 8.147-.568 11.236 1.326a.78.78 0 01.257 1.072zm.105-2.835C14.692 9.15 8.375 8.938 5.042 9.96a.937.937 0 11-.543-1.794c3.798-1.15 10.115-.928 14.1 1.442a.937.937 0 01-.685 1.258z"/>
        </svg>
        <h1 class="login__title">Party Jam</h1>
      </div>
      <p class="login__tagline">Let your guests add songs to your Spotify queue.</p>
      <a href="/api/auth/spotify" class="btn btn--primary btn--lg login__cta">
        Login with Spotify
      </a>
    </div>
  {:else}
    <!-- ── Dashboard ── -->
    <header class="dashboard-header">
      <div class="dashboard-header__brand">
        <a href="/" class="dashboard-header__name">Party Jam</a>
      </div>
      <div class="dashboard-header__user">
        {#if data.user.avatarUrl}
          <img src={data.user.avatarUrl} alt={data.user.displayName ?? data.user.username} class="dashboard-header__avatar" />
        {/if}
        <span class="dashboard-header__username">{data.user.displayName ?? data.user.username}</span>
        <form method="POST" action="?/logout" use:enhance>
          <button class="btn btn--ghost btn--sm" type="submit">Log out</button>
        </form>
      </div>
    </header>

    <main class="dashboard">
      <!-- Share card -->
      <section class="share-card">
        <h2 class="share-card__title">Your Party Jam Link</h2>
        <p class="share-card__subtitle">
          Share this link and passcode so guests can add songs to your queue.
        </p>

        <div class="share-card__layout">
          <!-- QR + info -->
          <div class="share-card__qr-section">
            <QRCode url={shareUrl} size={180} />
          </div>

          <div class="share-card__info">
            <div class="share-card__url-row">
              <span class="share-card__url">/{data.user.username}</span>
              <button class="btn btn--secondary btn--sm" onclick={copyLink}>
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>

            <PasscodeDisplay {passcode} />

            <form method="POST" action="?/regeneratePasscode" use:enhance class="share-card__regen">
              <button class="btn btn--ghost btn--sm" type="submit">
                Regenerate passcode
              </button>
            </form>
          </div>
        </div>
      </section>

      <!-- Settings card -->
      <section class="settings-section">
        <h2 class="settings-section__title">Queue Settings</h2>
        <ShareSettings settings={data.user.shareSettings} saved={settingsSaved} />
      </section>
    </main>
  {/if}
</div>

<style lang="scss">
  @use '../styles/variables' as *;
  @use '../styles/mixins' as *;

  .page {
    min-height: 100dvh;
  }

  // ── Login ──────────────────────────────────────────────────────────────────
  .login {
    @include flex-center;
    flex-direction: column;
    gap: $space-6;
    min-height: 100dvh;
    padding: $space-8 $space-4;
    text-align: center;
  }

  .login__logo {
    @include flex-center;
    gap: $space-3;
    color: $color-green;
  }

  .login__logo-icon {
    width: 56px;
    height: 56px;
  }

  .login__title {
    font-size: $font-size-3xl;
    font-weight: $font-weight-bold;
    letter-spacing: -0.02em;
  }

  .login__tagline {
    font-size: $font-size-md;
    color: $color-text-secondary;
    max-width: 340px;
  }

  .login__cta {
    margin-top: $space-2;
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  .dashboard-header {
    @include flex-between;
    padding: $space-4 $space-6;
    border-bottom: 1px solid $color-border;
    position: sticky;
    top: 0;
    background: $color-bg;
    z-index: 10;
  }

  .dashboard-header__brand {
    color: $color-green;
    font-weight: $font-weight-bold;
    font-size: $font-size-lg;
  }

  .dashboard-header__name {
    color: $color-green;
    font-weight: $font-weight-bold;
    font-size: $font-size-lg;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  .dashboard-header__user {
    @include flex-start;
    gap: $space-3;
  }

  .dashboard-header__avatar {
    width: 32px;
    height: 32px;
    border-radius: $radius-full;
    object-fit: cover;
  }

  .dashboard-header__username {
    color: $color-text-secondary;
    font-size: $font-size-sm;

    @include md {
      display: block;
    }
  }

  .dashboard {
    max-width: $max-width-lg;
    margin: 0 auto;
    padding: $space-8 $space-4;
    display: flex;
    flex-direction: column;
    gap: $space-8;
  }

  // ── Share card ────────────────────────────────────────────────────────────
  .share-card {
    @include card;
    display: flex;
    flex-direction: column;
    gap: $space-6;
  }

  .share-card__title {
    font-size: $font-size-xl;
    font-weight: $font-weight-bold;
  }

  .share-card__subtitle {
    color: $color-text-secondary;
    font-size: $font-size-sm;
    margin-top: -$space-4;
  }

  .share-card__layout {
    display: flex;
    flex-direction: column;
    gap: $space-6;

    @include md {
      flex-direction: row;
      align-items: flex-start;
    }
  }

  .share-card__qr-section {
    flex-shrink: 0;
  }

  .share-card__info {
    display: flex;
    flex-direction: column;
    gap: $space-4;
    flex: 1;
  }

  .share-card__url-row {
    @include flex-between;
    gap: $space-3;
    padding: $space-3 $space-4;
    background: $color-elevated;
    border-radius: $radius-md;
    border: 1px solid $color-border;
  }

  .share-card__url {
    font-family: monospace;
    font-size: $font-size-base;
    color: $color-green;
    @include truncate;
  }

  .share-card__regen {
    display: flex;
  }

  // ── Settings section ──────────────────────────────────────────────────────
  .settings-section {
    @include card;
    display: flex;
    flex-direction: column;
    gap: $space-6;
  }

  .settings-section__title {
    font-size: $font-size-xl;
    font-weight: $font-weight-bold;
  }
</style>
