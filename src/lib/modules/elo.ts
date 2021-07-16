const K = 600

export const SARAH_RATING = 10000

// Empirically from https://www.desmos.com/calculator/er7d9a7umm
export const newRating = (playerRating: number, opponentRating: number, won: boolean): number => {
	const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 10000))
	return playerRating + (K * ((won ? 1 : 0) - expectedScore)) / (won ? 1 : 0.5)
}

export const numWinsSARAHNeededToRating = (currentRating: number, target: number): number => {
	let _currentRating = currentRating
	let numWins = 0
	while (_currentRating < target) {
		_currentRating = newRating(_currentRating, 10000, true)
		numWins++
	}
	return numWins
}
