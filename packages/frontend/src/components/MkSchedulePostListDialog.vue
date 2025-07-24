<!--
SPDX-FileCopyrightText: syuilo and other misskey contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkModalWindow
	ref="dialogEl"
	:width="600"
	:height="650"
	:withOkButton="false"
	@click="cancel()"
	@close="cancel()"
	@closed="emit('closed')"
	@esc="cancel()"
>
	<template #header>
		{{ i18n.ts.schedulePostList }}
	</template>
	<div class="_spacer">
		<MkPagination :paginator="paginator" withControl>
			<template #empty>
				<MkResult type="empty" :text="i18n.ts.noNotes"/>
			</template>

			<template #default="{ items }">
				<div class="_gaps_s">
					<div
						v-for="item in items"
						:key="item.id"
						v-panel
						:class="[$style.schedule]"
					>
						<div :class="$style.scheduleBody" class="_gaps_s">
							<div :class="$style.scheduleInfo">
								<div :class="$style.scheduleMeta">
									<div v-if="item.note.reply" class="_nowrap">
										<i class="ti ti-arrow-back-up"></i> <I18n :src="i18n.ts._drafts.replyTo" tag="span">
											<template #user>
												<Mfm v-if="item.note.reply.user.name != null" :text="item.note.reply.user.name" :plain="true" :nowrap="true"/>
												<MkAcct v-else :user="item.note.reply.user"/>
											</template>
										</I18n>
									</div>
									<div v-if="item.note.renote && item.note.text != null" class="_nowrap">
										<i class="ti ti-quote"></i> <I18n :src="i18n.ts._drafts.quoteOf" tag="span">
											<template #user>
												<Mfm v-if="item.note.renote.user.name != null" :text="item.note.renote.user.name" :plain="true" :nowrap="true"/>
												<MkAcct v-else :user="item.note.renote.user"/>
											</template>
										</I18n>
									</div>
									<div v-if="item.note.channel" class="_nowrap">
										<i class="ti ti-device-tv"></i> {{ i18n.tsx._drafts.postTo({ channel: item.note.channel.name }) }}
									</div>
								</div>
							</div>
							<div :class="$style.scheduleContent">
								<Mfm :text="getNoteSummary(item.note, { showRenote: false, showReply: false })" :plain="true"/>
							</div>
							<div :class="$style.scheduleFooter">
								<div :class="$style.scheduleVisibility">
									<span :title="i18n.ts._visibility[item.note.visibility]">
										<i v-if="item.note.visibility === 'public'" class="ti ti-world"></i>
										<i v-else-if="item.note.visibility === 'home'" class="ti ti-home"></i>
										<i v-else-if="item.note.visibility === 'followers'" class="ti ti-lock"></i>
										<i v-else-if="item.note.visibility === 'specified'" class="ti ti-mail"></i>
									</span>
									<span v-if="item.note.localOnly" :title="i18n.ts._visibility['disableFederation']"><i class="ti ti-rocket-off"></i></span>
								</div>
								<div :class="$style.scheduleTime">
									<i class="ti ti-clock"></i>
									<MkTime :time="item.scheduledAt" mode="detail" colored/>
								</div>
							</div>
						</div>
						<div :class="$style.scheduleActions" class="_buttons">
							<MkButton
								:class="$style.itemButton"
								small
								@click="editSchedule(item)"
							>
								<i class="ti ti-corner-up-left"></i>
								{{ i18n.ts.edit }}
							</MkButton>
							<MkButton
								v-tooltip="i18n.ts.delete"
								danger
								small
								:iconOnly="true"
								:class="$style.itemButton"
								@click="deleteSchedule(item)"
							>
								<i class="ti ti-trash"></i>
							</MkButton>
						</div>
					</div>
				</div>
			</template>
		</MkPagination>
	</div>
</MkModalWindow>
</template>

<script lang="ts" setup>
import { ref, shallowRef, markRaw } from 'vue';
import * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkPagination from '@/components/MkPagination.vue';
import MkModalWindow from '@/components/MkModalWindow.vue';
import MkResult from '@/components/global/MkResult.vue';
import MkTime from '@/components/global/MkTime.vue';
import MkAcct from '@/components/global/MkAcct.vue';
import I18n from '@/components/global/I18n.vue';
import { getNoteSummary } from '@/utility/get-note-summary.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { Paginator } from '@/utility/paginator.js';

const emit = defineEmits<{
	(ev: 'cancel'): void;
	(ev: 'closed'): void;
	(ev: 'editScheduleNote', scheduleId: string): void;
}>();

const dialogEl = shallowRef<InstanceType<typeof MkModalWindow>>();

const paginator = markRaw(new Paginator('notes/schedule/list', {
	limit: 10,
}));

function cancel() {
	emit('cancel');
	dialogEl.value?.close();
}

function editSchedule(item: any) {
	emit('editScheduleNote', item.id);
	dialogEl.value?.close();
}

async function deleteSchedule(item: any) {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.ts.deleteConfirm,
	});

	if (canceled) return;

	os.apiWithDialog('notes/schedule/delete', {
		noteId: item.note.id,
	}).then(() => {
		paginator.reload();
	});
}
</script>

<style lang="scss" module>
.schedule {
    padding: 16px;
    gap: 16px;
    border-radius: 10px;
}

.scheduleBody {
    width: 100%;
    min-width: 0;
}

.scheduleInfo {
    display: flex;
    width: 100%;
    font-size: 0.85em;
    opacity: 0.7;
}

.scheduleMeta {
    flex-grow: 1;
    min-width: 0;
}

.scheduleContent {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
    font-size: 0.9em;
}

.scheduleFooter {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.scheduleVisibility {
    flex-shrink: 0;
}

.scheduleTime {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 85%;
    color: var(--MI_THEME-accent);
    font-weight: 600;
}

.scheduleActions {
    margin-top: 16px;
    padding-top: 16px;
    border-top: solid 1px var(--MI_THEME-divider);
}

.itemButton {
    min-width: auto;
}
</style>
