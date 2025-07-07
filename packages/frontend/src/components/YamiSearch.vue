<template>
<div class="yami-search">
	<div class="search-input">
		<MkInput
			v-model="query"
			:placeholder="i18n.ts._yami.searchYamiNotes"
			@keydown.enter="search"
		>
			<template #prefix><i class="ti ti-search"></i></template>
			<template #suffix>
				<button v-if="query" class="clear-button" @click="clear">
					<i class="ti ti-x"></i>
				</button>
			</template>
		</MkInput>
	</div>

	<div v-if="searching" class="searching">
		<MkLoading />
	</div>

	<div v-else-if="results.length > 0" class="results">
		<div class="result-count">
			{{ i18n.ts._yami.searchResultsCount(results.length) }}
		</div>
		<div class="notes">
			<MkNote
				v-for="note in results"
				:key="note.id"
				:note="note"
				:detail="false"
			/>
		</div>
	</div>

	<div v-else-if="searched && results.length === 0" class="no-results">
		<div class="no-results-icon">
			<i class="ti ti-search-off"></i>
		</div>
		<div class="no-results-text">
			{{ i18n.ts._yami.noYamiNotesFound }}
		</div>
	</div>

	<div v-else class="search-tips">
		<div class="tips-title">
			<i class="ti ti-lightbulb"></i>
			{{ i18n.ts._yami.searchTips }}
		</div>
		<div class="tips-content">
			<ul>
				<li>{{ i18n.ts._yami.searchTip1 }}</li>
				<li>{{ i18n.ts._yami.searchTip2 }}</li>
				<li>{{ i18n.ts._yami.searchTip3 }}</li>
			</ul>
		</div>
	</div>
</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import MkInput from '@/components/MkInput.vue';
import MkNote from '@/components/MkNote.vue';
import MkLoading from '@/components/MkLoading.vue';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import { api } from '@/os.js';
import type { Note } from 'misskey-js/built/entities';

const query = ref('');
const searching = ref(false);
const searched = ref(false);
const results = ref<Note[]>([]);

const search = async () => {
	const trimmedQuery = query.value.trim();
	if (!trimmedQuery) return;
	if (!$i?.isInYamiMode) return;

	// クエリの長さ制限（フロントエンド側でもチェック）
	if (trimmedQuery.length > 1000) {
		alert(i18n.ts._yami.queryTooLong);
		return;
	}

	// 特殊文字のサニタイズ（基本的なXSS防止）
	const sanitizedQuery = trimmedQuery.replace(/[<>]/g, '');
	if (sanitizedQuery !== trimmedQuery) {
		alert(i18n.ts._yami.invalidQuery);
		return;
	}

	searching.value = true;
	searched.value = true;

	try {
		const notes = await api('notes/yami-search', {
			query: sanitizedQuery,
			limit: 20,
		});
		results.value = notes;
	} catch (error) {
		console.error('Yami search error:', error);
		results.value = [];
	} finally {
		searching.value = false;
	}
};

const clear = () => {
	query.value = '';
	results.value = [];
	searched.value = false;
};
</script>

<style scoped>
.yami-search {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.search-input {
	position: relative;
}

.clear-button {
	background: none;
	border: none;
	color: var(--fg);
	cursor: pointer;
	padding: 0.5rem;
	border-radius: 0.5rem;
	transition: background-color 0.2s;
}

.clear-button:hover {
	background-color: var(--bg);
}

.searching {
	display: flex;
	justify-content: center;
	padding: 2rem;
}

.results {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.result-count {
	font-size: 0.9rem;
	color: var(--fg);
	opacity: 0.7;
	padding: 0.5rem 0;
}

.notes {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.no-results {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 3rem 1rem;
	text-align: center;
}

.no-results-icon {
	font-size: 3rem;
	color: var(--fg);
	opacity: 0.5;
	margin-bottom: 1rem;
}

.no-results-text {
	color: var(--fg);
	opacity: 0.7;
}

.search-tips {
	background: var(--bg);
	border-radius: 0.5rem;
	padding: 1rem;
}

.tips-title {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	font-weight: bold;
	margin-bottom: 0.5rem;
	color: var(--fg);
}

.tips-content ul {
	margin: 0;
	padding-left: 1.5rem;
	color: var(--fg);
	opacity: 0.8;
}

.tips-content li {
	margin-bottom: 0.25rem;
}
</style> 