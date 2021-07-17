<script context="module" lang="ts">
	import type { Load } from '@sveltejs/kit'
	import { variables } from '$lib/variables'

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
				playerId: variables.AUTHORIZATION_TOKEN.split('-')[0],
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
	import duration, { Duration } from 'dayjs/plugin/duration.js'
	import relativeTime from 'dayjs/plugin/relativeTime.js'
	dayjs.extend(duration)
	dayjs.extend(relativeTime)

	import Stat from '$lib/components/Stat.svelte'

	import type { Leaderboard, LogElement, WrappedGame } from '$lib/modules/novablitz'
	import { newRating, numSARAHWinsNeededToRating, SARAH_RATING } from '$lib/modules/elo'

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

	const filteredGames = richGames.filter((game) => game.Format !== 'Challenge')

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
	const numGamesToSample = 25
	const averageGameTime =
		filteredGames
			.slice(0, numGamesToSample)
			.reduce((acc, cur) => acc - cur.Duration.asSeconds(), 0) /
			numGamesToSample +
		AVG_DOWNTIME_BTWN_GAMES

	const numWins = filteredGames.filter((game) => game.IsPlayerWinner).length
	const numLosses = filteredGames.length - numWins

	// DESMOS DATA
	/*
	console.log(filteredGames.map((game) => {
		return `${Math.abs((game.OpponentPlayerData.rating) - game.PlayerPlayerData.rating)},${game.IsPlayerWinner ? game.RatingInformation.ratingChange : -game.RatingInformation.ratingChange * 2}`
	}).join('\n'))
	*/

	const leaderBoardEntryToRoad = (leaderboardEntry: Leaderboard[number]): string => {
		if (leaderboardEntry.PlayFabId === playerId) return 'You!'
		let numSARAHWinsNeeded
		if (leaderboardEntry.StatValue >= currentRating) {
			numSARAHWinsNeeded = numSARAHWinsNeededToRating(currentRating, leaderboardEntry.StatValue)
		} else {
			numSARAHWinsNeeded = numSARAHWinsNeededToRating(leaderboardEntry.StatValue, currentRating)
		}
		const estimatedTimeNeeded = dayjs.duration(numSARAHWinsNeeded * averageGameTime, 'seconds')
		return `${numSARAHWinsNeeded} Wins / ${estimatedTimeNeeded.asHours().toFixed(2)} hrs`
	}
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

<div class="stack horizontal">
	<div class="card"><Stat label="Current Rating" value={currentRating} /></div>
	<div class="card">
		<Stat
			label="S.A.R.A.H. Rating Change"
			value={`+${Math.floor(newRating(currentRating, SARAH_RATING, true)) - currentRating} / ${
				Math.floor(newRating(currentRating, SARAH_RATING, false)) - currentRating
			}`}
		/>
	</div>
	<div class="card">
		<Stat label="Win Record" value={`${numWins}W / ${numLosses}L`} />
	</div>
</div>
<div class="spacer" />
<div class="table-wrapper">
	<table class="table">
		<thead>
			<tr>
				<th>#</th>
				<th>Rating</th>
				<th>Name</th>
				<th>Road</th>
			</tr>
		</thead>
		<tbody>
			{#each leaderboard.slice(0, 10) as leaderboardEntry, idx}
				<tr>
					<td><b>{leaderboardEntry.Position + 1}</b></td>
					<td
						>{leaderboardEntry.StatValue}
						<b>(+{leaderboardEntry.StatValue - leaderboard[idx + 1]?.StatValue})</b></td
					>
					<td><b>{leaderboardEntry.DisplayName}</b></td>
					<td>{leaderBoardEntryToRoad(leaderboardEntry)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
<div class="spacer" />
<div class="table-wrapper">
	<table class="table">
		<thead>
			<tr>
				<th>Time</th>
				<th>Versus</th>
				<th>Length</th>
				<th>Rating Change</th>
				<th>Ratings</th>
			</tr>
		</thead>
		<tbody>
			{#each filteredGames as game}
				<tr>
					<td>{dayjs.duration(game.EndTime.diff(now)).humanize(true)}</td>
					<td><b>{game.OpponentPlayerData.displayName}</b></td>
					<td>{game.Duration.humanize()}</td>
					<td
						>{game.IsPlayerWinner ? '+' : ''}{Math.round(game.RatingInformation.ratingChange)} ({Math.floor(
							newRating(
								game.PlayerPlayerData.rating,
								game.OpponentPlayerData.rating,
								game.IsPlayerWinner
							) - game.PlayerPlayerData.rating
						)})</td
					>
					<td
						>{game.PlayerPlayerData.rating}
						/ {game.OpponentPlayerData.rating}</td
					>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	div.spacer {
		height: 1rem;
	}

	div.stack {
		display: flex;
	}

	.stack.horizontal {
		flex-direction: row;
	}

	.stack.horizontal > * {
		margin-right: 1rem;
	}

	div.card {
		border: 1px solid var(--color-primary);
		border-radius: 0.25rem;
		padding: 1rem;
	}

	.table-wrapper {
		border: 1px solid var(--color-primary);
		border-radius: 0.25rem;
	}

	table.table {
		border-collapse: collapse;
		text-align: center;
		width: 100%;
	}

	table.table th {
		font-weight: 600;
		font-size: 1.25rem;
	}

	table.table td,
	th {
		padding: 0.5rem 0.5rem;
	}

	table.table thead > tr {
		border-bottom: 1px solid var(--color-primary);
	}

	table.table tr:nth-child(even) {
		background-color: var(--color-background-secondary);
	}

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
