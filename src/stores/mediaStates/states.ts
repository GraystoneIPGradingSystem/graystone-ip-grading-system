// IMPORTED LIB-UTILS
import { writable, get } from 'svelte/store';
// IMPORTED UTILS
import { updateMedia } from './utils';
// IMPORTED STATES
import { isInitialized } from '..';

// STATES
export const windowWidth = writable<number>(0);
export const isXS = writable<boolean>(false);
export const isSM = writable<boolean>(false);
export const isMD = writable<boolean>(false);
export const isLG = writable<boolean>(false);
export const isXL = writable<boolean>(false);
export const is2XL = writable<boolean>(false);
export const isSMDown = writable<boolean>(false);
export const isMDDown = writable<boolean>(false);
export const isLGDown = writable<boolean>(false);
export const isXLDown = writable<boolean>(false);
export const isXSUp = writable<boolean>(false);
export const isSMUp = writable<boolean>(false);
export const isMDUp = writable<boolean>(false);
export const isLGUp = writable<boolean>(false);
export const isXLUp = writable<boolean>(false);
export const mediaStates = {
	windowWidth,
	isXS,
	isSM,
	isMD,
	isLG,
	isXL,
	is2XL,
	isSMDown,
	isMDDown,
	isLGDown,
	isXLDown,
	isXSUp,
	isSMUp,
	isMDUp,
	isLGUp,
	isXLUp,
};

// SUBSCRIPTIONS
windowWidth.subscribe(() => {
	try {
		if (get(isInitialized)) updateMedia();
	} catch {}
});
