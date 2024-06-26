<script lang="ts">
	// IMPORTED TYPES
	import type { Column, FilterGroup, RowItem, SortItem, TableTool } from './types';
	// IMPORTED LIB-COMPONENTS
	import { Button, Input } from '$lib';
	// IMPORTED COMPONENTS
	import ColumnVisibility from './ColumnVisibility.svelte';
	import RowFilter from './RowFilter.svelte';
	import RowSort from './RowSort.svelte';
	import Table from './Table.svelte';
	import Thumbnails from './Thumbnails.svelte';

	// PROPS
	export let columns: Column[],
		rowItems: RowItem[],
		sortItems: SortItem[],
		filterGroups: FilterGroup[] = [],
		tableTools: TableTool[] = [],
		loading: boolean,
		toolPosition: 'front' | 'end' = 'end',
		type: 'table' | 'thumbnail' = 'table',
		handleRefresh: () => Promise<void>;

	// STATES
	let search = '';
</script>

<div class="p-4 pt-0 flex flex-col gap-4">
	<div class="flex flex-col md:flex-row md:grid md:grid-cols-2 gap-4">
		<Input
			class="bg-white shadow-md flex-grow order-2 md:order-1"
			placeholder="Search..."
			disabled={loading}
			bind:value={search}
		/>
		<div class="flex-end-center gap-4 order-1 md:order-2">
			<Button
				class="shadow-md"
				variant="outline"
				size="icon"
				disabled={loading}
				on:click={() => handleRefresh()}
			>
				<i class="ph-bold ph-arrow-clockwise text-xl" />
			</Button>
			<span class="flex-grow hidden md:block" />
			{#each tableTools as tableTool}
				<Button
					class="shadow-md"
					variant="outline"
					size="icon"
					disabled={loading}
					on:click={tableTool.handleClick}
				>
					<i class="{tableTool.icon} text-xl" />
				</Button>
			{/each}
			{#if filterGroups.length}
				<RowFilter bind:filterGroups />
			{/if}
			<RowSort bind:sortItems />
			<span class="flex-grow md:hidden" />
			{#if type === 'table'}
				<ColumnVisibility bind:columns />
			{/if}
		</div>
	</div>
	{#if type === 'table'}
		<Table bind:sortItems bind:filterGroups {...{ search, columns, rowItems, toolPosition }} />
	{:else if type === 'thumbnail'}
		<Thumbnails bind:sortItems bind:filterGroups {...{ search, rowItems }} />
	{/if}
</div>
