<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div>
	<MkPagination v-slot="{items}" :paginator="followersPaginator" withControl>
		<div :class="$style.users">
			<MkUserInfo v-for="user in items.map(x => x.follower).filter((x): x is NonNullable<typeof x> => x != null)" :key="user.id" :user="user"/>
		</div>
	</MkPagination>
</div>
</template>

<script lang="ts" setup>
import { computed, markRaw } from 'vue';
import MkUserInfo from '@/components/MkUserInfo.vue';
import MkPagination from '@/components/MkPagination.vue';
import { Paginator } from '@/utility/paginator.js';

const props = defineProps<{
	channelId: string;
}>();

const followersPaginator = markRaw(new Paginator('channels/followers', {
	limit: 20,
	computedParams: computed(() => ({
		channelId: props.channelId,
	})),
}));
</script>

<style lang="scss" module>
.users {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    grid-gap: var(--MI-margin);
}
</style>
