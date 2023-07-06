<script>
	export let onClick;
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="context-item" style="background: #45444E" on:click|stopPropagation={onClick}>
	<slot />
</div>

<style>
	.context-item {
		display: flex;
		align-items: center;
		gap: 4px;
		color: white;
		border-radius: 3px;
		padding: 3px 9px 3px 9px;
	}
</style>
