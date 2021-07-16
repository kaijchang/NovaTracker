<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit'

	export const load: Load = async ({ fetch }) => {
		const games_url = '/games.json'
		const games_res = await fetch(games_url)
		if (!games_res.ok) {
			return {
				status: games_res.status,
				error: new Error(`Could not load ${games_url}`),
			}
		}
		const leaderboard_url = '/leaderboard.json'
		const leaderboard_res = await fetch(leaderboard_url)
		if (!leaderboard_res.ok) {
			return {
				status: leaderboard_res.status,
				error: new Error(`Could not load ${games_url}`),
			}
		}
		return {
			props: {
				games: await games_res.json(),
				leaderboard: await leaderboard_res.json(),
				playerId: (import.meta.env.VITE_PUBLIC_AUTHORIZATION_TOKEN as string).split('-')[0],
			},
		}
	}
</script>

<script lang="ts">
	import Chart from '@sveltejs/pancake/components/Chart.svelte'
	import Grid from '@sveltejs/pancake/components/Grid.svelte'
	import Svg from '@sveltejs/pancake/components/Svg.svelte'
	import SvgLine from '@sveltejs/pancake/components/SvgLine.svelte'

	import dayjs from 'dayjs'
	import duration, { Duration } from 'dayjs/plugin/duration'
	import relativeTime from 'dayjs/plugin/relativeTime'
	dayjs.extend(duration)
	dayjs.extend(relativeTime)

	import type { Leaderboard, LogElement, WrappedGame } from '$lib/modules/novablitz'
	import { newRating, numWinsSARAHNeededToRating, SARAH_RATING } from '$lib/modules/elo'

	interface RichLogElement extends Omit<LogElement, 'LogTime'> {
		LogTime: dayjs.Dayjs
	}

	interface RichWrappedGame extends Omit<WrappedGame, 'LogElements' | 'StartTime'> {
		LogElements: RichLogElement[]
		StartTime: dayjs.Dayjs
		EndTime: dayjs.Dayjs
		Duration: Duration
		RatingInformation?: {
			newRating: number
			ratingChange: number
		}
	}

	const AVG_DOWNTIME_BTWN_GAMES = 60

	export let games: WrappedGame[]
	export let leaderboard: Leaderboard
	export let playerId: string

	const currentRating = leaderboard.find(
		(leaderboardEntry) => leaderboardEntry.PlayFabId === playerId
	).StatValue

	const richGames = games
		.sort((a, b) => b.StartTime.localeCompare(a.StartTime))
		.map((game, idx, arr) => {
			const LogElements = game.LogElements.map((logElement) => ({
				...logElement,
				LogTime: dayjs(logElement.LogTime),
			}))
			const StartTime = dayjs(game.StartTime)
			const EndTime = LogElements[LogElements.length - 1].LogTime.clone()
			const opponentRating = game.OpponentPlayerData.rating || SARAH_RATING

			return {
				...game,
				LogElements,
				StartTime,
				EndTime,
				Duration: dayjs.duration(StartTime.diff(EndTime)),
				RatingInformation:
					idx !== 0
						? {
								newRating: arr[idx - 1].PlayerPlayerData.rating,
								ratingChange: arr[idx - 1].PlayerPlayerData.rating - game.PlayerPlayerData.rating,
						  }
						: {
								newRating: currentRating,
								ratingChange: currentRating - game.PlayerPlayerData.rating,
						  },
				OpponentPlayerData: {
					...game.OpponentPlayerData,
					rating: opponentRating,
				},
			}
		}) as RichWrappedGame[]

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

	const now = dayjs()
	const averageGameTime =
		filteredGames.reduce((acc, cur) => acc - cur.Duration.asSeconds(), 0) / filteredGames.length +
		AVG_DOWNTIME_BTWN_GAMES

	// DESMOS DATA
	/*
	console.log(filteredGames.map((game) => {
		return `${Math.abs((game.OpponentPlayerData.rating) - game.PlayerPlayerData.rating)},${game.IsPlayerWinner ? game.RatingInformation.ratingChange : -game.RatingInformation.ratingChange * 2}`
	}).join('\n'))
	*/
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
	Current Rating: {currentRating}
</p>
<p>
	Estimated Change for Beating S.A.R.A.H.: +{Math.round(
		newRating(currentRating, SARAH_RATING, true)
	) - currentRating} Points
</p>

{#each leaderboard.slice(0, 10) as leaderboardEntry}
	<p>
		#{leaderboardEntry.Position + 1} - {leaderboardEntry.DisplayName} - {leaderboardEntry.StatValue}
		- {leaderboardEntry.StatValue > currentRating
			? numWinsSARAHNeededToRating(currentRating, leaderboardEntry.StatValue)
			: 'N/A'} S.A.R.A.H. Wins - {leaderboardEntry.StatValue > currentRating
			? dayjs
					.duration(
						numWinsSARAHNeededToRating(currentRating, leaderboardEntry.StatValue) * averageGameTime,
						'seconds'
					)
					.asHours()
					.toFixed(1)
			: 'N/A'} Hours
	</p>
{/each}

{#each filteredGames as game, idx}
	<p>
		{dayjs.duration(game.EndTime.diff(now)).humanize(true)} - against {game.OpponentPlayerData
			.displayName} - lasted {game.Duration.humanize()} - {idx === 0 ? '~' : ''}{game.IsPlayerWinner
			? '+'
			: ''}{Math.round(game.RatingInformation.ratingChange)} points - {game.PlayerPlayerData.rating}
		/ {game.OpponentPlayerData.rating}
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
		stroke: white;
		stroke-linejoin: round;
		stroke-linecap: round;
		stroke-width: 1px;
		fill: none;
	}
</style>
