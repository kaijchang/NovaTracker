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

{games.length}
{#each games.sort((a, b) => b.StartTime.localeCompare(a.StartTime)) as game}
	<p>{game._id} - {game.OpponentPlayerData.displayName} - {game.StartTime}</p>
{/each}
