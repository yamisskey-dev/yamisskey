<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_spacer" style="--MI_SPACER-w: 800px;">
	<MkPagination
		v-slot="{ items: paginationItems }" ref="paginationComponent"
		:paginator="followingPaginator" :class="$style.tl"
	>
		<div :class="$style.content">
			<MkLoading v-if="followingPaginator.fetching.value && (!paginationItems || paginationItems.length === 0)"/>
			<MkResult v-else-if="!paginationItems || paginationItems.length === 0" type="empty"/>

			<!-- 重複排除したアイテムを使用 -->
			<div v-for="item in getUniqueItems(paginationItems || [])" :key="item.id" :class="$style.userNotes">
				<template v-for="(note, i) in item.notes.slice(0, displayCount)" :key="note.id">
					<!-- 日付区切り: 日付が変わる場合や最初のノートに表示 -->
					<div
						v-if="shouldShowDateSeparator(note, i, item)" :class="[$style.dateSeparator,
							i === 0 ? $style.firstDateSeparator : '',
							item.isFirstPublicPost && isOldestNote(note, item) ? $style.firstPublicPostSeparator : '',
							shouldHighlightAppearance(note, i, item) ? $style.rarelyAppearedSeparator : '',
							isFloaterInfo(note, i, item) ? $style.floaterSeparator : '']"
					>
						<span>{{ getDateInfo(note, i, item) }}</span>
					</div>

					<MkNote :note="note" :class="$style.note" :withHardMute="true" :ignoreInheritedHardMute="false"/>
				</template>
			</div>
		</div>
	</MkPagination>
</div>
</template>

<script lang="ts" setup>
import { computed, provide, watch, ref, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import * as Misskey from 'misskey-js';
import MkPagination from '@/components/MkPagination.vue';
import MkNote from '@/components/MkNote.vue';
import MkLoading from '@/components/global/MkLoading.vue';
import MkResult from '@/components/global/MkResult.vue';
import { getDateText, isSeparatorNeeded } from '@/utility/timeline-date-separate.js';
import { i18n } from '@/i18n.js';
import { formatDateTimeString } from '@/utility/format-time-string.js';
import { Paginator } from '@/utility/paginator.js';

type FloaterItem = Misskey.entities.NotesFloaterResponse[number];
type FloaterNote = FloaterItem['notes'][number];

provide('inTimeline', true);

const props = defineProps<{
	anchorDate: number;
	timeRange: number; // タブの時間範囲（ミリ秒）
	displayNoteCount?: number; // 表示するノート数
}>();

const paginationComponent = shallowRef(null);
const forceReload = ref(0);

const displayCount = computed(() => props.displayNoteCount ?? 3);

// item ごとのキャッシュ。サーバ応答オブジェクトに直接注入しないよう外出し
const itemCache = new Map<string, { info?: string; sortedNotes?: FloaterNote[] }>();

function getCache(id: string) {
	let c = itemCache.get(id);
	if (!c) {
		c = {};
		itemCache.set(id, c);
	}
	return c;
}

const followingPaginator = new Paginator('notes/floater', {
	limit: 10,
	offsetMode: true,
	params: () => ({
		anchorDate: props.anchorDate,
		forceReload: forceReload.value,
		noteLimit: 0, // 0=日付差があるまで動的に取得
		maxNoteLimit: 10,
	}),
});

onMounted(() => {
	followingPaginator.init();
});

watch(() => props.anchorDate, (newVal, oldVal) => {
	if (newVal !== oldVal) {
		forceReload.value++;
		itemCache.clear();
		followingPaginator.reload();
	}
}, { immediate: false });

function reload() {
	forceReload.value++;
	itemCache.clear();
	followingPaginator.reload();
}

onBeforeUnmount(() => {
	itemCache.clear();
});

// ----- 日付ユーティリティ -----

function toIso(date: string | Date): string {
	return typeof date === 'string' ? date : date.toISOString();
}

function isSameDay(a: string | Date, b: string | Date): boolean {
	return !isSeparatorNeeded(toIso(a), toIso(b));
}

function isToday(date: string | Date): boolean {
	return isSameDay(date, new Date());
}

function getDisplayDateString(date: string | Date): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return isToday(d) ? '今日' : formatDateTimeString(d, 'yyyy年M月d日');
}

function calculateDaysDifference(olderDate: Date, newerDate: Date): number {
	const d1 = new Date(olderDate.getFullYear(), olderDate.getMonth(), olderDate.getDate());
	const d2 = new Date(newerDate.getFullYear(), newerDate.getMonth(), newerDate.getDate());
	const diffDays = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
	return diffDays > 0 ? diffDays : 0;
}

function getNoteDaysDifference(note: FloaterNote, compareNote: FloaterNote | null): number {
	if (!compareNote) return 0;
	const cur = new Date(note.createdAt);
	const cmp = new Date(compareNote.createdAt);
	if (isSameDay(cur, cmp)) return 0;
	if (cmp >= cur) return 0;
	return calculateDaysDifference(cmp, cur);
}

// ----- ノート順序判定 -----

function getChronologicalNotes(item: FloaterItem): FloaterNote[] {
	const cache = getCache(item.id);
	cache.sortedNotes ??= [...item.notes].sort((a, b) =>
		new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
	);
	return cache.sortedNotes;
}

function isNewestNote(note: FloaterNote, item: FloaterItem): boolean {
	const chrono = getChronologicalNotes(item);
	return chrono.length > 0 && note.id === chrono[chrono.length - 1].id;
}

function isOldestNote(note: FloaterNote, item: FloaterItem): boolean {
	const chrono = getChronologicalNotes(item);
	return chrono.length > 0 && note.id === chrono[0].id;
}

function getCompareNote(note: FloaterNote, index: number, item: FloaterItem): FloaterNote | null {
	if (item.isFirstPublicPost) {
		if (isOldestNote(note, item)) return null;
		const chrono = getChronologicalNotes(item);
		const currentIndex = chrono.findIndex(n => n.id === note.id);
		return currentIndex > 0 ? chrono[currentIndex - 1] : null;
	}
	return index === 0
		? (item.notes.length > 1 ? item.notes[item.notes.length - 1] : null)
		: item.notes[index - 1];
}

// ----- i18n / ユーザー名 -----

function formatFloaterMessage(messageKey: string, params: Record<string, string>): string {
	const messageTemplate = (i18n.ts._floater as Record<string, string | undefined>)[messageKey];
	if (!messageTemplate) {
		console.warn(`Missing floater message: ${messageKey}`);
		return messageKey;
	}
	let message = messageTemplate;
	for (const [key, value] of Object.entries(params)) {
		message = message.replaceAll(`{${key}}`, value);
	}
	return message;
}

function formatUserName(user: FloaterNote['user']): string {
	return (user.name ?? user.username).replace(/:([\w-]+):/g, '').trim();
}

// ----- 表示判定 -----

function shouldShowDateSeparator(note: FloaterNote, index: number, item: FloaterItem): boolean {
	if (item.isFirstPublicPost && isOldestNote(note, item)) return true;

	const allToday = item.notes.every(n => isToday(n.createdAt));
	if (allToday) return false;

	if (isNewestNote(note, item)) return true;

	return !isSameDay(note.createdAt, item.notes[index - 1].createdAt);
}

function isFloaterInfo(note: FloaterNote, index: number, item: FloaterItem): boolean {
	return index === 0 || (
		index < item.notes.length - 1 &&
		!isSameDay(note.createdAt, item.notes[index + 1].createdAt)
	);
}

function shouldShowDaysSinceLastAppearance(note: FloaterNote, index: number, item: FloaterItem): boolean {
	if (item.isFirstPublicPost && isOldestNote(note, item)) return false;
	const compareNote = getCompareNote(note, index, item);
	return getNoteDaysDifference(note, compareNote) > 0;
}

function shouldHighlightAppearance(note: FloaterNote, index: number, item: FloaterItem): boolean {
	if (!shouldShowDaysSinceLastAppearance(note, index, item)) return false;
	const compareNote = getCompareNote(note, index, item);
	const diffDays = getNoteDaysDifference(note, compareNote);
	const tabRangeDays = props.timeRange / (1000 * 60 * 60 * 24);
	return diffDays >= tabRangeDays * 2;
}

// ----- 浮上情報生成 -----

function getCombinedFloaterInfo(item: FloaterItem, noteIndex = 0, nextNote?: FloaterNote): string {
	const currentNote = item.notes[noteIndex];
	if (!currentNote) return '';

	const cache = getCache(item.id);
	if (isNewestNote(currentNote, item) && cache.info) return cache.info;

	// 初浮上
	if (item.isFirstPublicPost && isOldestNote(currentNote, item)) {
		const result = formatFloaterMessage('userFirstPublicPost', {
			user: formatUserName(currentNote.user),
			date: getDisplayDateString(currentNote.createdAt),
		});
		cache.info = result;
		return result;
	}

	const currentDate = new Date(currentNote.createdAt);

	if (item.notes.every(n => isToday(n.createdAt))) return '';

	if (item.notes.length > 1 && isNewestNote(currentNote, item)) {
		const chrono = getChronologicalNotes(item);
		const oldest = chrono[0];
		const newest = chrono[chrono.length - 1];
		if (isSameDay(oldest.createdAt, newest.createdAt)) {
			if (!isToday(currentDate)) return getDateText(currentDate);
			return '';
		}
	}

	const compareNote = nextNote ?? getCompareNote(currentNote, noteIndex, item);
	if (!compareNote) {
		return formatFloaterMessage('userRarelyAppeared', {
			user: formatUserName(currentNote.user),
			date: getDisplayDateString(currentDate),
		});
	}

	const compareDate = new Date(compareNote.createdAt);
	if (isSameDay(currentDate, compareDate)) {
		if (isToday(currentDate)) return '';
		return getDateText(currentDate);
	}

	const diffDays = getNoteDaysDifference(currentNote, compareNote);
	if (diffDays === 0) return getDateText(currentDate);

	const result = formatFloaterMessage('userAfterNDays', {
		user: formatUserName(currentNote.user),
		date: getDisplayDateString(currentDate),
		n: diffDays.toString(),
	});
	if (isNewestNote(currentNote, item)) cache.info = result;
	return result;
}

function getDateInfo(note: FloaterNote, index: number, item: FloaterItem): string {
	if (item.isFirstPublicPost && isOldestNote(note, item)) {
		return formatFloaterMessage('userFirstPublicPost', {
			user: formatUserName(note.user),
			date: getDisplayDateString(note.createdAt),
		});
	}

	if (shouldShowDaysSinceLastAppearance(note, index, item)) {
		const compareNote = getCompareNote(note, index, item);
		const diffDays = getNoteDaysDifference(note, compareNote);
		if (diffDays > 0) {
			return formatFloaterMessage('userAfterNDays', {
				user: formatUserName(note.user),
				date: getDisplayDateString(note.createdAt),
				n: diffDays.toString(),
			});
		}
	}

	if (isNewestNote(note, item)) return getCombinedFloaterInfo(item, 0);

	if (index < item.notes.length - 1 && !isSameDay(note.createdAt, item.notes[index + 1].createdAt)) {
		return getCombinedFloaterInfo(item, index, item.notes[index + 1]);
	}

	return getDateText(new Date(note.createdAt));
}

// ----- 重複排除 -----

function getUniqueItems(items: FloaterItem[]): FloaterItem[] {
	const userMap = new Map<string, FloaterItem>();
	for (const item of items) {
		if (item.notes.length === 0) continue;
		const userId = item.id || item.notes[0].user.id;
		const existing = userMap.get(userId);
		if (!existing) {
			userMap.set(userId, item);
			continue;
		}
		const existingIds = new Set(existing.notes.map(n => n.id));
		for (const note of item.notes) {
			if (!existingIds.has(note.id)) existing.notes.push(note);
		}
		existing.notes.sort((a, b) =>
			new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
		// マージ結果が変わるので sortedNotes/info キャッシュを破棄
		itemCache.delete(userId);
	}
	return Array.from(userMap.values());
}

defineExpose({ reload });
</script>

<style lang="scss" module>
.tl {
	container-type: inline-size;
	background: var(--MI_THEME-bg);
	border-radius: var(--MI-radius);
	overflow: clip;

	.content {
		container-type: inline-size;

		.userNotes {
			background: var(--MI_THEME-panel);
			border-radius: var(--MI-radius);
			margin-bottom: var(--MI-margin);

			// 共通スタイルを変数として定義
			$separator-padding: 6px 0;
			$separator-color: var(--MI_THEME-fgOnX);
			$separator-bg: var(--MI_THEME-panel);
			$separator-border: solid 0.5px var(--MI_THEME-divider);
			$border-radius: var(--MI-radius);

			// スタイル定義をDRYに
			.dateSeparator {
				position: relative;
				text-align: center;
				padding: $separator-padding;
				color: $separator-color;
				border-top: $separator-border;
				border-bottom: $separator-border;
				margin: 0;
				background: $separator-bg;
				opacity: 0.75;

				span {
					display: inline-block;
					position: relative;
					padding: 0 16px;
					font-size: 0.8em;
					line-height: 1.0em;
					font-weight: normal;
				}

				// モディファイアとして追加
				&.floaterSeparator {
					border-top-left-radius: $border-radius;
					border-top-right-radius: $border-radius;
					padding: 6px 0;
				}

				&.firstDateSeparator {
					border-top: none;
				}

				// 強調表示の共通スタイル
				&.firstPublicPostSeparator,
				&.rarelyAppearedSeparator {
					background: $separator-bg;
					font-weight: bold;
					opacity: 1;
				}

				// 個別の色指定
				&.firstPublicPostSeparator {
					color: var(--MI_THEME-accent); // 初浮上はアクセント色
				}

				&.rarelyAppearedSeparator {
					color: var(--MI_THEME-warn); // 久々に浮上は警告色
				}
			}

			.note {
				border-bottom: solid 0.5px var(--MI_THEME-divider);

				&:last-child {
					border-bottom: none;
					border-bottom-left-radius: var(--MI-radius);
					border-bottom-right-radius: var(--MI-radius);
				}
			}
		}
	}
}

/* モバイル対応のためのメディアクエリ */
@container (max-width: 500px) {
	.tl {
		border-radius: 0;

		.content .userNotes {
			border-radius: 0;

			.floaterInfo {
				border-radius: 0;
			}
		}
	}
}

@container (max-width: 380px) {
	.tl {
		.content .userNotes {
			margin-bottom: 10px;

			.note {
				padding: 14px 16px;
			}
		}
	}
}

@container (max-width: 320px) {
	.tl {
		.content .userNotes {
			margin-bottom: 8px;
		}
	}
}
</style>
