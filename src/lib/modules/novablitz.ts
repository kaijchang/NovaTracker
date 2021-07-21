import fetch from 'node-fetch'
import process from 'process'
import crypto from 'crypto'
import path from 'path'
import os from 'os'
import fs from 'fs'

import { variables } from '$lib/variables'

type GameFormat = 'Casual' | 'Draft' | 'Challenge'

interface PlayerData {
	oldQps: number
	hasWon: boolean
	playFabId: string
	avatarArtId: string
	cardBackArtId: string
	displayName: string
	tournamentData: {
		DeckList: []
	}
	format: GameFormat
}

interface PlayerPlayerData extends PlayerData {
	oldRating: number
	rating: number
	qps: number
	winStreak: number
	rank: number
	wins: number
}

interface OpponentPlayerData extends PlayerData {
	oldRating?: number
	rating?: number
	qps?: number
	winStreak?: number
	rank?: number
	wins?: number
}

// TODO
type PlayerId = 1 | 2
type EventType = string
type Phase = string
type DateTimeString = string

export interface LogElement {
	RelevantEvents: []
	SelfId: PlayerId
	OppId: PlayerId
	EventType: EventType
	Phase: Phase
	Turn: number
	LogTime: DateTimeString
	SelfHealth: number
	OppHealth: number
	// TODO
}

interface Game {
	LogElements: LogElement[]
	Format: GameFormat
	StartTime: DateTimeString
	IsPlayerWinner: boolean
	PlayerPlayerData: PlayerPlayerData
	OpponentPlayerData: OpponentPlayerData
}

export interface WrappedGame extends Game {
	_id: string
}

interface LeaderboardEntry {
	PlayFabId: string
	DisplayName: string
	StatValue: number
	Position: number
	Profile: {
		PublisherId: string
		TitleId: string
		PlayerId: string
		DisplayName: string
	}
}

export type Leaderboard = LeaderboardEntry[]

let gameDataDirectory
const logDirectory = variables.PLAYFAB_ID
// let cardFile

if (process.platform == 'darwin') {
	gameDataDirectory = path.join(
		os.homedir(),
		'Library/Application Support/com.dragonfoundry.novablitz'
	)
} else if (process.platform === 'win32') {
	gameDataDirectory = path.join(os.homedir(), 'AppData\\LocalLow\\Dragon Foundry\\NovaBlitz')
}

/*
fs.readdirSync(gameDataDirectory).forEach((file) => {
	if (/^[A-Z0-9]{16}$/.test(file)) {
		logDirectory = file
	} else if (
		/^[0-9]-[0-9]{2}-[0-9]_client_card_[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$/.test(
			file
		)
	) {
		cardFile = file
	}
})
*/

const generateGameId = (game: Game) => {
	return crypto.createHash('sha256').update(JSON.stringify(game)).digest('hex')
}

export const fetchGames = (): WrappedGame[] => {
	const games: Game[] = JSON.parse(
		fs.readFileSync(path.join(gameDataDirectory, logDirectory, 'game_log_file.json'), 'utf8')
	)
	return games.map((game) => ({
		...game,
		_id: generateGameId(game),
	}))
}

export const fetchLeaderboard = async (): Promise<Leaderboard> => {
	const res = await fetch('https://721f.playfabapi.com/Client/GetLeaderboard', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Authorization': variables.AUTHORIZATION_TOKEN,
		},
		body: JSON.stringify({ StatisticName: '2021_7_rating', StartPosition: 0, MaxResultsCount: 50 }),
	})

	return (await res.json())['data']['Leaderboard']
}
