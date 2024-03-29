<script lang="ts">
	// IMPORTED LIB-TYPES
	import type { Row } from 'write-excel-file';
	// IMPORTED TYPES
	import type {
		AdvanceCriteria,
		AdvanceCriteriaItem,
		CourseStudentData,
		CriteriaData,
		CriteriaGradeData,
		CriteriaItemData,
	} from '$types/curriculum';
	// IMPORTED LIB-UTILS
	import { page } from '$app/stores';
	import writeXlsxFile from 'write-excel-file';
	// IMPORTED UTILS
	import {
		createConfirmationModal,
		createCustomModal,
		createErrorModal,
		createLoadingModal,
		createSuccessModal,
		removeCustomModal,
		removeModal,
	} from '$stores/modalStates';
	import { generateId } from '$utils/helpers';
	import { modifiedCriterias, modifiedCriteriaItems, handleReset } from './ScoreItem.svelte';
	import { insertCriteriaGrade, updateCriteriaGrade, updateCriteriaGradeScore } from '$utils';
	// IMPORTED LIB-COMPONENTS
	import { Button, Tooltip } from 'flowbite-svelte';
	// IMPORTED COMPONENTS
	import CriteriaItemEditorModal from './CriteriaItemEditorModal.svelte';
	import CriteriaGradeAdderModal from './CriteriaGradeAdderModal.svelte';
	import CriteriaGradeEditorModal from './CriteriaGradeEditorModal.svelte';
	import ScoreItem from './ScoreItem.svelte';
	import NewScoreItem from './NewScoreItem.svelte';

	// PROPS
	export let advance_criterias: AdvanceCriteria[],
		course_students: CourseStudentData[],
		criteria_grades: CriteriaGradeData[],
		term: string,
		isLoading: boolean,
		openCriteriaEditorModal: (criteria: CriteriaData) => void,
		handleSearch: () => Promise<void>;

	// STATES
	let maximizedIds: string[] = [];

	// MODAL STATES
	let modalId = generateId();
	let modals = { itemEditor: false, gradeAdder: false, gradeEditor: false };
	let itemEditorTarget: CriteriaItemData | null = null;
	let gradeAdderTarget: [CriteriaItemData, CourseStudentData] | null = null;
	let gradeEditorTarget: [CriteriaItemData, CriteriaGradeData] | null = null;

	// MODAL UTILS
	const openItemEditorModal = (target: CriteriaItemData) => {
		createCustomModal(modalId);
		modals.itemEditor = true;
		itemEditorTarget = target;
	};
	const closeItemEditorModal = () => {
		modals.itemEditor = false;
		removeCustomModal(modalId);
	};
	const openGradeAdderModal = (target: [CriteriaItemData, CourseStudentData]) => {
		createCustomModal(modalId);
		modals.gradeAdder = true;
		gradeAdderTarget = target;
	};
	const closeGradeAdderModal = () => {
		modals.gradeAdder = false;
		removeCustomModal(modalId);
	};
	const closeGradeEditorModal = () => {
		modals.gradeEditor = false;
		removeCustomModal(modalId);
	};

	// UTILS
	const handleMaximize = (id: string) => {
		maximizedIds = [...maximizedIds, id];
	};
	const handleMinimize = (id: string) => {
		maximizedIds = maximizedIds.filter((id_) => id_ !== id);
	};
	const getTotalPercentage = (
		advance_criteria_items: AdvanceCriteriaItem[],
		criteria_percentage: number,
		course_student_id: string,
	) => {
		let gradesPercentage: number[] = [];
		let used_criteria_items_ids: string[] = [];
		advance_criteria_items.map(({ criteria_item }) =>
			criteria_grades
				.filter(
					(criteria_grades) =>
						criteria_grades.criteria_item_id === criteria_item.id &&
						criteria_grades.course_student_id === course_student_id,
				)
				.map((criteria_grade) => {
					const percentage = (criteria_grade.score / criteria_item.total) * 100;
					gradesPercentage.push(percentage);
					used_criteria_items_ids.push(criteria_item.id);
				}),
		);
		advance_criteria_items.map(({ criteria_item }) => {
			if (!used_criteria_items_ids.includes(criteria_item.id)) {
				const percentage = 0 * 100;
				gradesPercentage.push(percentage);
				used_criteria_items_ids.push(criteria_item.id);
			}
		});
		const average = gradesPercentage.length
			? gradesPercentage.reduce((a, b) => a + b) / gradesPercentage.length
			: 0;
		return average * (criteria_percentage / 100);
	};
	const getGrade = (advance_criterias: AdvanceCriteria[], course_student_id: string) => {
		let grade = 0;
		advance_criterias.map(({ criteria, advance_criteria_items }) => {
			const percentage = getTotalPercentage(
				advance_criteria_items,
				criteria.percentage,
				course_student_id,
			);
			grade += percentage;
		});
		return grade;
	};
	const handleExport = async () => {
		try {
			const tableEl = document.getElementById('table') as HTMLTableElement;
			if (!tableEl) throw new Error('Failed to get table data!');
			const rows: Row[] = [];
			for (let i = 0; i < tableEl.rows.length; i++) {
				if (i === 0) continue;
				const row = tableEl.rows[i];
				const row_data: Row = [];
				for (let j = 0; j < row.cells.length; j++) {
					const cell = row.cells[j];
					row_data.push({
						value: cell.innerText,
						span: cell.colSpan,
						align: i === 1 ? 'center' : 'left',
						fontWeight: i === 1 || i === 2 ? 'bold' : undefined,
						backgroundColor: i === 1 ? '#60a5fa' : i === 2 ? '#bfdbfe' : undefined,
						borderColor: i === 1 || i === 2 ? '#3b82f6' : undefined,
					});
					if (cell.colSpan > 1)
						Array(cell.colSpan - 1)
							.fill(null)
							.map(() => row_data.push(null));
				}
				rows.push(row_data);
			}
			await writeXlsxFile([...rows], {
				fileName: `${$page.data.courseClass.name} - ${term}.xlsx`,
			});
		} catch (error: any) {
			createErrorModal({ message: error.message });
		}
	};
	const handleToggle = (criteria_id: string) => {
		if (maximizedIds.includes(criteria_id)) {
			if ($modifiedCriterias.includes(criteria_id))
				createConfirmationModal({
					message: 'Are you sure you want to proceed without saving the changes?',
					handleProceed: () => handleMinimize(criteria_id),
				});
			else handleMinimize(criteria_id);
		} else handleMaximize(criteria_id);
	};
	const handleSave = async () => {
		const id = createLoadingModal({ message: 'Saving changes...' });
		try {
			for (let item of $modifiedCriteriaItems) {
				if (item.course_student_id) {
					const created_at = Date.now();
					if (!item.course_class_id || !item.course_student_id) continue;
					await insertCriteriaGrade({
						id: item.criteria_grade_id,
						course_class_id: item.course_class_id,
						criteria_item_id: item.criteria_item_id,
						course_student_id: item.course_student_id,
						score: item.score,
						created_at,
					});
				} else await updateCriteriaGradeScore(item.criteria_grade_id, item.score);
			}
			await handleSearch();
			handleReset();
		} catch (error: any) {
			createErrorModal({ message: error.message });
		}
		removeModal(id);
	};
</script>

{#if $modifiedCriteriaItems.length}
	<Button
		class={`w-[48px] h-[48px] shadow-md fixed bottom-[16px] right-[148px] z-20}`}
		pill={true}
		disabled={isLoading}
		on:click={() =>
			createConfirmationModal({
				message: 'Are you sure you want to save the changes?',
				handleProceed: handleSave,
			})}
	>
		<i class="ph-bold ph-download-simple text-xl" />
	</Button>
	<Tooltip class="text-xs whitespace-nowrap z-[100]" color="light" placement="top">Save</Tooltip>
{/if}

<Button
	class={`w-[48px] h-[48px] shadow-md fixed bottom-[16px] right-[82px] z-20}`}
	pill={true}
	disabled={isLoading}
	on:click={() =>
		createConfirmationModal({
			message: 'Are you sure you want to export the grades?',
			handleProceed: handleExport,
		})}
>
	<i class="ph-bold ph-export text-xl" />
</Button>
<Tooltip class="text-xs whitespace-nowrap z-[100]" color="light" placement="top">Export</Tooltip>

<div class="flex flex-col gap-2">
	<div class="overflow-auto border-r">
		<table id="table" class="text-center w-full">
			<thead>
				{#if advance_criterias.length}
					<tr>
						<th colspan="5">
							<div class="flex-center gap-2 p-2">
								<span class="w-3 h-3 border rounded-[4px] bg-gray-400" />
								<p class="text-xs">Modified</p>
							</div>
						</th>
						{#each advance_criterias as advance_criteria}
							<th
								colspan={maximizedIds.includes(advance_criteria.criteria.id)
									? advance_criteria.advance_criteria_items.length
									: 1}
							>
								<Button
									class="p-1 rounded-sm"
									size="sm"
									on:click={() => handleToggle(advance_criteria.criteria.id)}
								>
									<i
										class="ph-bold ph-corners-{maximizedIds.includes(
											advance_criteria.criteria.id,
										)
											? 'in'
											: 'out'} text-[10px]"
									/>
								</Button>
							</th>
						{/each}
						<th />
					</tr>
					<tr>
						<th colspan="5"><p>&nbsp;</p></th>
						{#each advance_criterias as advance_criteria}
							<th
								colspan={maximizedIds.includes(advance_criteria.criteria.id)
									? advance_criteria.advance_criteria_items.length
									: 1}
								data-input
								on:click={() => openCriteriaEditorModal(advance_criteria.criteria)}
							>
								<p class="flex-center gap-1">
									{advance_criteria.criteria.name}
									<span class="text-[9px]"
										>({advance_criteria.criteria.percentage}%)</span
									>
								</p>
							</th>
						{/each}
						<th />
					</tr>
				{/if}
				<tr class="bg-slate-100">
					<th><p>#</p></th>
					<th class="text-left"><p>Student ID</p></th>
					<th class="text-left"><p>Last Name</p></th>
					<th class="text-left"><p>First Name</p></th>
					<th class="text-left"><p>Middle Name</p></th>
					{#each advance_criterias as advance_criteria}
						{#if maximizedIds.includes(advance_criteria.criteria.id)}
							{#if advance_criteria.advance_criteria_items.length}
								{#each advance_criteria.advance_criteria_items.sort((a, b) => a.criteria_item.created_at - b.criteria_item.created_at) as advance_criteria_item}
									<th
										class="text-center"
										data-input
										on:click={() =>
											openItemEditorModal(
												advance_criteria_item.criteria_item,
											)}
									>
										<p class="flex-center gap-1">
											{advance_criteria_item.criteria_item.name}
											<span class="text-[9px]">
												({advance_criteria_item.criteria_item
													.total}pt{advance_criteria_item.criteria_item
													.total > 1
													? 's'
													: ''})
											</span>
										</p>
									</th>
								{/each}
							{:else}
								<th class="text-center" data-input><p>No Data</p></th>
							{/if}
						{:else}
							<th class="text-center" data-input>
								<p>{advance_criteria.criteria.percentage}%</p>
							</th>
						{/if}
					{/each}
					<th><p>{term} GRADE</p></th>
				</tr>
			</thead>
			<tbody>
				{#each course_students as course_student, i (course_student.id)}
					<tr>
						<td class="text-center"><p>{i + 1}</p></td>
						<td class="text-left"><p>{course_student.student_record.account.id}</p></td>
						<td class="text-left"
							><p>{course_student.student_record.account.last_name}</p></td
						>
						<td class="text-left">
							<p>{course_student.student_record.account.first_name}</p>
						</td>
						<td class="text-left">
							<p>{course_student.student_record.account.middle_name}</p>
						</td>
						{#each advance_criterias as advance_criteria (advance_criteria.criteria.id)}
							{#if maximizedIds.includes(advance_criteria.criteria.id)}
								{#if advance_criteria.advance_criteria_items.length}
									{#each advance_criteria.advance_criteria_items.sort((a, b) => a.criteria_item.created_at - b.criteria_item.created_at) as advance_criteria_item (advance_criteria_item.criteria_item.id)}
										{#if advance_criteria_item.criteria_grades.filter((criteria_grade) => criteria_grade.course_student_id === course_student.id).length}
											{#each advance_criteria_item.criteria_grades as criteria_grade (criteria_grade.id)}
												{#if criteria_grade.course_student_id === course_student.id}
													<ScoreItem
														{criteria_grade}
														criteria_id={advance_criteria.criteria.id}
													/>
												{/if}
											{/each}
										{:else}
											<NewScoreItem
												criteria_id={advance_criteria.criteria.id}
												criteria_item={advance_criteria_item.criteria_item}
												course_class_id={advance_criteria.criteria
													.course_class_id}
												course_student_id={course_student.id}
											/>
										{/if}
									{/each}
								{:else}
									<td class="text-center" data-input><p /></td>
								{/if}
							{:else}
								<td class="text-center" data-input>
									<p>
										{getTotalPercentage(
											advance_criteria.advance_criteria_items,
											advance_criteria.criteria.percentage,
											course_student.id,
										).toFixed(2)}%
									</p>
								</td>
							{/if}
						{/each}
						<td>
							<p>
								{#if isLoading}
									...
								{:else}
									{getGrade(advance_criterias, course_student.id).toFixed(2)}%
								{/if}
							</p>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#if itemEditorTarget && modals.itemEditor}
	<CriteriaItemEditorModal
		{handleSearch}
		criteria_item={itemEditorTarget}
		handleClose={closeItemEditorModal}
	/>
{/if}
{#if gradeAdderTarget && modals.gradeAdder}
	<CriteriaGradeAdderModal
		{handleSearch}
		criteria_item={gradeAdderTarget[0]}
		course_student={gradeAdderTarget[1]}
		handleClose={closeGradeAdderModal}
	/>
{/if}
{#if gradeEditorTarget && modals.gradeEditor}
	<CriteriaGradeEditorModal
		{handleSearch}
		criteria_item={gradeEditorTarget[0]}
		criteria_grade={gradeEditorTarget[1]}
		handleClose={closeGradeEditorModal}
	/>
{/if}

<style lang="scss">
	table,
	th,
	td {
		@apply text-xs border min-w-[60px] whitespace-nowrap;
		&[data-input] {
			@apply cursor-pointer hover:outline outline-1 outline-blue-500;
		}
		& > p {
			@apply p-2;
		}
	}
	th {
		@apply font-semibold;
	}
	table {
		@apply border-r-0;
	}
	thead {
		th:last-child {
			@apply border-r-0;
		}
	}
	tbody {
		td:last-child {
			@apply border-r-0;
		}
		tr:last-child {
			td[data-input] {
				@apply hover:border-b-blue-500;
			}
		}
		tr:nth-child(even) {
			@apply bg-gray-50;
		}
	}
</style>
