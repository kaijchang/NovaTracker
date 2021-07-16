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
	import Chart from '@sveltejs/pancake/components/Chart.svelte'
	import Grid from '@sveltejs/pancake/components/Grid.svelte'
	import Svg from '@sveltejs/pancake/components/Svg.svelte'
	import SvgLine from '@sveltejs/pancake/components/SvgLine.svelte'

	import dayjs from 'dayjs'

	import type { LogElement, WrappedGame } from '$lib/modules/novablitz'
	import { newRating, numWinsSARAHNeededToRating, SARAH_RATING } from '$lib/modules/elo'

	interface RichLogElement extends Omit<LogElement, 'LogTime'> {
		LogTime: dayjs.Dayjs
	}

	interface RichWrappedGame extends Omit<WrappedGame, 'LogElements' | 'StartTime'> {
		LogElements: RichLogElement[]
		StartTime: dayjs.Dayjs
		RatingInformation?: {
			newRating: number
			ratingChange: number
		}
	}

	export let games: WrappedGame[]

	const richGames = games
		.sort((a, b) => b.StartTime.localeCompare(a.StartTime))
		.map((game, idx, arr) => ({
			...game,
			LogElements: game.LogElements.map((logElement) => ({
				...logElement,
				LogTime: dayjs(logElement.LogTime),
			})),
			StartTime: dayjs(game.StartTime),
			RatingInformation:
				idx !== 0
					? {
							newRating: arr[idx - 1].PlayerPlayerData.rating,
							ratingChange: arr[idx - 1].PlayerPlayerData.rating - game.PlayerPlayerData.rating,
					  }
					: {
							newRating: newRating(
								game.PlayerPlayerData.rating,
								game.OpponentPlayerData.rating || SARAH_RATING,
								game.IsPlayerWinner
							),
							ratingChange:
								newRating(
									game.PlayerPlayerData.rating,
									game.OpponentPlayerData.rating || SARAH_RATING,
									game.IsPlayerWinner
								) - game.PlayerPlayerData.rating,
					  },
		})) as RichWrappedGame[]

	const filteredGames = richGames.filter((game) => game.Format === 'Casual')

	let x1 = +Infinity
	let x2 = -Infinity
	let y1 = +Infinity
	let y2 = -Infinity

	filteredGames.forEach((game, idx) => {
		const x = filteredGames.length - idx
		const y = game.RatingInformation.newRating

		if (x < x1) x1 = x
		if (x > x2) x2 = x
		if (y < y1) y1 = y
		if (y > y2) y2 = y
	})

	const estimatedCurrentRating = filteredGames[0].RatingInformation.newRating
</script>

<div class="chart">
	<Chart {x1} {x2} {y1} {y2}>
		<Grid horizontal count={5} let:value>
			<div class="grid-line horizontal"><span>{value}</span></div>
		</Grid>

		<Grid vertical count={5} let:value>
			<span class="x-label">{value}</span>
		</Grid>

		<Svg>
			<SvgLine
				data={filteredGames.map((game, idx) => ({
					x: filteredGames.length - idx,
					y: game.RatingInformation.newRating,
				}))}
				let:d
			>
				<path class="data" {d} />
			</SvgLine>
		</Svg>
	</Chart>
</div>

<p>
	Estimated Rating: {estimatedCurrentRating}
</p>
<p>
	Estimated Change for Beating S.A.R.A.H.: +{newRating(estimatedCurrentRating, 10000, true) -
		estimatedCurrentRating} Points
</p>

{#each [3, 4] as order}
	<p>
		Estimated Road to {Math.ceil(estimatedCurrentRating / Math.pow(10, order)) *
			Math.pow(10, order)} Points: {numWinsSARAHNeededToRating(
			estimatedCurrentRating,
			Math.ceil(estimatedCurrentRating / Math.pow(10, order)) * Math.pow(10, order)
		)} S.A.R.A.H. Wins
	</p>
{/each}

{#each filteredGames as game, idx}
	<p>
		{game._id} - {game.OpponentPlayerData.displayName} - {idx === 0 ? '~' : ''}{game.IsPlayerWinner
			? '+'
			: ''}{game.RatingInformation.ratingChange}
	</p>
{/each}

<style>
	.chart {
		height: 400px;
		padding: 3em 0 2em 2em;
		margin: 0 0 36px 0;
	}

	.grid-line {
		position: relative;
		display: block;
	}

	.grid-line.horizontal {
		width: calc(100% + 2em);
		left: -2em;
		border-bottom: 1px dashed #ccc;
	}

	.grid-line span {
		position: absolute;
		left: 0;
		bottom: 2px;
		font-family: sans-serif;
		font-size: 14px;
		color: #999;
	}

	.x-label {
		position: absolute;
		width: 4em;
		left: -2em;
		bottom: -22px;
		font-family: sans-serif;
		font-size: 14px;
		color: #999;
		text-align: center;
	}

	path.data {
		stroke: rgba(0, 0, 0, 0.2);
		stroke-linejoin: round;
		stroke-linecap: round;
		stroke-width: 1px;
		fill: none;
	}
</style>
