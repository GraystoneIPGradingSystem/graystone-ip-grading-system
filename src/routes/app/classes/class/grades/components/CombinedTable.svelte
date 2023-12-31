<script lang="ts">
	// IMPORTED LIB-TYPES
	import type { Row } from 'write-excel-file';
	// IMPORTED TYPES
	import type {
		AdvanceCriteria,
		AdvanceCriteriaItem,
		CourseStudentData,
		CriteriaGradeData,
	} from '$types/curriculum';
	// IMPORTED LIB-UTILS
	import { page } from '$app/stores';
	import writeXlsxFile from 'write-excel-file';
	// IMPORTED UTILS
	import {
		createConfirmationModal,
		createErrorModal,
		createSuccessModal,
	} from '$stores/modalStates';
	// IMPORTED LIB-COMPONENTS
	import { Button, Tooltip } from 'flowbite-svelte';
	import { releaseGrade, unreleaseGrades } from '$utils/supabase';

	// PROPS
	export let advance_criterias: AdvanceCriteria[],
		course_students: CourseStudentData[],
		criteria_grades: CriteriaGradeData[],
		isLoading: boolean;

	// UTILS
	const getTotalPercentage = (
		advance_criteria_items: AdvanceCriteriaItem[],
		criteria_percentage: number,
		course_student_id: string,
	) => {
		let gradesPercentage: number[] = [];
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
				}),
		);
		const average = gradesPercentage.length
			? gradesPercentage.reduce((a, b) => a + b) / gradesPercentage.length
			: 0;
		return average * (criteria_percentage / 100);
	};
	const getMidTermGrade = (course_student_id: string) => {
		let midTermGrade = 0;
		advance_criterias
			.filter(({ criteria }) => criteria.term === 'MID TERM')
			.map(({ criteria, advance_criteria_items }) => {
				const percentage = getTotalPercentage(
					advance_criteria_items,
					criteria.percentage,
					course_student_id,
				);
				midTermGrade += percentage;
			});
		return midTermGrade;
	};
	const getFinalTermGrade = (course_student_id: string) => {
		let midTermGrade = 0;
		advance_criterias
			.filter(({ criteria }) => criteria.term === 'FINAL TERM')
			.map(({ criteria, advance_criteria_items }) => {
				const percentage = getTotalPercentage(
					advance_criteria_items,
					criteria.percentage,
					course_student_id,
				);
				midTermGrade += percentage;
			});
		return midTermGrade;
	};
	const getFinalGrade = (course_student_id: string) =>
		(getMidTermGrade(course_student_id) + getFinalTermGrade(course_student_id)) / 2;
	const getEquivalent = (course_student_id: string) => {
		const finalGrade = Math.round(getFinalGrade(course_student_id));
		if (finalGrade >= 98 && finalGrade <= 100) return 1.0;
		if (finalGrade >= 96 && finalGrade <= 97) return 1.25;
		if (finalGrade >= 93 && finalGrade <= 95) return 1.5;
		if (finalGrade >= 90 && finalGrade <= 92) return 1.75;
		if (finalGrade >= 87 && finalGrade <= 89) return 2.0;
		if (finalGrade >= 84 && finalGrade <= 86) return 2.25;
		if (finalGrade >= 81 && finalGrade <= 83) return 2.5;
		if (finalGrade >= 77 && finalGrade <= 80) return 2.75;
		if (finalGrade >= 75 && finalGrade <= 76) return 3.0;
		return 5.0;
	};
	const handleReleaseGrades = async () => {
		isLoading = true;
		try {
			await Promise.all(
				course_students.map(async (course_student) => {
					const grade = getEquivalent(course_student.id);
					await releaseGrade(
						$page.data.courseClass.id,
						course_student.id,
						grade.toString(),
					);
				}),
			);
			createSuccessModal({ message: 'Grades was released successfully!' });
		} catch (error: any) {
			createErrorModal({ message: error.message });
		}
		isLoading = false;
	};
	const handleUnreleaseGrades = async () => {
		isLoading = true;
		try {
			await unreleaseGrades($page.data.courseClass.id);
			createSuccessModal({ message: 'Grades was unreleased successfully!' });
		} catch (error: any) {
			createErrorModal({ message: error.message });
		}
		isLoading = false;
	};
	const handleExport = async () => {
		try {
			const tableEl = document.getElementById('table') as HTMLTableElement;
			if (!tableEl) throw new Error('Failed to get table data!');
			const rows: Row[] = [];
			for (let i = 0; i < tableEl.rows.length; i++) {
				const row = tableEl.rows[i];
				const row_data: Row = [];
				for (let j = 0; j < row.cells.length; j++) {
					const cell = row.cells[j];
					row_data.push({
						value: cell.innerText,
						fontWeight: i === 0 ? 'bold' : undefined,
						backgroundColor: i === 0 ? '#60a5fa' : undefined,
					});
				}
				rows.push(row_data);
			}
			await writeXlsxFile([...rows], {
				fileName: `${$page.data.courseClass.name} - COMBINED TERM.xlsx`,
			});
		} catch (error: any) {
			createErrorModal({ message: error.message });
		}
	};
</script>

<Button
	class={`w-[48px] h-[48px] shadow-md fixed bottom-[16px] right-[82px] z-20}`}
	pill={true}
	disabled={isLoading}
	on:click={() =>
		createConfirmationModal({
			message: 'Are you sure you want to unrelease the grades?',
			handleProceed: handleUnreleaseGrades,
		})}
>
	<i class="ph-bold ph-lock text-xl" />
</Button>
<Tooltip class="text-xs whitespace-nowrap" color="light" placement="top">Unrelease Grades</Tooltip>

<Button
	class={`w-[48px] h-[48px] shadow-md fixed bottom-[16px] right-[150px] z-20}`}
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

<Button
	class={`w-[48px] h-[48px] shadow-md fixed bottom-[16px] right-[16px] z-20}`}
	pill={true}
	disabled={isLoading}
	on:click={() =>
		createConfirmationModal({
			message: 'Are you sure you want to release the grades?',
			handleProceed: handleReleaseGrades,
		})}
>
	<i class="ph-bold ph-globe text-xl" />
</Button>
<Tooltip class="text-xs whitespace-nowrap z-[100]" color="light" placement="top">
	Release Grades
</Tooltip>

<div class="flex flex-col gap-2">
	<div class="overflow-auto border-r">
		<table id="table" class="text-center w-full">
			<thead>
				<tr class="bg-slate-100">
					<th><p>#</p></th>
					<th class="text-left"><p>Student ID</p></th>
					<th class="text-left"><p>Last Name</p></th>
					<th class="text-left"><p>First Name</p></th>
					<th class="text-left"><p>Middle Name</p></th>
					<th><p>MID TERM GRADE</p></th>
					<th><p>FINAL TERM GRADE</p></th>
					<th><p>FINAL GRADE</p></th>
					<th><p>Equivalent</p></th>
				</tr>
			</thead>
			<tbody>
				{#each course_students as course_student, i}
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
						<td
							><p>
								{#if isLoading}
									...
								{:else}
									{getMidTermGrade(course_student.id).toFixed(2)}%
								{/if}
							</p>
						</td>
						<td>
							<p>
								{#if isLoading}
									...
								{:else}
									{getFinalTermGrade(course_student.id).toFixed(2)}%
								{/if}
							</p>
						</td>
						<td>
							<p>
								{#if isLoading}
									...
								{:else}
									{getFinalGrade(course_student.id).toFixed(2)}%
								{/if}
							</p>
						</td>
						<td>
							<p>
								{#if isLoading}
									...
								{:else}
									{getEquivalent(course_student.id).toFixed(2)}
								{/if}
							</p>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style lang="scss">
	table,
	th,
	td {
		@apply text-xs border min-w-[60px] whitespace-nowrap;
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
	}
</style>
