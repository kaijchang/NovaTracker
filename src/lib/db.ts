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

db.insert(fetchGames())

export default db
