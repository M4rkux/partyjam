<script lang="ts">
  import { onMount } from 'svelte';
  import QRCodeLib from 'qrcode';

  let { url, size = 180 }: { url: string; size?: number } = $props();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let canvas = $state<HTMLCanvasElement>(undefined as any);
  let mounted = $state(false);

  onMount(() => {
    mounted = true;
  });

  $effect(() => {
    if (mounted && canvas && url) {
      QRCodeLib.toCanvas(canvas, url, {
        width: size,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }).catch(console.error);
    }
  });
</script>

<div class="qr" style="width:{size}px;height:{size}px">
  {#if url}
    <canvas bind:this={canvas} width={size} height={size} class="qr__canvas"></canvas>
  {:else}
    <div class="qr__placeholder" style="width:{size}px;height:{size}px"></div>
  {/if}
</div>

<style lang="scss">
  @use '../../styles/variables' as *;

  .qr {
    border-radius: $radius-md;
    overflow: hidden;
    background: #fff;
    flex-shrink: 0;
  }

  .qr__canvas {
    display: block;
  }

  .qr__placeholder {
    background: $color-elevated;
  }
</style>
