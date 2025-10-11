<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<div style="text-align: center; padding: 0 16px;">{{ i18n.ts._initialAccountSetting._communityRole.description }}</div>

	<MkInfo>{{ i18n.ts._initialAccountSetting._communityRole.info }}</MkInfo>

	<div v-if="loading" style="text-align: center; padding: 32px;">
		<MkLoading/>
	</div>

	<div v-else-if="availableRoles.length === 0" style="text-align: center; padding: 32px; opacity: 0.7;">
		<i class="ti ti-info-circle" style="font-size: 2em;"></i>
		<div style="margin-top: 8px;">{{ i18n.ts._initialAccountSetting._communityRole.noRolesAvailable }}</div>
	</div>

	<div v-else class="_gaps_s">
		<div v-for="role in availableRoles" :key="role.id">
			<button
				v-adaptive-bg
				class="_panel"
				:class="[$style.roleCard, { [$style.selected]: selectedRoles.has(role.id) }]"
				:style="{ '--color': role.color }"
				@click="toggleRole(role)"
			>
				<div :class="$style.roleHeader">
					<div :class="$style.roleTitle">
						<span v-if="role.iconUrl" :class="$style.roleIcon">
							<img :class="$style.badge" :src="role.iconUrl"/>
						</span>
						<span :class="$style.roleName">{{ role.name }}</span>
					</div>
					<div v-if="selectedRoles.has(role.id)" :class="$style.checkIcon">
						<i class="ti ti-check"></i>
					</div>
				</div>
				<div v-if="role.description" :class="$style.roleDescription">
					{{ role.description }}
				</div>
			</button>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import * as Misskey from 'misskey-js';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import MkInfo from '@/components/MkInfo.vue';
import MkLoading from '@/components/global/MkLoading.vue';

const availableRoles = ref<Misskey.entities.Role[]>([]);
const selectedRoles = ref<Set<string>>(new Set());
const loading = ref(true);

onMounted(async () => {
	try {
		// コミュニティロールで公開されているもののみ取得
		const roles = await misskeyApi('roles/list', {
			communityPublicOnly: true,
		});

		// 探索可能なロールのみをフィルタリング
		availableRoles.value = roles.filter(role => role.isExplorable && role.isCommunity);
	} catch (error) {
		console.error('Failed to fetch community roles:', error);
	} finally {
		loading.value = false;
	}
});

async function toggleRole(role: Misskey.entities.Role) {
	if (selectedRoles.value.has(role.id)) {
		// 割り当て解除
		try {
			await misskeyApi('roles/unassign', {
				roleId: role.id,
			});
			selectedRoles.value.delete(role.id);
		} catch (error) {
			console.error('Failed to unassign role:', error);
		}
	} else {
		// 割り当て
		try {
			await misskeyApi('roles/assign', {
				roleId: role.id,
			});
			selectedRoles.value.add(role.id);
		} catch (error) {
			console.error('Failed to assign role:', error);
		}
	}
}
</script>

<style lang="scss" module>
.roleCard {
	display: block;
	width: 100%;
	padding: 16px;
	text-align: left;
	border-left: solid 6px var(--color);
	transition: all 0.2s;
	cursor: pointer;

	&:hover {
		border-left-width: 8px;
	}

	&.selected {
		background: var(--MI_THEME-accentedBg);
		border-left-width: 8px;
	}
}

.roleHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 8px;
}

.roleTitle {
	display: flex;
	align-items: center;
	min-width: 0;
	flex: 1;
}

.roleIcon {
	margin-right: 8px;
	flex-shrink: 0;
}

.badge {
	height: 1.3em;
	vertical-align: -20%;
}

.roleName {
	font-weight: bold;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.checkIcon {
	color: var(--MI_THEME-accent);
	font-size: 1.2em;
	flex-shrink: 0;
}

.roleDescription {
	margin-top: 8px;
	font-size: 0.9em;
	opacity: 0.7;
	line-height: 1.4;
}
</style>
