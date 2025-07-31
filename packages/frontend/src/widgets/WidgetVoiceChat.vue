<!--
SPDX-FileCopyrightText: hitalin
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.widget">
	<!-- Widget Header -->
	<div :class="$style.header">
		<h3 :class="$style.title">
			<i class="ti ti-microphone"></i>
			{{ i18n.ts.voiceChat }}
		</h3>
		<button
			v-if="$i"
			:class="$style.createButton"
			:title="i18n.ts.voiceChatCreateRoom"
			@click="showCreateRoomModal = true"
		>
			<i class="ti ti-plus"></i>
		</button>
	</div>

	<!-- Active rooms list -->
	<div v-if="activeRooms.length > 0" :class="$style.roomsList">
		<div
			v-for="room in activeRooms"
			:key="room.id"
			:class="$style.roomItem"
			@click="joinRoom(room.id)"
		>
			<div :class="$style.roomInfo">
				<div :class="$style.roomTitle">{{ room.title }}</div>
				<div :class="$style.roomMeta">
					<span :class="$style.participants">
						<i class="ti ti-users"></i>
						{{ room.participantCount }}
					</span>
					<span :class="$style.host">
						<i class="ti ti-crown"></i>
						{{ room.host?.name || room.host?.username }}
					</span>
				</div>
			</div>
			<button :class="$style.joinButton">
				<i class="ti ti-login"></i>
			</button>
		</div>
	</div>

	<!-- No active rooms message -->
	<div v-else :class="$style.emptyState">
		<i class="ti ti-microphone-off"></i>
		<p>{{ i18n.ts.noActiveVoiceRooms }}</p>
		<MkButton v-if="$i" primary rounded @click="showCreateRoomModal = true">
			{{ i18n.ts.voiceChatCreateRoom }}
		</MkButton>
	</div>

	<!-- Voice Chat Overlay -->
	<div v-if="showVoiceChatOverlay" :class="$style.voiceChatOverlay">
		<div :class="$style.voiceChatContainer">
			<div :class="$style.voiceChatHeader">
				<div :class="$style.voiceChatTitle">
					<i class="ti ti-microphone"></i>
					<span v-if="roomInfo?.title">{{ roomInfo.title }}</span>
					<span v-else>{{ i18n.ts.voiceChat }}</span>
				</div>
				<div :class="$style.headerActions">
					<button
						v-if="roomInfo?.status === 'active'"
						:class="$style.inviteButton"
						@click="showInviteModal = true"
					>
						<i class="ti ti-user-plus"></i>
					</button>
					<button :class="$style.closeButton" @click="closeVoiceChat">
						<i class="ti ti-x"></i>
					</button>
				</div>
			</div>

			<!-- Room Info Section -->
			<div v-if="roomInfo && roomInfo.status === 'waiting'" :class="$style.roomInfoSection">
				<div :class="$style.roomTitleLarge">{{ roomInfo.title }}</div>
				<div v-if="roomInfo.description" :class="$style.roomDescription">{{ roomInfo.description }}</div>
				<div :class="$style.roomMeta">
					<div :class="$style.hostInfo">
						<i class="ti ti-crown"></i>
						<span>{{ i18n.ts.voiceChatHost }}: {{ roomInfo.host?.name || roomInfo.host?.username }}</span>
					</div>
					<div :class="$style.participantInfo">
						<i class="ti ti-users"></i>
						<span>{{ roomInfo.participantCount }} {{ i18n.ts.voiceChatParticipants }}</span>
					</div>
				</div>
			</div>

			<!-- Waiting Room State -->
			<div v-if="roomInfo?.status === 'waiting'" :class="$style.waitingRoom">
				<div v-if="roomInfo.isHost" :class="$style.hostControls">
					<div :class="$style.waitingMessage">
						{{ i18n.ts.voiceChatWaitingToStart }}
					</div>
					<MkButton primary rounded gradate @click="startSession">
						<i class="ti ti-play"></i>
						{{ i18n.ts.voiceChatStartSession }}
					</MkButton>
				</div>
				<div v-else :class="$style.listenerWaiting">
					<div :class="$style.waitingMessage">
						{{ i18n.ts.voiceChatWaitingToStart }}
					</div>
					<div :class="$style.waitingIcon">
						<i class="ti ti-clock"></i>
					</div>
				</div>
			</div>

			<!-- Active Session State -->
			<div v-else-if="roomInfo?.status === 'active' && !isConnected" :class="$style.joinSection">
				<div :class="$style.joinTitle">{{ i18n.ts.voiceChatJoinSession }}</div>
				<div :class="$style.joinButtons">
					<MkButton primary rounded @click="joinAsListener">
						<i class="ti ti-volume"></i>
						{{ i18n.ts.joinAsListener }}
					</MkButton>
					<MkButton primary rounded gradate @click="joinAsSpeaker">
						<i class="ti ti-microphone"></i>
						{{ i18n.ts.joinAsSpeaker }}
					</MkButton>
				</div>
			</div>

			<div v-else :class="$style.chatInterface">
				<div :class="$style.participants">
					<div :class="$style.speakers">
						<div :class="$style.sectionTitle">
							<i class="ti ti-microphone"></i>
							{{ i18n.ts.speakers }}
						</div>
						<div :class="$style.speakerList">
							<div
								v-for="speaker in speakers"
								:key="speaker.id"
								:class="[$style.participant, { [$style.speaking]: speaker.isSpeaking, [$style.muted]: speaker.isMuted }]"
							>
								<MkAvatar :user="speaker.user" :class="$style.avatar"/>
								<div :class="$style.participantInfo">
									<div :class="$style.participantName">{{ speaker.user.name || speaker.user.username }}</div>
									<div v-if="speaker.isMuted" :class="$style.mutedIndicator">
										<i class="ti ti-microphone-off"></i>
									</div>
								</div>
								<div v-if="speaker.isSpeaking" :class="$style.speakingIndicator">
									<div :class="$style.waveform">
										<div></div>
										<div></div>
										<div></div>
										<div></div>
									</div>
								</div>
							</div>
						</div>
					</div>

					<div v-if="listeners.length > 0" :class="$style.listeners">
						<div :class="$style.sectionTitle">
							<i class="ti ti-volume"></i>
							{{ i18n.ts.listeners }} ({{ listeners.length }})
						</div>
						<div :class="$style.listenerList">
							<MkAvatar
								v-for="listener in listeners.slice(0, 8)"
								:key="listener.id"
								:user="listener.user"
								:class="$style.listenerAvatar"
							/>
							<div v-if="listeners.length > 8" :class="$style.moreListeners">
								+{{ listeners.length - 8 }}
							</div>
						</div>
					</div>
				</div>

				<div :class="$style.controls">
					<button
						v-if="currentUserRole === 'speaker'"
						:class="[$style.controlButton, { [$style.muted]: isMuted }]"
						@click="toggleMute"
					>
						<i :class="isMuted ? 'ti ti-microphone-off' : 'ti ti-microphone'"></i>
					</button>

					<button
						v-if="currentUserRole === 'listener'"
						:class="$style.controlButton"
						@click="requestToSpeak"
					>
						<i class="ti ti-hand"></i>
					</button>

					<button :class="[$style.controlButton, $style.leaveButton]" @click="leaveVoiceChat">
						<i class="ti ti-phone-off"></i>
					</button>
				</div>
			</div>

			<div v-if="connectionError" :class="$style.error">
				{{ connectionError }}
			</div>
		</div>

		<!-- Invite Modal -->
		<div v-if="showInviteModal" :class="$style.inviteModal" @click.self="showInviteModal = false">
			<div :class="$style.inviteModalContent">
				<div :class="$style.inviteModalHeader">
					<h3>{{ i18n.ts.voiceChatInviteUsers }}</h3>
					<button :class="$style.inviteModalClose" @click="showInviteModal = false">
						<i class="ti ti-x"></i>
					</button>
				</div>
				<div :class="$style.inviteModalBody">
					<MkInput
						v-model="inviteUserQuery"
						:placeholder="i18n.ts.voiceChatInviteUsersPlaceholder"
						@update:modelValue="searchUsers"
					>
						<template #prefix><i class="ti ti-search"></i></template>
					</MkInput>
					<div v-if="searchedUsers.length > 0" :class="$style.userSearchResults">
						<div
							v-for="user in searchedUsers"
							:key="user.id"
							:class="$style.userSearchResult"
							@click="inviteUser(user)"
						>
							<MkAvatar :user="user" :class="$style.searchResultAvatar"/>
							<div :class="$style.searchResultInfo">
								<div :class="$style.searchResultName">{{ user.name || user.username }}</div>
								<div :class="$style.searchResultUsername">@{{ user.username }}</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Create Room Modal -->
	<div v-if="showCreateRoomModal" :class="$style.createRoomOverlay" @click.self="showCreateRoomModal = false">
		<div :class="$style.createRoomModal">
			<div :class="$style.createRoomHeader">
				<h2>{{ i18n.ts.voiceChatCreateRoom }}</h2>
				<button :class="$style.closeButton" @click="showCreateRoomModal = false">
					<i class="ti ti-x"></i>
				</button>
			</div>

			<div :class="$style.createRoomBody">
				<MkInput v-model="roomTitle" :placeholder="i18n.ts.voiceChatTitlePlaceholder" :maxlength="100">
					<template #label>{{ i18n.ts.voiceChatTitle }}</template>
				</MkInput>

				<MkTextarea v-model="roomDescription" :placeholder="i18n.ts.voiceChatRoomDescriptionPlaceholder" :maxlength="500">
					<template #label>{{ i18n.ts.voiceChatRoomDescription }}</template>
				</MkTextarea>
			</div>

			<div :class="$style.createRoomFooter">
				<MkButton @click="showCreateRoomModal = false">{{ i18n.ts.cancel }}</MkButton>
				<MkButton :disabled="!roomTitle.trim() || creating" primary @click="createRoom">
					<MkLoading v-if="creating" mini/>
					{{ i18n.ts.voiceChatCreateRoom }}
				</MkButton>
			</div>
		</div>
	</div>
</div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkLoading from '@/components/global/MkLoading.vue';
import MkAvatar from '@/components/global/MkAvatar.vue';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import * as os from '@/os.js';

// Widget state
const activeRooms = ref([]);
const showCreateRoomModal = ref(false);
const showVoiceChatOverlay = ref(false);
const currentRoomId = ref<string | null>(null);

// Create room state
const roomTitle = ref('');
const roomDescription = ref('');
const creating = ref(false);

// Voice chat state
const roomInfo = ref<{
	title?: string;
	description?: string;
	status: 'waiting' | 'active';
	host?: { name?: string; username: string };
	participantCount: number;
	isHost: boolean;
} | null>(null);
const sessionId = ref<string | null>(null);
const showInviteModal = ref(false);
const inviteUserQuery = ref('');
const searchedUsers = ref([]);
const isConnected = ref(false);
const isMuted = ref(false);
const currentUserRole = ref<'speaker' | 'listener' | null>(null);
const connectionError = ref<string | null>(null);

// Sample data
const speakers = ref([
	{
		id: '1',
		user: $i,
		isSpeaking: false,
		isMuted: false,
	},
]);
const listeners = ref([]);

// WebRTC related
let peerConnection: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;

// Load active rooms
async function loadActiveRooms() {
	if (!$i) return;

	try {
		const rooms = await misskeyApi('voice-chat/get-active-rooms', {});
		activeRooms.value = rooms;
	} catch (error) {
		console.error('Failed to load active rooms:', error);
	}
}

// Create room
async function createRoom() {
	if (!roomTitle.value.trim() || creating.value) return;

	creating.value = true;
	try {
		const result = await misskeyApi('voice-chat/create-room', {
			title: roomTitle.value.trim(),
			description: roomDescription.value.trim() || undefined,
		});

		os.alert({
			type: 'success',
			text: i18n.ts.voiceChatRoomCreated,
		});

		showCreateRoomModal.value = false;
		roomTitle.value = '';
		roomDescription.value = '';

		// Join the created room
		joinRoom(result.roomId);

		// Reload active rooms
		await loadActiveRooms();
	} catch (error) {
		console.error('Failed to create room:', error);
		os.alert({
			type: 'error',
			text: error.message ?? 'Failed to create room',
		});
	} finally {
		creating.value = false;
	}
}

// Join room
async function joinRoom(roomId: string) {
	currentRoomId.value = roomId;
	showVoiceChatOverlay.value = true;
	await loadRoomInfo();
}

// Load room information
async function loadRoomInfo() {
	if (!currentRoomId.value) return;

	try {
		roomInfo.value = await misskeyApi('voice-chat/get-room', {
			roomId: currentRoomId.value,
		});
	} catch (error) {
		console.error('Failed to load room info:', error);
		connectionError.value = 'Failed to load room information';
	}
}

// Start session (host only)
async function startSession() {
	if (!currentRoomId.value || !roomInfo.value?.isHost) return;

	try {
		const result = await misskeyApi('voice-chat/start-session', {
			roomId: currentRoomId.value,
		});

		sessionId.value = result.sessionId;
		roomInfo.value.status = 'active';

		os.alert({
			type: 'success',
			text: i18n.ts.voiceChatSessionStarted,
		});
	} catch (error) {
		console.error('Failed to start session:', error);
		os.alert({
			type: 'error',
			text: error.message ?? 'Failed to start session',
		});
	}
}

// Voice chat methods
async function joinAsListener() {
	try {
		currentUserRole.value = 'listener';
		await connectToVoiceChat('listener');
	} catch (error) {
		console.error('Failed to join as listener:', error);
		connectionError.value = i18n.ts.failedToJoinVoiceChat;
	}
}

async function joinAsSpeaker() {
	try {
		currentUserRole.value = 'speaker';
		await connectToVoiceChat('speaker');
	} catch (error) {
		console.error('Failed to join as speaker:', error);
		connectionError.value = i18n.ts.failedToJoinVoiceChat;
	}
}

async function connectToVoiceChat(role: 'speaker' | 'listener') {
	try {
		if (!currentRoomId.value) {
			throw new Error('No room ID provided');
		}

		// Join session
		const sessionResponse = await misskeyApi('voice-chat/join-session', {
			roomId: currentRoomId.value,
			role: role,
		});
		sessionId.value = sessionResponse.sessionId;

		// Create peer connection
		peerConnection = new RTCPeerConnection({
			iceServers: [
				{
					urls: 'stun:stun.cloudflare.com:3478',
				},
			],
			bundlePolicy: 'max-bundle',
		});

		// Set up event handlers
		peerConnection.oniceconnectionstatechange = () => {
			console.log('ICE connection state:', peerConnection?.iceConnectionState);
		};

		peerConnection.ontrack = (event) => {
			console.log('Received track:', event.track);
		};

		if (role === 'speaker') {
			localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
			localStream.getTracks().forEach(track => {
				if (peerConnection) {
					peerConnection.addTransceiver(track, {
						direction: 'sendrecv',
					});
				}
			});
		}

		// Create offer
		const offer = await peerConnection.createOffer();
		await peerConnection.setLocalDescription(offer);

		// Send offer to server
		const response = await misskeyApi('voice-chat/manage-tracks', {
			sessionId: sessionId,
			sessionDescription: {
				type: offer.type,
				sdp: offer.sdp,
			},
			tracks: role === 'speaker' ? [{
				trackLocation: 'local' as const,
				trackName: 'user-audio',
				kind: 'audio',
				bidirectionalMediaStream: true,
			}] : [],
		});

		// Set remote description
		if (response.sessionDescription) {
			await peerConnection.setRemoteDescription(new RTCSessionDescription(response.sessionDescription));
		}

		isConnected.value = true;
		connectionError.value = null;
	} catch (error) {
		console.error('Failed to connect to voice chat:', error);
		throw error;
	}
}

function toggleMute() {
	if (localStream) {
		const audioTracks = localStream.getAudioTracks();
		if (audioTracks.length > 0) {
			const audioTrack = audioTracks[0];
			audioTrack.enabled = !audioTrack.enabled;
			isMuted.value = !audioTrack.enabled;
		}
	}
}

function requestToSpeak() {
	console.log('Request to speak');
}

function leaveVoiceChat() {
	cleanup();
	isConnected.value = false;
	currentUserRole.value = null;
	closeVoiceChat();
}

function closeVoiceChat() {
	cleanup();
	showVoiceChatOverlay.value = false;
	currentRoomId.value = null;
}

function cleanup() {
	if (localStream) {
		localStream.getTracks().forEach(track => track.stop());
		localStream = null;
	}

	if (peerConnection) {
		peerConnection.close();
		peerConnection = null;
	}

	sessionId.value = null;
}

// User search and invite methods
async function searchUsers() {
	if (inviteUserQuery.value.trim().length < 2) {
		searchedUsers.value = [];
		return;
	}

	try {
		const results = await misskeyApi('users/search', {
			query: inviteUserQuery.value.trim(),
			limit: 10,
		});
		searchedUsers.value = results;
	} catch (error) {
		console.error('Failed to search users:', error);
		searchedUsers.value = [];
	}
}

async function inviteUser(user) {
	if (!currentRoomId.value || !roomInfo.value?.title) {
		return;
	}

	try {
		await misskeyApi('voice-chat/invite-user', {
			userId: user.id,
			sessionId: currentRoomId.value,
			sessionTitle: roomInfo.value.title,
		});

		os.alert({
			type: 'success',
			text: i18n.ts.voiceChatUserInvited,
		});
		showInviteModal.value = false;
		inviteUserQuery.value = '';
		searchedUsers.value = [];
	} catch (error) {
		console.error('Failed to invite user:', error);
		os.alert({
			type: 'error',
			text: i18n.ts.voiceChatFailedToInvite,
		});
	}
}

// Initialize
onMounted(() => {
	loadActiveRooms();
	// Refresh every 30 seconds
	const interval = window.setInterval(loadActiveRooms, 30000);
	onUnmounted(() => {
		window.clearInterval(interval);
		cleanup();
	});
});

// Define widget
defineExpose({
	name: 'voiceChat',
	configure: () => {},
});
</script>

<style lang="scss" module>
.widget {
	background: var(--MI_THEME-panel);
	border-radius: 8px;
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.title {
	margin: 0;
	font-size: 14px;
	font-weight: 600;
	display: flex;
	align-items: center;
	gap: 6px;
}

.createButton {
	background: var(--MI_THEME-accent);
	color: white;
	border: none;
	border-radius: 50%;
	width: 28px;
	height: 28px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 12px;
	transition: all 0.2s;

	&:hover {
		background: var(--MI_THEME-accentedBg);
		transform: scale(1.05);
	}
}

.roomsList {
	max-height: 300px;
	overflow-y: auto;
}

.roomItem {
	display: flex;
	align-items: center;
	padding: 12px 16px;
	border-bottom: 1px solid var(--MI_THEME-divider);
	cursor: pointer;
	transition: background 0.2s;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}

	&:last-child {
		border-bottom: none;
	}
}

.roomInfo {
	flex: 1;
}

.roomTitle {
	font-weight: 500;
	font-size: 14px;
	margin-bottom: 4px;
}

.roomMeta {
	display: flex;
	gap: 12px;
	font-size: 12px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.participants, .host {
	display: flex;
	align-items: center;
	gap: 4px;
}

.joinButton {
	background: var(--MI_THEME-accent);
	color: white;
	border: none;
	border-radius: 4px;
	padding: 6px 10px;
	font-size: 12px;
	cursor: pointer;
	transition: background 0.2s;

	&:hover {
		background: var(--MI_THEME-accentedBg);
	}
}

.emptyState {
	padding: 32px 16px;
	text-align: center;
	color: var(--MI_THEME-fgTransparentWeak);

	i {
		font-size: 48px;
		margin-bottom: 12px;
		display: block;
	}

	p {
		margin: 0 0 16px 0;
		font-size: 14px;
	}
}

// Voice Chat Overlay Styles
.voiceChatOverlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.8);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 10000;
}

.voiceChatContainer {
	background: var(--MI_THEME-panel);
	border-radius: 16px;
	width: 90%;
	max-width: 480px;
	max-height: 90vh;
	overflow: hidden;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.voiceChatHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.voiceChatTitle {
	font-weight: 600;
	font-size: 18px;
	display: flex;
	align-items: center;
	gap: 8px;
}

.headerActions {
	display: flex;
	align-items: center;
	gap: 8px;
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

.inviteButton {
	background: var(--MI_THEME-accent);
	color: white;
	border: none;
	border-radius: 50%;
	width: 36px;
	height: 36px;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 16px;
	transition: all 0.2s;

	&:hover {
		background: var(--MI_THEME-accentedBg);
		transform: scale(1.05);
	}
}

.roomInfoSection {
	padding: 20px;
	border-bottom: 1px solid var(--MI_THEME-divider);
	background: var(--MI_THEME-accentedBg);
}

.roomTitleLarge {
	font-size: 24px;
	font-weight: 600;
	margin-bottom: 8px;
}

.roomDescription {
	color: var(--MI_THEME-fgTransparentWeak);
	margin-bottom: 16px;
	line-height: 1.5;
}

.roomMeta {
	display: flex;
	gap: 20px;
	font-size: 14px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.hostInfo, .participantInfo {
	display: flex;
	align-items: center;
	gap: 6px;
}

.waitingRoom {
	padding: 40px 20px;
	text-align: center;
}

.hostControls {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 20px;
}

.listenerWaiting {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 20px;
}

.waitingMessage {
	font-size: 18px;
	color: var(--MI_THEME-fgTransparentWeak);
}

.waitingIcon {
	font-size: 48px;
	color: var(--MI_THEME-accent);
	animation: pulse 2s infinite;
}

@keyframes pulse {
	0%, 100% { opacity: 0.5; }
	50% { opacity: 1; }
}

.joinSection {
	padding: 32px 20px;
	text-align: center;
}

.joinTitle {
	font-size: 16px;
	margin-bottom: 24px;
	color: var(--MI_THEME-fg);
}

.joinButtons {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.chatInterface {
	display: flex;
	flex-direction: column;
	height: 600px;
}

.participants {
	flex: 1;
	overflow-y: auto;
	padding: 20px;
}

.sectionTitle {
	font-weight: 600;
	margin-bottom: 16px;
	display: flex;
	align-items: center;
	gap: 8px;
	color: var(--MI_THEME-fg);
}

.speakerList {
	margin-bottom: 24px;
}

.participant {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px;
	border-radius: 12px;
	margin-bottom: 8px;
	position: relative;
	transition: all 0.2s;

	&.speaking {
		background: var(--MI_THEME-accentedBg);
		border: 2px solid var(--MI_THEME-accent);
	}

	&.muted {
		opacity: 0.6;
	}
}

.avatar {
	width: 48px;
	height: 48px;
	border-radius: 50%;
}

.participantInfo {
	flex: 1;
}

.participantName {
	font-weight: 500;
	color: var(--MI_THEME-fg);
}

.mutedIndicator {
	color: var(--MI_THEME-error);
	font-size: 12px;
	margin-top: 2px;
}

.speakingIndicator {
	position: absolute;
	right: 12px;
	top: 50%;
	transform: translateY(-50%);
}

.waveform {
	display: flex;
	gap: 2px;
	align-items: center;

	div {
		width: 3px;
		background: var(--MI_THEME-accent);
		border-radius: 2px;
		animation: waveform 0.8s ease-in-out infinite alternate;

		&:nth-child(1) { height: 8px; animation-delay: 0s; }
		&:nth-child(2) { height: 12px; animation-delay: 0.1s; }
		&:nth-child(3) { height: 6px; animation-delay: 0.2s; }
		&:nth-child(4) { height: 10px; animation-delay: 0.3s; }
	}
}

@keyframes waveform {
	0% { height: 3px; }
	100% { transform: scaleY(1); }
}

.listenerList {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
}

.listenerAvatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
}

.moreListeners {
	background: var(--MI_THEME-buttonBg);
	color: var(--MI_THEME-fg);
	border-radius: 50%;
	width: 32px;
	height: 32px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 12px;
	font-weight: 500;
}

.controls {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 16px;
	padding: 20px;
	border-top: 1px solid var(--MI_THEME-divider);
	background: var(--MI_THEME-bg);
}

.controlButton {
	width: 56px;
	height: 56px;
	border-radius: 50%;
	border: none;
	background: var(--MI_THEME-buttonBg);
	color: var(--MI_THEME-fg);
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 20px;
	transition: all 0.2s;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
		transform: scale(1.05);
	}

	&.muted {
		background: var(--MI_THEME-error);
		color: white;
	}
}

.leaveButton {
	background: var(--MI_THEME-error);
	color: white;

	&:hover {
		background: var(--MI_THEME-errorWarnBg);
	}
}

.error {
	padding: 16px 20px;
	background: var(--MI_THEME-errorBg);
	color: var(--MI_THEME-error);
	text-align: center;
	border-top: 1px solid var(--MI_THEME-divider);
}

// Create Room Modal Styles
.createRoomOverlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.6);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 20000;
}

.createRoomModal {
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	width: 90%;
	max-width: 500px;
	overflow: hidden;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.createRoomHeader {
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

.createRoomBody {
	padding: 24px;
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.createRoomFooter {
	display: flex;
	justify-content: flex-end;
	gap: 12px;
	padding: 20px 24px;
	border-top: 1px solid var(--MI_THEME-divider);
}

// Invite Modal Styles
.inviteModal {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.6);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 30000;
}

.inviteModalContent {
	background: var(--MI_THEME-panel);
	border-radius: 12px;
	width: 90%;
	max-width: 400px;
	max-height: 70vh;
	overflow: hidden;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.inviteModalHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	border-bottom: 1px solid var(--MI_THEME-divider);

	h3 {
		margin: 0;
		font-size: 18px;
		font-weight: 600;
	}
}

.inviteModalClose {
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

.inviteModalBody {
	padding: 20px;
}

.userSearchResults {
	margin-top: 16px;
	max-height: 300px;
	overflow-y: auto;
}

.userSearchResult {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 12px;
	border-radius: 8px;
	cursor: pointer;
	transition: background 0.2s;

	&:hover {
		background: var(--MI_THEME-buttonHoverBg);
	}
}

.searchResultAvatar {
	width: 40px;
	height: 40px;
}

.searchResultInfo {
	flex: 1;
}

.searchResultName {
	font-weight: 600;
	margin-bottom: 2px;
}

.searchResultUsername {
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 14px;
}
</style>
