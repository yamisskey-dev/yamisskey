<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<template>
<MkContainer :showHeader="widgetProps.showHeader" class="mkw-activeUsers">
	<template #icon><i class="ti ti-users"></i></template>
	<template #header>{{ i18n.ts._widgets.activeUsers }}</template>
	<template #func="{ buttonStyleClass }">
		<button class="_button" :class="buttonStyleClass" @click="configure()"><i class="ti ti-settings"></i></button>
		<button class="_button" :class="buttonStyleClass" @click="tick()"><i class="ti ti-refresh"></i></button>
	</template>

	<div :class="$style.content">
		<div v-if="activeUsers?.length > 0" :class="$style.users">
			<div v-for="user in activeUsers" :key="user.id || user.username" :class="$style.row">
				<div :class="$style.avatarContainer">
					<MkAvatar :user="user" :class="$style.avatar" link preview/>
				</div>
				<div :class="$style.userInfo">
					<div :class="$style.name">
						<MkA :to="'/@' + user.username">{{ getUserDisplayName(user) }}</MkA>
					</div>
					<div v-if="user.name && user.name !== user.username" :class="$style.username">@{{ user.username }}</div>
				</div>
				<div :class="$style.date">
					<MkTime :time="user.lastActiveDate" small/>
				</div>
			</div>
		</div>
		<MkResult v-else type="empty" :text="i18n.ts.noActiveUsers" :class="$style.result"/>
	</div>
</MkContainer>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useInterval } from '@@/js/use-interval.js';
import { useWidgetPropsManager, WidgetComponentEmits, WidgetComponentExpose, WidgetComponentProps } from './widget';
import type { GetFormResultType } from '@/utility/form.js';
import MkContainer from '@/components/MkContainer.vue';
import MkAvatar from '@/components/global/MkAvatar.vue';
import MkA from '@/components/global/MkA.vue';
import MkResult from '@/components/global/MkResult.vue';
import MkTime from '@/components/global/MkTime.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { i18n } from '@/i18n';

const name = i18n.ts._widgets.activeUsers;

const widgetPropsDef = {
	showHeader: {
		type: 'boolean' as const,
		default: true,
	},
	transparent: {
		type: 'boolean' as const,
		default: false,
	},
	place: {
		type: 'string' as const,
		default: 'right',
		hidden: true,
	},
};

type WidgetProps = GetFormResultType<typeof widgetPropsDef>;

const props = defineProps<WidgetComponentProps<WidgetProps>>();
const emit = defineEmits<WidgetComponentEmits<WidgetProps>>();

const { widgetProps, configure } = useWidgetPropsManager(name,
	widgetPropsDef,
	props,
	emit,
);

const activeUsers = ref([]);

const getUserDisplayName = (user) => {
	// nameがあればそれを使用、なければusernameを使用
	return user.name || user.username;
};

const tick = () => {
	misskeyApi('get-online-users-count').then(res => {
		// デバッグ用にレスポンスをログ出力
		console.log('Received users:', res.details);
		activeUsers.value = res.details;
	}).catch(err => {
		console.error('Failed to fetch online users:', err);
	});
};

useInterval(tick, 1000 * 30, {
	immediate: true,
	afterMounted: true,
});

defineExpose<WidgetComponentExpose>({
	name,
	configure,
	id: props.widget ? props.widget.id : null,
});
</script>

<style lang="scss" module>
.content {
    padding: 8px;
}

.users {
    text-align: left;
}

.result {
    margin-top: var(--MI-margin);
}

.row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 8px;
    margin-bottom: 6px;
    padding: 6px;
    border-radius: 6px;
    transition: background 0.2s;
    align-items: center;

    &:hover {
        background: var(--MI_THEME-accentedBg);
    }
}

.avatarContainer {
    position: relative;
    width: 40px;
    height: 40px;

    :global(.mk-avatar) {
        width: 100%;
        height: 100%;
    }
}

.avatar {
    width: 100%;
    height: 100%;
}

// 他のスタイルはそのまま

.userInfo {
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 0;
}

.name {
    font-weight: bold;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.username {
    font-size: 0.85em;
    color: var(--MI_THEME-fgTransparentWeak);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.date {
    text-align: right;
    white-space: nowrap;
    font-size: 0.8em;
    color: var(--MI_THEME-fgTransparentWeak);

    // MkTimeコンポーネントのスタイル調整（必要な場合）
    :global(.time) {
        color: inherit;
    }
}
</style>
