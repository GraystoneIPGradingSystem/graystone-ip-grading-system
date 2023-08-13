// IMPORTED TYPES
import type { Account } from '$types/credentials';
// IMPORTED LIB-UTILS
import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import { page } from '$app/stores';
// IMPORTED UTILS
import { selectAccountByEmailAndPassword } from '$utils/supabase';
import { decrypt, encrypt } from '$utils/helpers';
// IMPORTED STATES
import { DEFAULT_ACCOUNT, authStates } from './states';

// UTILS
export const login = async (email: string, password: string) => {
	const account = await selectAccountByEmailAndPassword(email, password);
	authStates.account.set(account);
	authStates.isLogined.set(true);
	saveData();
	await observeRoute();
};
export const logout = async () => {
	authStates.account.set(DEFAULT_ACCOUNT);
	authStates.isLogined.set(false);
	saveData();
	await observeRoute();
};
export const saveData = () => {
	if (typeof localStorage === 'undefined') return;
	const encrypted = encrypt(
		JSON.stringify({
			account: get(authStates.account),
		}),
	);
	localStorage.setItem('authStates', encrypted);
};
export const loadData = async () => {
	try {
		if (typeof localStorage === 'undefined') return;
		const encrypted = localStorage.getItem('authStates');
		if (!encrypted) return;
		const decrypted = decrypt(encrypted);
		if (!decrypted) return;
		const { account } = JSON.parse(decrypted);
		if (!account) return;
		await login(account.email, account.password);
	} catch {
		await logout();
	}
};
export const observeRoute = async () => {
	const isLogined = get(authStates.isLogined);
	const account = get(authStates.account);
	const { route } = get(page);
	if (!route || !route.id) return;
	else if (isLogined && route.id === '/') await goto('/app/dashboard');
	else if (!isLogined && route.id.match('/app/')) await goto('/');
	else if (
		account.account_type !== 'admin' &&
		route.id.match(/\/app\/(curriculum|master-list|admin-controls)\//g)
	)
		await goto('/app/dashboard');
};
export const initializeAuthStates = async () => {
	await loadData();
};