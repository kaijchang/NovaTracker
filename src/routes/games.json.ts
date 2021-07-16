import type { RequestHandler } from '@sveltejs/kit'

import db, { persistGames } from '$lib/db'

export const get: RequestHandler = async () => {
	await persistGames()
	console.log('refetched and persisted games')
	const documents = await db.find({})
	return {
		body: documents,
	}
}
