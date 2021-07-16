import Datastore from 'nedb'
import path from 'path'
import fs from 'fs'
import os from 'os'

import { fetchGames } from '$lib/modules/novablitz'

const configDirectory = path.join(os.homedir(), '.novatracker')

if (!fs.existsSync(configDirectory)) {
	fs.mkdirSync(configDirectory)
}

const db = new Datastore({ filename: path.join(configDirectory, 'db') })
db.loadDatabase()

export const persistGames = (): void => {
	db.find({}, { _id: 1, StartTime: 1 }, (_, documents) => {
		const _ids = new Set(documents.map((document) => document._id))
		db.insert(fetchGames().filter((game) => !_ids.has(game._id)))
	})
}
persistGames()

export default db
