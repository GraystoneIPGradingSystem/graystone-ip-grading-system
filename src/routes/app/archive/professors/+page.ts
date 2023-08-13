// IMPORTED LIB-TYPES
import type { PageLoad } from './$types';
// IMPORTED UTILS
import { selectAccounts } from '$utils/supabase';

export const load = (async () => {
	const professors = await selectAccounts({ type: 'professor', is_archived: true });
	return { professors };
}) satisfies PageLoad;
