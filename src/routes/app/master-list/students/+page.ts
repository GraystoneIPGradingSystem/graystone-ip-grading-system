// IMPORTED LIB-TYPES
import type { PageLoad } from './$types';
// IMPORTED UTILS
import { selectAccounts, selectCourses, selectPrograms } from '$utils/supabase';

export const load = (async () => {
	const students = await selectAccounts({ type: 'student' });
	const programs = await selectPrograms({});
	const courses = await selectCourses({});
	return { students, programs, courses };
}) satisfies PageLoad;
