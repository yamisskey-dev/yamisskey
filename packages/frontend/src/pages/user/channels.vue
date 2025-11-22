<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_spacer" style="--MI_SPACER-w: 1200px;">
	<MkPagination v-slot="{items}" :paginator="paginator" withControl>
		<div :class="$style.root">
			<MkChannelPreview v-for="channel in items" :key="channel.id" :channel="channel"/>
		</div>
	</MkPagination>
</div>
</template>

<script lang="ts" setup>
import { computed, markRaw } from 'vue';
import * as Misskey from 'misskey-js';
import MkChannelPreview from '@/components/MkChannelPreview.vue';
import MkPagination from '@/components/MkPagination.vue';
import { Paginator } from '@/utility/paginator.js';

const props = defineProps<{
	user: Misskey.entities.User;
}>();

const paginator = markRaw(new Paginator('channels/owned', {
	limit: 10,
	computedParams: computed(() => ({
		userId: props.user.id,
	})),
}));
</script>

<style lang="scss" module>
.root {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
	gap: var(--MI-margin);
}
</style>
