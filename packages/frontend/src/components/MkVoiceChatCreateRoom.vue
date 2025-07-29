<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModal v-model="show" @click="close" @closed="$emit('closed')">
	<div :class="$style.modal">
		<div :class="$style.header">
			<h2>{{ i18n.ts.voiceChatCreateRoom }}</h2>
			<button :class="$style.closeButton" @click="close">
				<i class="ti ti-x"></i>
			</button>
		</div>

		<div :class="$style.body">
			<MkInput v-model="title" :placeholder="i18n.ts.voiceChatTitlePlaceholder" :maxlength="100">
				<template #label>{{ i18n.ts.voiceChatTitle }}</template>
			</MkInput>

			<MkTextarea v-model="description" :placeholder="i18n.ts.voiceChatRoomDescriptionPlaceholder" :maxlength="500">
				<template #label>{{ i18n.ts.voiceChatRoomDescription }}</template>
			</MkTextarea>
		</div>

		<div :class="$style.footer">
			<MkButton @click="close">{{ i18n.ts.cancel }}</MkButton>
			<MkButton :disabled="!title.trim() || creating" primary @click="createRoom">
				<MkLoading v-if="creating" mini/>
				{{ i18n.ts.voiceChatCreateRoom }}
			</MkButton>
		</div>
	</div>
</MkModal>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import MkModal from '@/components/MkModal.vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkLoading from '@/components/global/MkLoading.vue';
import { i18n } from '@/i18n.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import * as os from '@/os.js';

const props = defineProps<{
	modelValue: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: boolean];
	'closed': [];
	'roomCreated': [roomId: string];
}>();

const show = ref(props.modelValue);
const title = ref('');
const description = ref('');
const creating = ref(false);

function close() {
	show.value = false;
	emit('update:modelValue', false);
}

async function createRoom() {
	if (!title.value.trim() || creating.value) return;

	creating.value = true;
	try {
		const result = await misskeyApi('voice-chat/create-room', {
			title: title.value.trim(),
			description: description.value.trim() || undefined,
		});

		os.alert({
			type: 'success',
			text: i18n.ts.voiceChatRoomCreated,
		});

		emit('roomCreated', result.roomId);
		close();
	} catch (error) {
		console.error('Failed to create room:', error);
		os.alert({
			type: 'error',
			text: error.message || 'Failed to create room',
		});
	} finally {
		creating.value = false;
	}
}
</script>

<style lang="scss" module>
.modal {
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	width: 90%;
	max-width: 500px;
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20px 24px;
	border-bottom: 1px solid var(--MI_THEME-divider);

	h2 {
		margin: 0;
		font-size: 20px;
		font-weight: 600;
	}
}

.closeButton {
	background: none;
	border: none;
	color: var(--MI_THEME-fg);
	cursor: pointer;
	padding: 8px;
	border-radius: 50%;
	transition: background 0.2s;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.body {
	padding: 24px;
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
	padding: 20px 24px;
	border-top: 1px solid var(--MI_THEME-divider);
}
</style>
