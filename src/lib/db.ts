import Datastore from 'nedb-promises'
import path from 'path'
import fs from 'fs'
import os from 'os'

import { fetchGames, WrappedGame } from '$lib/modules/novablitz'

const configDirectory = path.join(os.homedir(), '.novatracker')

if (!fs.existsSync(configDirectory)) {
	fs.mkdirSync(configDirectory)
}

const db = new Datastore({ filename: path.join(configDirectory, 'db') })

export const persistGames = async (): Promise<WrappedGame[]> => {
	const documents = await db.find({}, { _id: 1, StartTime: 1 })
	const _ids = new Set(documents.map((document) => document._id))
	return await db.insert(fetchGames().filter((game) => !_ids.has(game._id)))
}

persistGames()
	.then(() => console.log('fetched and persisted games'))
	.catch((err) => console.error(`error fetching or persisting games: ${err.toString()}`))

export default db
