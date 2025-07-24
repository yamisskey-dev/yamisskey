<!--
SPDX-FileCopyrightText: syuilo and other misskey contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div>
	<MkStickyContainer>
		<template #header><MkPageHeader :actions="headerActions" :tabs="headerTabs"/></template>
		<div class="_spacer" style="--MI_SPACER-w: 900px;">
			<div class="_gaps_m">
				<MkPagination :paginator="paginator">
					<template #default="{ items }">
						<div class="_gaps_s">
							<MkApprovalUser v-for="user in items" :key="user.id" :user="user" @deleted="deleted"/>
						</div>
					</template>
				</MkPagination>
			</div>
		</div>
	</MkStickyContainer>
</div>
</template>

<script lang="ts" setup>
import { computed, markRaw } from 'vue';
import MkPageHeader from '@/components/global/MkPageHeader.vue';
import MkPagination from '@/components/MkPagination.vue';
import MkApprovalUser from '@/components/MkApprovalUser.vue';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { Paginator } from '@/utility/paginator.js';

const paginator = markRaw(new Paginator('admin/show-users', {
	limit: 10,
	computedParams: computed(() => ({
		sort: '+createdAt',
		state: 'pending',
		origin: 'local',
	})),
	offsetMode: true,
}));

function deleted(id: string) {
	paginator.removeItem(id);
}

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePage(computed(() => ({
	title: i18n.ts.signupPendingApprovals,
	icon: 'ti ti-user-check',
})));
</script>

<style lang="scss" module>
.inputs {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.input {
	flex: 1;
}
</style>
