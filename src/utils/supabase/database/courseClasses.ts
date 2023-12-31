// IMPORTED TYPES
import type { CourseClass, CourseClassData } from '$types/curriculum';
// IMPORTED UTILS
import { supabase, updateCourseStudentSearchKey } from '..';

// UTILS
export const insertCourseClass = async (courseClass: CourseClass) => {
	const { error } = await supabase.from('course_classes').insert(courseClass);
	if (error) throw new Error(error.message);
};
export const selectCourseClass = async (id: string) => {
	const { data, error } = await supabase
		.from('course_classes')
		.select('*, instructor: accounts(*), course: courses(*)')
		.match({ id });
	if (error) throw new Error(error.message);
	if (!data || !data.length) throw new Error('Class not found!');
	return data[0] as unknown as CourseClassData;
};
export const selectCourseClasses = async ({
	search,
	semester,
	school_year,
	instructor_id,
}: {
	search?: string;
	semester?: string;
	school_year?: string;
	instructor_id?: string;
}) => {
	let query = supabase
		.from('course_classes')
		.select('*, instructor: accounts(*), course: courses(*)')
		.order('name');
	if (semester) query.match({ semester });
	if (school_year) query.match({ school_year });
	if (instructor_id) query.match({ instructor_id });
	if (search) query.ilike('name', `%${search}%`);
	const { data, error } = await query;
	if (error) throw new Error(error.message);
	return (data as unknown as CourseClassData[]) || [];
};
export const deleteCourseClass = async (id: string) => {
	const { error } = await supabase.from('course_classes').delete().match({ id });
	if (error) throw new Error(error.message);
};
export const updateCourseClass = async (courseClass: CourseClass) => {
	const { error } = await supabase
		.from('course_classes')
		.update(courseClass)
		.match({ id: courseClass.id });
	if (error) throw new Error(error.message);
	await updateCourseStudentSearchKey(courseClass.id, courseClass.name);
};
export const getInstructorCourseClassesCount = async (instructor_id: string) => {
	const { count } = await supabase
		.from('course_classes')
		.select('*', { count: 'exact', head: true })
		.match({ instructor_id });
	return count || 0;
};
