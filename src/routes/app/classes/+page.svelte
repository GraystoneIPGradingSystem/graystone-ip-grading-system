<script lang="ts">
	// IMPORTED TYPES
	import type {
		Column,
		ColumnItem,
		FilterGroup,
		RowItem,
		RowTool,
		SortItem,
		TableTool,
	} from '$components/modules/InteractiveTable';
	import type { CourseClassData } from '$types/index';
	// IMPORTED LIB-UTILS
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	// IMPORTED UTILS
	import {
		createConfirmationModal,
		createCustomModal,
		createErrorModal,
		createLoadingModal,
		createSuccessModal,
		createVerificationModal,
		removeCustomModal,
		removeModal,
	} from '$stores/modalStates';
	import { decrypt, encrypt, generateId } from '$utils';
	import { getDefaultFilter } from '$utils/config';
	import { deleteCourseClass, selectCourseClasses } from '$utils/supabase';
	// IMPORTED COMPONENTS
	import Header from '$components/layouts/Header';
	import InteractiveTable from '$components/modules/InteractiveTable/InteractiveTable.svelte';
	import CourseClassAdderModal from './components/CourseClassAdderModal.svelte';
	import CourseClassEditorModal from './components/CourseClassEditorModal.svelte';

	// PROPS
	export let data: any;

	// STATES
	let items: CourseClassData[] = [];
	let search = '';
	let loading = false;
	let initialized = false;
	let localStorageKey = 'config.classes_v3';

	// MODAL STATES
	let modalId = generateId();
	let modals = { adder: false, editor: false };
	let target: CourseClassData | null = null;

	// MODAL UTILS
	const openAdderModal = () => {
		modals.adder = true;
		createCustomModal(modalId);
	};
	const closeAdderModal = () => {
		modals.adder = false;
		removeCustomModal(modalId);
	};
	const openEditorModal = (courseClass: CourseClassData) => {
		createCustomModal(modalId);
		modals.editor = true;
		target = courseClass;
	};
	const closeEditorModal = () => {
		modals.editor = false;
		removeCustomModal(modalId);
	};

	// TABLE STATES
	let columns: Column[] = [
		{ name: 'thumbnail', label: 'Thumbnail', visible: true },
		{ name: 'name', label: 'Class Name', visible: true },
		{ name: 'instructor', label: 'Instructor', visible: true },
		{ name: 'instructor_avatar', label: 'Instructor Avatar', visible: true },
		{ name: 'course', label: 'Course', visible: true },
		{ name: 'semester', label: 'Semester', visible: true },
		{ name: 'school_year', label: 'School Year', visible: true },
		{ name: 'created_at', label: 'Enrolled At', visible: true },
	];
	let sortItems: SortItem[] = [
		{ name: 'name', label: 'Class Name', type: 'asc' },
		{ name: 'instructor', label: 'Instructor', type: 'none' },
		{ name: 'course', label: 'Course', type: 'none' },
		{ name: 'semester', label: 'Semester', type: 'none' },
		{ name: 'school_year', label: 'School Year', type: 'none' },
		{ name: 'created_at', label: 'Enrolled At', type: 'none' },
	];
	let filterGroups: FilterGroup[] = [
		{
			label: 'Semester',
			name: 'semester',
			items: [
				{ label: '1st', match: '1st', active: true },
				{ label: '2nd', match: '2nd', active: true },
			],
		},
		{
			label: 'School Year',
			name: 'school_year',
			items: [
				{ label: '2023-2024', match: '2023-2024', active: false },
				{ label: '2024-2025', match: '2024-2025', active: false },
				{ label: '2025-2026', match: '2025-2026', active: false },
				{ label: '2026-2027', match: '2026-2027', active: false },
				{ label: '2027-2028', match: '2027-2028', active: false },
			],
		},
	];
	$: rowItems = items.map((item) => {
		const columnItems: ColumnItem[] = [
			{ name: 'thumbnail', label: 'Thumbnail', value: item.thumbnail },
			{ name: 'name', label: 'Class Name', value: item.name },
			{ name: 'instructor', label: 'Instructor', value: item.instructor.full_name },
			{
				name: 'instructor_avatar',
				label: 'Instructor Avatar',
				value: item.instructor.avatar,
			},
			{ name: 'course', label: 'Course', value: item.course.code },
			{ name: 'semester', label: 'Semester', value: item.semester },
			{ name: 'school_year', label: 'School Year', value: item.school_year },
			{
				name: 'created_at',
				label: 'Enrolled At',
				value: new Date(item.created_at).toDateString(),
			},
		];
		const tools: RowTool[] = [
			{
				label: 'View Class',
				icon: 'ph-bold ph-eye',
				href: `/app/classes/class?instructor_id=${item.instructor.id}&course_class_id=${item.id}`,
			},
			{
				label: 'Edit Class',
				icon: 'ph-bold ph-pen',
				handleClick: () => openEditorModal(item),
			},
			{
				label: 'Delete Class',
				icon: 'ph-bold ph-trash',
				handleClick: () =>
					createConfirmationModal({
						message: 'Are you sure you want to delete this class?',
						handleProceed: () =>
							createVerificationModal({
								handleProceed: () => handleDelete(item.id),
							}),
					}),
			},
		];
		return {
			columnItems,
			tools,
			href: `/app/classes/class?instructor_id=${item.instructor.id}&course_class_id=${item.id}`,
		} as RowItem;
	});
	let tableTools: TableTool[] = [{ icon: 'ph-bold ph-plus', handleClick: openAdderModal }];

	// REACTIVE STATES
	$: {
		// SAVE CHANGES TO LOCAL STORAGES
		columns;
		sortItems;
		saveData();
	}

	// UTILS
	const saveData = () => {
		if (typeof localStorage === 'undefined' || !initialized) return;
		const data = JSON.stringify({ columns, sortItems });
		const encrypted = encrypt(data);
		localStorage.setItem(localStorageKey, encrypted);
	};
	const loadData = () => {
		try {
			if (typeof localStorage === 'undefined') throw new Error();
			const encrypted = localStorage.getItem(localStorageKey);
			if (!encrypted) throw new Error();
			const decrypted = decrypt(encrypted);
			if (!decrypted) throw new Error();
			const data = JSON.parse(decrypted);
			if (data.columns) columns = data.columns;
			if (data.sortItems) sortItems = data.sortItems;
		} catch {}
		initialized = true;
	};
	const handleRefresh = async () => {
		loading = true;
		try {
			items = await selectCourseClasses({
				search,
				instructor_id: $page.data.instructor.id,
			});
		} catch (error: any) {
			createErrorModal({ message: error.message });
		}
		loading = false;
	};
	const handleDelete = async (id: string) => {
		loading = true;
		const modalId = createLoadingModal({ message: 'Deleting class...' });
		try {
			await deleteCourseClass(id);
			await handleRefresh();
			createSuccessModal({ message: 'Class was deleted successfully!' });
		} catch (error: any) {
			createErrorModal({ message: error.message });
		}
		removeModal(modalId);
		loading = false;
	};

	// LIFECYCLES
	onMount(() => {
		if (data.courseClasses) items = data.courseClasses;

		loadData();

		const defaultFilter = getDefaultFilter();

		filterGroups = filterGroups.map((filterGroup) => {
			if (filterGroup.name === 'semester') {
				filterGroup.items = filterGroup.items.map((item) => {
					item.active = item.match === defaultFilter.semester;
					return item;
				});
			}

			if (filterGroup.name === 'school_year') {
				filterGroup.items = filterGroup.items.map((item) => {
					item.active = item.match === defaultFilter.school_year;
					return item;
				});
			}

			return filterGroup;
		});
	});
</script>

<Header
	breadcrumbItems={[
		{ icon: 'ph-bold ph-chalkboard', label: 'Classes', href: '' },
		{ label: $page.data.instructor.full_name, href: $page.url.pathname + $page.url.search },
	]}
/>

{#if modals.adder}
	<CourseClassAdderModal handleClose={closeAdderModal} {handleRefresh} />
{/if}
{#if target}
	{#if modals.editor}
		<CourseClassEditorModal
			courseClass={target}
			handleClose={closeEditorModal}
			{handleRefresh}
		/>
	{/if}
{/if}

<InteractiveTable
	bind:columns
	bind:sortItems
	bind:filterGroups
	bind:tableTools
	bind:loading
	type="thumbnail"
	{...{ rowItems, handleRefresh }}
/>
