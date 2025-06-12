<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<component
	:is="prefer.s.animation ? TransitionGroup : 'div'"
	:enterActiveClass="$style.transition_x_enterActive"
	:leaveActiveClass="$style.transition_x_leaveActive"
	:enterFromClass="$style.transition_x_enterFrom"
	:leaveToClass="$style.transition_x_leaveTo"
	:moveClass="$style.transition_x_move"
	tag="div" :class="$style.root"
>
	<XReaction
		v-for="[reaction, count] in _reactions"
		:key="reaction"
		:reaction="reaction"
		:reactionEmojis="props.reactionEmojis"
		:count="count"
		:isInitial="initialReactions.has(reaction)"
		:noteId="props.noteId"
		:myReaction="props.myReaction"
		@reactionToggled="onMockToggleReaction"
	/>
	<slot v-if="hasMoreReactions" name="more"/>
</component>
</template>

<script lang="ts" setup>
import * as Misskey from 'misskey-js';
import { inject, watch, ref, onMounted, computed } from 'vue';
import { TransitionGroup } from 'vue';
import XReaction from '@/components/MkReactionsViewer.reaction.vue';
import { prefer } from '@/preferences.js';
import { DI } from '@/di.js';
import { $i } from '@/i.js';
// ユーティリティをインポート
import { fetchMutings, filterMutedReactionCounts } from '@/utility/hide-reactions-from-muted-users';

const props = withDefaults(defineProps<{
	noteId: Misskey.entities.Note['id'];
	reactions: Misskey.entities.Note['reactions'];
	reactionEmojis: Misskey.entities.Note['reactionEmojis'];
	myReaction: Misskey.entities.Note['myReaction'];
	maxNumber?: number;
}>(), {
	reactionEmojis: () => ({}),
	myReaction: null,
	maxNumber: 8,
});

const mock = inject(DI.mock, false);

const emit = defineEmits<{
	(ev: 'mockUpdateMyReaction', emoji: string, delta: number): void;
}>();

const initialReactions = new Set(Object.keys(props.reactions));

const _reactions = ref<[string, number][]>([]);
const hasMoreReactions = ref(false);

if (props.myReaction && !Object.keys(_reactions.value).includes(props.myReaction)) {
	_reactions.value[props.myReaction] = props.reactions[props.myReaction];
}

function onMockToggleReaction(emoji: string, count: number) {
	if (!mock) return;

	const i = _reactions.value.findIndex((item) => item[0] === emoji);
	if (i < 0) return;

	emit('mockUpdateMyReaction', emoji, (count - _reactions.value[i][1]));
}

// リアクションリストの更新処理を関数化
async function updateVisibleReactions() {
  // ミュートユーザーからのリアクションを除外（設定が有効な場合のみ）
  const visibleReactions = prefer.s.hideReactionsFromMutedUsers && $i
    ? await filterMutedReactionCounts(props.reactions, props.noteId)
    : { ...props.reactions };

  // 空の場合の早期リターン（ミュートユーザーのみからのリアクションがあるケース）
  if (Object.keys(visibleReactions).length === 0) {
    _reactions.value = [];
    hasMoreReactions.value = false;
    return;
  }

  // リアクションを降順に並べ替え
  const reactions = [...Object.entries(visibleReactions)]
    .sort((a, b) => b[1] - a[1]);

  // 最大表示数を超える場合はスライス
  if (props.maxNumber && reactions.length > props.maxNumber) {
    _reactions.value = reactions.slice(0, props.maxNumber);
    hasMoreReactions.value = true;
  } else {
    _reactions.value = reactions;
    hasMoreReactions.value = false;
  }

  // 自分のリアクションを処理
  if (props.myReaction) {
    // 自分のリアクションが含まれていなければ追加
    if (!_reactions.value.some(([reaction]) => reaction === props.myReaction)) {
      // 原本のリアクション数を使用
      const count = props.reactions[props.myReaction] || 1;
      _reactions.value.push([props.myReaction, count]);
    }
  }
}

// コンポーネント初期化時にミュートリストを取得
onMounted(async () => {
  if (prefer.s.hideReactionsFromMutedUsers && $i) {
    await fetchMutings();
    updateVisibleReactions();
  }
});

// リアクションリストの更新watcher
watch([() => props.reactions, () => prefer.s.hideReactionsFromMutedUsers], () => {
  updateVisibleReactions();
}, { immediate: true, deep: true });
</script>

<style lang="scss" module>
.transition_x_move,
.transition_x_enterActive,
.transition_x_leaveActive {
	transition: opacity 0.2s cubic-bezier(0,.5,.5,1), transform 0.2s cubic-bezier(0,.5,.5,1) !important;
}
.transition_x_enterFrom,
.transition_x_leaveTo {
	opacity: 0;
	transform: scale(0.7);
}
.transition_x_leaveActive {
	position: absolute;
}

.root {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 4px;

	&:empty {
		display: none;
	}
}
</style>
