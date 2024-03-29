<script lang="ts">
	// IMPORTED TYPES
	import type { CriteriaItemData } from '$types/curriculum';
	// IMPORTED LIB-UTILS
	import { page } from '$app/stores';
	// IMPORTED UTILS
	import {
		createConfirmationModal,
		createErrorModal,
		createSuccessModal,
	} from '$stores/modalStates';
	import { deleteCriteriaItem, updateCriteriaItem } from '$utils/supabase';
	// IMPORTED LIB-COMPONENTS
	import { Button, Modal, FloatingLabelInput, Badge, Spinner, Checkbox } from 'flowbite-svelte';

	// PROPS
	export let criteria_item: CriteriaItemData,
		handleClose: () => void,
		handleSearch: () => Promise<void>;

	// STATES
	let name = criteria_item.name,
		total = criteria_item.total.toString(),
		isAssessment = criteria_item.is_assessment;
	let isLoading = false;

	// UTILS
	const handleReset = () => {
		name = criteria_item.name;
		total = criteria_item.total.toString();
	};
	const handleSave = async () => {
		isLoading = true;
		try {
			if ([name, total].some((v) => !v)) throw new Error('The form is incomplete!');
			const { id, criteria_id, created_at } = criteria_item;
			await updateCriteriaItem({
				id,
				criteria_id,
				name,
				total: parseInt(total),
				is_assessment: isAssessment,
				is_open: criteria_item.is_open,
				title: criteria_item.title || name,
				description: criteria_item.description,
				questions: criteria_item.questions,
				created_at,
			});
			await handleSearch();
			handleClose();
			createSuccessModal({ message: 'Criteria item was edited successfully!' });
		} catch (error: any) {
			createErrorModal({ message: error.message });
		}
		isLoading = false;
	};
	const handleDelete = async () => {
		isLoading = true;
		try {
			await deleteCriteriaItem(criteria_item.id);
			await handleSearch();
			handleClose();
			createSuccessModal({ message: 'Criteria item was edited successfully!' });
		} catch (error: any) {
			createErrorModal({ message: error.message });
		}
		isLoading = false;
	};
</script>

<Modal open={true} permanent={true} class="w-full" size="md">
	<svelte:fragment slot="header">
		<div class="w-full flex items-center gap-4">
			<Badge class="aspect-plus p-2"><i class="ti ti-plus text-[18px]" /></Badge>
			<p class="text-xl text-black flex-grow">Edit Criteria Item</p>
			<button class="w-[34px] flex-center" on:click={handleClose}>
				<i class="ti ti-x text-xl cursor-pointer hover:text-black" />
			</button>
		</div>
	</svelte:fragment>
	<form class="flex flex-col gap-4" on:submit|preventDefault={handleSave}>
		<div class={!isAssessment ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>
			<FloatingLabelInput
				bind:value={name}
				style="outlined"
				type="text"
				label="Name"
				required
			/>
			{#if !isAssessment}
				<FloatingLabelInput
					bind:value={total}
					style="outlined"
					type="number"
					label="Total"
					required
				/>
			{/if}
		</div>
		{#if isAssessment}
			<Checkbox checked disabled>Make as assessment?</Checkbox>
		{/if}
		<button type="submit" hidden />
	</form>
	<svelte:fragment slot="footer">
		<div class="w-full grid grid-cols-2 sm:flex justify-end gap-4">
			<Button size="sm" color="alternative" disabled={isLoading} on:click={handleReset}>
				Reset
			</Button>
			{#if isAssessment}
				<Button
					size="sm"
					color="purple"
					href={'/app/classes/class/assessments/assessment/?instructor_id=' +
						$page.data.instructor.id +
						'&course_class_id=' +
						$page.data.courseClass.id +
						'&assessment_id=' +
						criteria_item.id}
					on:click={handleClose}
				>
					View
				</Button>
			{/if}
			<Button size="sm" color="red" disabled={isLoading} on:click={handleClose}>
				Cancel
			</Button>
			<Button
				size="sm"
				color="yellow"
				disabled={isLoading}
				on:click={() =>
					createConfirmationModal({
						message: 'Are you sure you want to delete this criteria item?',
						handleProceed: handleDelete,
					})}
			>
				Delete
			</Button>
			<Button
				class={isAssessment ? 'col-span-2' : ''}
				size="sm"
				color="primary"
				disabled={isLoading}
				on:click={handleSave}
			>
				{#if isLoading}
					<Spinner class="mr-3" size="4" color="white" />Loading
				{:else}
					Save
				{/if}
			</Button>
		</div>
	</svelte:fragment>
</Modal>
