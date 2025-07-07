<template>
<div class="_gaps">
	<FormSection first>
		<template #label>{{ i18n.ts._yami.yamiMode }}</template>
		<YamiModeSwitcher></YamiModeSwitcher>
	</FormSection>

	<FormSection>
		<template #label>{{ i18n.ts._yami.yamiSet }}</template>
		<div class="_gaps_m">
			<MkPreferenceContainer k="defaultIsNoteInYamiMode">
				<MkSwitch v-model="defaultIsNoteInYamiMode">
					<template #label>{{ i18n.ts._yami.defaultUseYamiNote }}</template>
					<template #caption>{{ i18n.ts._yami.defaultUseYamiNoteDescription }}</template>
				</MkSwitch>
			</MkPreferenceContainer>

			<MkPreferenceContainer k="showYamiNonFollowingPublicNotes">
				<MkSwitch v-model="showYamiNonFollowingPublicNotes">
					<template #label>{{ i18n.ts._yami.showYamiNonFollowingPublicNotes }}</template>
					<template #caption>{{ i18n.ts._yami.showYamiNonFollowingPublicNotes }}</template>
				</MkSwitch>
			</MkPreferenceContainer>

			<MkPreferenceContainer k="showYamiFollowingNotes">
				<MkSwitch v-model="showYamiFollowingNotes">
					<template #label>{{ i18n.ts._yami.showYamiFollowingNotes }}</template>
					<template #caption>{{ i18n.ts._yami.showYamiFollowingNotes }}</template>
				</MkSwitch>
			</MkPreferenceContainer>
		</div>
	</FormSection>

	<FormSection>
		<template #label>{{ i18n.ts._yami.yamiNoteFederationEnabled }}</template>
		<div class="_gaps_m">
			<MkPreferenceContainer k="yamiNoteFederationEnabled">
				<MkSwitch v-model="yamiNoteFederationEnabled">
					<template #label>{{ i18n.ts._yami.yamiNoteFederationEnabled }}</template>
					<template #caption>{{ i18n.ts._yami.yamiNoteFederationWarning }}</template>
				</MkSwitch>
			</MkPreferenceContainer>

			<MkPreferenceContainer k="yamiNoteFederationTrustedInstances">
				<MkTextarea v-model="yamiNoteFederationTrustedInstances">
					<template #label>{{ i18n.ts._yami.yamiNoteFederationTrustedInstances }}</template>
					<template #caption>{{ i18n.ts._yami.yamiNoteFederationTrustedInstancesDescription }}</template>
				</MkTextarea>
			</MkPreferenceContainer>
		</div>
	</FormSection>

	<FormSection>
		<template #label>{{ i18n.ts._yami.searchEngineDescription }}</template>
		<div class="_gaps_m">
			<MkPreferenceContainer k="yamiSearchEngine">
				<MkSelect v-model="yamiSearchEngine">
					<option value="google">Google</option>
					<option value="bing">Bing</option>
					<option value="duckduckgo">DuckDuckGo</option>
					<option value="searxng">SearXNG</option>
				</MkSelect>
			</MkPreferenceContainer>
		</div>
	</FormSection>
</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import FormSection from '@/components/form/section.vue';
import YamiModeSwitcher from '@/components/YamiModeSwitcher.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkPreferenceContainer from '@/components/MkPreferenceContainer.vue';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';

const defaultIsNoteInYamiMode = computed($i ? {
	get: () => $i.policies.canYamiNote && $i.clientSettings.defaultIsNoteInYamiMode,
	set: (value) => {
		// 権限チェック
		if (!$i.policies.canYamiNote) {
			console.warn('User does not have yami note permission');
			return;
		}
		$i.clientSettings.defaultIsNoteInYamiMode = value;
	},
} : () => false);

const showYamiNonFollowingPublicNotes = computed($i ? {
	get: () => $i.clientSettings.showYamiNonFollowingPublicNotes ?? true,
	set: (value) => {
		$i.clientSettings.showYamiNonFollowingPublicNotes = value;
	},
} : () => true);

const showYamiFollowingNotes = computed($i ? {
	get: () => $i.clientSettings.showYamiFollowingNotes ?? true,
	set: (value) => {
		$i.clientSettings.showYamiFollowingNotes = value;
	},
} : () => true);

const yamiNoteFederationEnabled = computed($i ? {
	get: () => $i.clientSettings.yamiNoteFederationEnabled ?? false,
	set: (value) => {
		$i.clientSettings.yamiNoteFederationEnabled = value;
	},
} : () => false);

const yamiNoteFederationTrustedInstances = computed($i ? {
	get: () => $i.clientSettings.yamiNoteFederationTrustedInstances ?? '',
	set: (value) => {
		$i.clientSettings.yamiNoteFederationTrustedInstances = value;
	},
} : () => '');

const yamiSearchEngine = computed($i ? {
	get: () => $i.clientSettings.yamiSearchEngine ?? 'google',
	set: (value) => {
		$i.clientSettings.yamiSearchEngine = value;
	},
} : () => 'google');

definePageMetadata({
	title: i18n.ts._yami.yamiSet,
	icon: 'ti ti-moon',
});
</script> 