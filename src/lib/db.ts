import Datastore from 'nedb-promises'
import path from 'path'
import fs from 'fs'
import os from 'os'

import { fetchGames, WrappedGame } from '$lib/modules/novablitz'
import { variables } from '$lib/variables'

const configDirectory = path.join(os.homedir(), '.novatracker')

if (!fs.existsSync(configDirectory)) {
	fs.mkdirSync(configDirectory)
}

export const persistGames = async (): Promise<WrappedGame[]> => {
	const documents = await db.find({}, { _id: 1, StartTime: 1 })
	const _ids = new Set(documents.map((document) => document._id))
	return await db.insert(
		fetchGames().filter(
			(game) => !_ids.has(game._id) && game.PlayerPlayerData.playFabId === variables.PLAYFAB_ID
		)
	)
}

const db = Datastore.create({ filename: path.join(configDirectory, 'db') })

db.load()
	.then(persistGames)
	.then(() => console.log('fetched and persisted games'))
	.catch((err) => console.error(`error fetching or persisting games: ${err.toString()}`))
export default db
