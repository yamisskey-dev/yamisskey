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
import { ref, watch, computed, onMounted, onUnmounted, type Ref, nextTick } from 'vue';
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
import { search } from '@/scripts/search';
import { host } from '@/config';
import { defaultStore } from '@/store';
import { misskeyApi } from '@/scripts/misskey-api';

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
const user = ref<MiUser | null>(null); // Initialize as null
const notesEl = ref<{ pagingComponent?: any }>();
const isLoading = ref(false);
let currentChannel: StreamChannel | null = null;

// Initialize with current user if available
onMounted(async () => {
	if ($i) {
		user.value = $i;
	}
});

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
	endpoint: 'users/notes' as const, // 'notes/user-timeline' から変更
	params: {
		userId: user.value?.id,
		limit: 15,
		withFiles: widgetProps.withFiles,
		withReplies: widgetProps.withReplies,
		includeMyRenotes: true,
		includeRenotedMyNotes: true,
		allowPartial: true,
		useDbFallback: true,
	},
}));

const { widgetProps, configure, save } = useWidgetPropsManager(name,
	widgetPropsDef,
	props,
	emit,
);

// Modified userInfo computed property
const userInfo = computed(() => {
	const userName = user.value
		? `@${user.value.username}${user.value.host ? `@${user.value.host}` : ''}`
		: i18n.ts.unableToResolveUser;
	return `${i18n.ts._widgets.userNotes} ${userName}`;
});

// Fix reload functionality
const reload = async () => {
	if (!notesEl.value?.pagingComponent) return;

	try {
		isLoading.value = true;
		// 明示的にページングコンポーネントをリセット
		await notesEl.value.pagingComponent.reload();
		timelineKey.value++; // 強制的に更新
	} catch (error) {
		console.error('Failed to reload notes:', error);
		os.toast({
			type: 'error',
			text: i18n.ts.failedToReload,
		});
	} finally {
		isLoading.value = false;
	}
};

// Enhanced user resolution with proper error handling
const resolveUser = async (acct: string): Promise<MiUser | null> => {
	if (!acct) return $i;

	try {
		const clean = acct.replace(/^@/, '');
		const [username, host] = clean.split('@');

		if (!username) return $i;

		try {
			// Try direct user lookup using misskeyApi
			const response = await misskeyApi('users/show', {
				username,
				host: host || null,
			});
			return response;
		} catch (e) {
			console.warn('Direct lookup failed, trying search:', e);

			// Try search as fallback using misskeyApi
			const searchResponse = await misskeyApi('users/search', {
				query: username,
				host: host || null,
				limit: 1,
			});

			if (searchResponse && searchResponse.length > 0) {
				return searchResponse[0];
			}

			// If both methods fail, try remote resolution
			if (host) {
				try {
					const remoteResponse = await misskeyApi('ap/show', {
						uri: `https://${host}/@${username}`,
					});
					return remoteResponse.user;
				} catch (e) {
					console.warn('Remote resolution failed:', e);
				}
			}

			return null;
		}
	} catch (e) {
		console.error('Failed to resolve user:', e);
		return null;
	}
};

// Improved stream setup with proper event handling
const setupStream = (userId: string, withFiles: boolean, withReplies: boolean): StreamChannel[] => {
	const stream = useStream();
	const channels: StreamChannel[] = [];

	// Connect to home timeline for following users' notes (including private notes)
	const homeChannel = stream.useChannel('homeTimeline', {
		withFiles,
		withReplies,
	});

	// Connect to global timeline for public notes
	const globalChannel = stream.useChannel('globalTimeline', {
		withFiles,
		withReplies,
	});

	// Improved note handling function with debounce
	const handleNote = async (note: Note) => {
		if (note.userId === userId && notesEl.value?.pagingComponent) {
			try {
				console.log('Received note:', note);
				// プリペンドの前にチェック
				const existingNotes = notesEl.value.pagingComponent.items || [];
				if (!existingNotes.some(n => n.id === note.id)) {
					await notesEl.value.pagingComponent.prepend([note]);
				}
			} catch (e) {
				console.error('Failed to prepend note:', e);
			}
		}
	};

	// Set up note handlers with proper event binding
	homeChannel.on('note', handleNote);
	globalChannel.on('note', handleNote);

	// Improved deletion handling
	const handleDeletion = async (deletedNote: DeletedNote) => {
		if (notesEl.value?.pagingComponent) {
			try {
				notesEl.value.pagingComponent.removeItem(deletedNote.id);
			} catch (e) {
				console.error('Failed to remove note:', e);
			}
		}
	};

	homeChannel.on('deleted', handleDeletion);
	globalChannel.on('deleted', handleDeletion);

	// Add connection status handlers
	[homeChannel, globalChannel].forEach(channel => {
		channel.on('_connected_', () => {
			console.log('Channel connected');
		});

		channel.on('_disconnected_', () => {
			console.warn('Channel disconnected');
		});
	});

	channels.push(homeChannel, globalChannel);
	return channels;
};

// Enhanced retry logic with proper error handling
const MAX_RETRIES = 3;
const setupStreamWithRetry = async (
	userId: string,
	withFiles: boolean,
	withReplies: boolean,
	retryCount = 0,
): Promise<StreamChannel[]> => {
	try {
		const channels = setupStream(userId, withFiles, withReplies);
		return channels;
	} catch (error) {
		console.error(`Stream connection failed (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
		if (retryCount < MAX_RETRIES) {
			await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
			return setupStreamWithRetry(userId, withFiles, withReplies, retryCount + 1);
		}
		throw new Error('Failed to establish stream connection after multiple attempts');
	}
};

// Improved note handling function
const handleNote = async (note: Note) => {
	if (note.userId === user.value?.id && notesEl.value?.pagingComponent) {
		try {
			console.log('Received note:', note);
			const existingNotes = notesEl.value.pagingComponent.items || [];

			// Check for duplicates and ensure proper ordering
			if (!existingNotes.some(n => n.id === note.id)) {
				await notesEl.value.pagingComponent.prepend([note]);
				// Force a UI update
				nextTick(() => {
					timelineKey.value++;
				});
			}
		} catch (e) {
			console.error('Failed to prepend note:', e);
		}
	}
};

// Modified stream management to handle multiple channels
let currentChannels: StreamChannel[] = [];

// Update the watch handler
watch(() => user.value?.id, async () => {
	// Cleanup existing connections
	if (currentChannels.length > 0) {
		currentChannels.forEach(channel => channel.dispose());
		currentChannels = [];
	}

	if (user.value?.id) {
		try {
			currentChannels = await setupStream(
				user.value.id,
				widgetProps.withFiles,
				widgetProps.withReplies,
			);
		} catch (error) {
			console.error('Failed to setup streams:', error);
			os.toast({
				type: 'error',
				text: i18n.ts.failedToConnect,
			});
		}
	}
}, { immediate: true });

// Improved watch handler for timeline updates
watch(() => timelineKey.value, () => {
	if (notesEl.value?.pagingComponent) {
		notesEl.value.pagingComponent.reload();
	}
}, { flush: 'post' }); // flush: 'post'を追加して更新タイミングを制御

// Modified watch handler for userAcct changes
watch(() => widgetProps.userAcct, async (newAcct) => {
	if (!newAcct) {
		user.value = $i;
		return;
	}

	try {
		isLoading.value = true;
		const resolved = await resolveUser(newAcct);

		if (resolved) {
			user.value = resolved;
			timelineKey.value++; // Force timeline refresh
		} else {
			user.value = null;
		}
	} catch (e) {
		console.error('Failed to resolve user:', e);
		user.value = null;
	} finally {
		isLoading.value = false;
	}
}, { immediate: true });

onMounted(() => {
	// refreshInterval は削除
});

// Proper cleanup
onUnmounted(() => {
	if (currentChannels.length > 0) {
		currentChannels.forEach(channel => channel.dispose());
		currentChannels = [];
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
