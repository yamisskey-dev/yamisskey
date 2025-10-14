<!--
SPDX-FileCopyrightText: lqvp
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<div style="text-align: center;">{{ i18n.ts._initialAccountSetting.communityRoleDescription }}</div>

	<div v-if="isLoadingRoles" style="text-align: center; padding: 16px;">
		<MkLoading/>
	</div>
	<div v-else class="_gaps_m">
		<div class="_gaps_s">
			<MkFolder v-if="assignedList.length > 0" :defaultOpen="true">
				<template #label>{{ i18n.ts.assignedRoles }}</template>
				<div class="_gaps_s">
					<DialogRole v-for="role in assignedList" :key="role.id" :role="role" :isAssigned="true" @refresh="refreshRoleLists"/>
				</div>
			</MkFolder>
			<MkFolder :defaultOpen="true">
				<template #label>{{ i18n.ts.assignableRoles }}</template>
				<MkResult v-if="roleList.length === 0" type="empty"/>
				<div v-else class="_gaps_s">
					<DialogRole v-for="role in roleList" :key="role.id" :role="role" :isAssigned="false" @refresh="refreshRoleLists"/>
				</div>
			</MkFolder>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { i18n } from '@/i18n.js';
import MkFolder from '@/components/MkFolder.vue';
import MkLoading from '@/components/global/MkLoading.vue';
import MkResult from '@/components/global/MkResult.vue';
import DialogRole from '@/pages/DialogRole.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import * as os from '@/os.js';

type Role = {
	id: string;
	name: string;
	description: string;
	iconUrl: string | null;
	color: string | null;
	isOwner?: boolean;
	asBadge: boolean;
	isPublic: boolean;
	isExplorable: boolean;
	[key: string]: unknown;
};

const assignedList = ref<Role[]>([]);
const roleList = ref<Role[]>([]);
const isLoadingRoles = ref(false);

async function refreshRoleLists() {
	isLoadingRoles.value = true;

	try {
		// API呼び出しを並列化
		const [assigned, allRoles] = await Promise.all([
			misskeyApi('roles/list', { assignedOnly: true }),
			misskeyApi('roles/list', { communityPublicOnly: true }),
		]);

		assignedList.value = assigned as Role[];

		// 割り当て済みを除外
		roleList.value = (allRoles as Role[]).filter(r =>
			!assignedList.value.some(ra => r.id === ra.id),
		);
	} catch (error) {
		console.error('Failed to fetch role lists:', error);
		os.alert({
			type: 'error',
			text: String(i18n.ts.failedToLoad),
		});
	} finally {
		isLoadingRoles.value = false;
	}
}

onMounted(() => {
	refreshRoleLists();
});
</script>
