<script lang="ts">
	export let label
</script>

<div>
	<h2>
		<slot />
	</h2>
	<span>{label}</span>
</div>

<style>
	h2 {
		font-size: 2rem;
		color: var(--color-primary);
		margin: 0;
	}

	span {
		font-size: 0.75rem;
		color: var(--color-secondary);
	}
</style>
