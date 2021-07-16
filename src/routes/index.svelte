<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit'

	export const load: Load = async ({ fetch }) => {
		const url = `/index.json`
		const res = await fetch(url)
		if (res.ok) {
			return {
				props: {
					games: await res.json(),
				},
				maxage: 300,
			}
		}
		return {
			status: res.status,
			error: new Error(`Could not load ${url}`),
		}
	}
</script>

<script lang="ts">
	import type { WrappedGame } from '$lib/modules/novablitz'

	export let games: WrappedGame[]
</script>

{JSON.stringify(games)}
