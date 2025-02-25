<template>
<MkContainer
	:style="`height: ${widgetProps.height}px;`"
	:showHeader="widgetProps.showHeader"
	:scrollable="true"
	class="mkw-userNotes"
>
	<template #icon><i class="ti ti-user-circle"></i></template>
	<template #header>{{ userInfo }}</template>
	<template #func="{ buttonStyleClass }">
		<button class="_button" :class="buttonStyleClass" :title="i18n.ts.reload" @click="reload">
			<i class="ti ti-reload"></i>
		</button>
		<button class="_button" :class="buttonStyleClass" :title="i18n.ts.settings" @click="configure">
			<i class="ti ti-settings"></i>
		</button>
	</template>

	<div>
		<MkNotes
			v-if="user && !isLoading"
			:key="timelineKey"
			ref="notesEl"
			class="notes"
			:pagination="pagination"
			:noGap="true"
		/>
		<MkLoading v-else-if="isLoading"/>
		<div v-else class="empty">
			<i class="ti ti-search"></i>
			<span>{{ i18n.ts.userNotFound }}</span>
		</div>
	</div>
</MkContainer>
</template>

<script lang="ts" setup>
import { ref, watch, computed, onMounted, onUnmounted, type Ref } from 'vue';
import { useWidgetPropsManager, WidgetComponentEmits, WidgetComponentExpose, WidgetComponentProps } from './widget';
import type { Paging } from '@/components/MkPagination.vue';
import type { MiUser } from 'misskey-js';
import type { StreamChannel } from '@/stream';
import { GetFormResultType } from '@/scripts/form';
import MkContainer from '@/components/MkContainer.vue';
import MkNotes from '@/components/MkNotes.vue';
import * as os from '@/os';
import { $i } from '@/account';
import { useStream } from '@/stream';
import { i18n } from '@/i18n.js';

// Type definitions
interface DeletedNote {
  id: string;
}

interface Note {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
}

const name = 'userNotes';
const timelineKey = ref(0);
const user = ref<MiUser | null>($i);
const notesEl = ref<{ pagingComponent?: any }>();
const isLoading = ref(false);
let currentChannel: StreamChannel | null = null;

const widgetPropsDef = {
	showHeader: {
		type: 'boolean' as const,
		default: true,
	},
	height: {
		type: 'number' as const,
		default: 300,
	},
	withFiles: {
		type: 'boolean' as const,
		default: false,
	},
	withReplies: {
		type: 'boolean' as const,
		default: false,
	},
	userAcct: {
		type: 'string' as const,
		default: $i ? `@${$i.username}${$i.host ? `@${$i.host}` : ''}` : '',
	},
};

type WidgetProps = GetFormResultType<typeof widgetPropsDef>;

const props = defineProps<WidgetComponentProps<WidgetProps>>();
const emit = defineEmits<WidgetComponentEmits<WidgetProps>>();

const pagination = computed(() => ({
	endpoint: 'users/notes' as const,
	params: {
		userId: user.value?.id,
		limit: 15,
		withFiles: widgetProps.withFiles,
		withReplies: widgetProps.withReplies,
		includeMyRenotes: true,
		includeRenotedMyNotes: true,
	},
} as Paging));

const { widgetProps, configure, save } = useWidgetPropsManager(name,
	widgetPropsDef,
	props,
	emit,
);

const userInfo = computed(() => {
	const userName = user.value
		? `@${user.value.username}${user.value.host ? `@${user.value.host}` : ''}`
		: i18n.ts.unableToResolveUser;
	return `${userName} ${i18n.ts._widgets.userNotes}`;
});

// Optimized reload function
const reload = async () => {
	if (!notesEl.value?.pagingComponent) return;

	try {
		isLoading.value = true;
		await notesEl.value.pagingComponent.reload();
	} catch (error) {
		console.error('Failed to reload notes:', error);
		// Implement error notification if needed
	} finally {
		isLoading.value = false;
	}
};

// Enhanced user resolution with proper error handling
const resolveUser = async (acct: string): Promise<MiUser | null> => {
	if (!acct) return null;
	try {
		const match = acct.match(/^@?(.+?)(?:@(.+))?$/);
		if (!match) throw new Error('Invalid account format');

		const [, username, host] = match;
		return await os.api('users/show', {
			username,
			host: host || null,
		});
	} catch (e) {
		console.error('Failed to resolve user:', e);
		throw e; // Let the caller handle the error
	}
};

// Memoized stream setup function
const setupStream = (userId: string, withFiles: boolean, withReplies: boolean) => {
	const stream = useStream();
	return stream.useChannel('userTimeline', {
		userId,
		withFiles,
		withReplies,
	});
};

// Enhanced retry logic with proper error handling
const MAX_RETRIES = 3;
const setupStreamWithRetry = async (
	userId: string,
	withFiles: boolean,
	withReplies: boolean,
	retryCount = 0,
): Promise<StreamChannel> => {
	try {
		const channel = setupStream(userId, withFiles, withReplies);
		return channel;
	} catch (error) {
		console.error(`Stream connection failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
		if (retryCount < MAX_RETRIES) {
			await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
			return setupStreamWithRetry(userId, withFiles, withReplies, retryCount + 1);
		}
		throw new Error('Failed to establish stream connection after multiple attempts');
	}
};

// Optimized stream management
watch(() => user.value?.id, async () => {
	if (currentChannel) {
		currentChannel.dispose();
		currentChannel = null;
	}

	if (user.value?.id) {
		try {
			currentChannel = await setupStreamWithRetry(
				user.value.id,
				widgetProps.withFiles,
				widgetProps.withReplies,
			);

			currentChannel.on('note', async (note: Note) => {
				if (note.userId === user.value?.id && notesEl.value?.pagingComponent) {
					await notesEl.value.pagingComponent.prepend([note]);
				}
			});

			currentChannel.on('deleted', async (deletedNote: DeletedNote) => {
				if (notesEl.value?.pagingComponent) {
					notesEl.value.pagingComponent.removeItem(deletedNote.id);
				}
			});

			currentChannel.on('error', (error: Error) => {
				console.error('Stream error:', error);
				// Implement error notification if needed
			});
		} catch (error) {
			console.error('Failed to setup stream:', error);
			// Implement error notification if needed
		}
	}
}, { immediate: true });

// タイムラインのリロードを監視
watch(() => timelineKey.value, () => {
	if (notesEl.value?.pagingComponent) {
		notesEl.value.pagingComponent.reload();
	}
});

onMounted(() => {
	// refreshInterval は削除
});

// Proper cleanup
onUnmounted(() => {
	if (currentChannel) {
		currentChannel.dispose();
		currentChannel = null;
	}
});

defineExpose<WidgetComponentExpose>({
	name: i18n.ts._widgets.userNotes,
	configure,
	id: props.widget ? props.widget.id : null,
});
</script>

<style lang="scss" module>
.content {
  height: 100%;
  overflow-y: auto;
  background: var(--panel);
  border-radius: var(--radius);

  :global(.notes) {
    height: 100%;
    padding: 8px;

    :global(.note-enter-active),
    :global(.note-leave-active) {
      transition: all 0.3s ease;
    }

    :global(.note-enter-from),
    :global(.note-leave-to) {
      opacity: 0;
      transform: translateY(-20px);
    }

    :global(.note-move) {
      transition: transform 0.3s ease;
    }
  }

  .empty {
    padding: 16px;
    text-align: center;
    color: var(--fg);
    opacity: 0.7;

    > i {
      display: block;
      font-size: 24px;
      margin-bottom: 8px;
    }
  }
}
</style>
