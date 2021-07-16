import type { RequestHandler } from '@sveltejs/kit'
import type { JSONValue } from '@sveltejs/kit/types/endpoint'

import { fetchLeaderboard } from '$lib/modules/novablitz'

export const get: RequestHandler = async () => {
	return {
		body: ((await fetchLeaderboard()) as unknown) as JSONValue,
	}
}
