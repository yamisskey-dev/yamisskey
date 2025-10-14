/*
 * SPDX-FileCopyrightText: lqvp
 * SPDX-License-Identifier: AGPL-3.0-only
 */

<template>
<button v-adaptive-bg tabindex="-1" class="_panel" :class="$style.root" :style="{ '--color': role.color ?? 'transparent' }" @click="roleAction">
	<div :class="$style.title">
		<span :class="$style.icon">
			<template v-if="role.iconUrl">
				<img :class="$style.badge" :src="role.iconUrl"/>
			</template>
		</span>
		<span :class="$style.name">{{ role.name }}</span>
	</div>
</button>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, ref, computed } from 'vue';
import type { RolePolicies } from 'misskey-js/autogen/models.js';
import * as os from '@/os';
import { i18n } from '@/i18n';
import { $i } from '@/i.js';

const props = defineProps<{
	role: {
		id: string,
		name: string,
		description: string,
		iconUrl: string | null,
		color: string | null,
		isOwner?: boolean,
		asBadge: boolean,
		isPublic: boolean,
		isExplorable: boolean,
	},
	isAssigned: boolean,
}>();

const emit = defineEmits<{
	(ev: 'refresh'): void
}>();

// 権限チェック（計算プロパティ）
const canEditCommunityRoles = computed(() => {
	return $i && ($i.policies as RolePolicies & Record<string, unknown>).canEditCommunityRoles;
});

function roleAction(ev: MouseEvent) {
	const menuItems = [
		{
			type: 'label' as const,
			text: props.role.name,
		},
		(props.isAssigned ? {
			text: i18n.ts.unassign,
			icon: 'ti ti-minus',
			action: async () => {
				const { canceled } = await os.confirm({
					type: 'warning',
					text: i18n.tsx.removeAreYouSure({ x: props.role.name }),
				});
				if (canceled) return;

				await os.apiWithDialog('roles/unassign', {
					roleId: props.role.id,
				});

				// 親コンポーネントにリスト再取得を指示
				emit('refresh');
			},
		} : {
			text: i18n.ts.assign,
			icon: 'ti ti-plus',
			action: async () => {
				await os.apiWithDialog('roles/assign', {
					roleId: props.role.id,
				});

				// 親コンポーネントにリスト再取得を指示
				emit('refresh');
			},
		}),
	];

	// 権限があるか所有者の場合のみ編集ボタンを表示
	if ((canEditCommunityRoles.value || props.role.isOwner)) {
		menuItems.push({
			text: i18n.ts.edit,
			icon: 'ti ti-edit',
			action: async () => {
				editRole(props.role); // 編集時には既存ロール情報を渡す
			},
		});
	}

	os.popupMenu(menuItems, ev.currentTarget ?? ev.target);
}

// 編集用関数
function editRole(role: typeof props.role) {
	// 権限チェック - 編集権限がない場合かつ所有者でもない場合は実行しない
	if (!canEditCommunityRoles.value && !role.isOwner) {
		os.alert({
			type: 'error',
			title: i18n.ts.error,
			text: i18n.ts.operationForbidden,
		});
		return;
	}

	os.popup(defineAsyncComponent(() => import('./role-add-dialog.vue')), {
		role: role,
	}, {
		closed: () => {
			// ダイアログが閉じられたらリストを更新
			emit('refresh');
		},
	});
}
</script>

<style lang="scss" module>
.root {
	display: block;
	padding: 16px 20px;
	border-left: solid 6px var(--color);
	border-top: none;
	border-bottom: none;
	border-right: none;
}

.title {
	display: flex;
}

.icon {
	margin-right: 8px;
}

.badge {
	height: 1.3em;
	vertical-align: -20%;
}

.name {
	font-weight: bold;
	min-width: 0;
}
</style>
