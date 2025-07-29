<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="showVoiceChat" :class="$style.voiceChatOverlay">
	<div :class="$style.voiceChatContainer">
		<div :class="$style.header">
			<div :class="$style.title">
				<i class="ti ti-microphone"></i>
				{{ i18n.ts.voiceChat }}
			</div>
			<button :class="$style.closeButton" @click="closeVoiceChat">
				<i class="ti ti-x"></i>
			</button>
		</div>

		<div v-if="!isConnected" :class="$style.joinSection">
			<div :class="$style.joinTitle">{{ i18n.ts.joinVoiceChat }}</div>
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
</div>
</template>

<script lang="ts" setup>
import { ref, onUnmounted } from 'vue';
import MkButton from '@/components/MkButton.vue';
import MkAvatar from '@/components/global/MkAvatar.vue';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';
import { misskeyApi } from '@/utility/misskey-api.js';

defineProps<{
	showVoiceChat: boolean;
}>();

const emit = defineEmits<{
	closeVoiceChat: [];
}>();

// Reactive state
const isConnected = ref(false);
const isMuted = ref(false);
const currentUserRole = ref<'speaker' | 'listener' | null>(null);
const connectionError = ref<string | null>(null);

// Sample data (this would come from real voice chat state)
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
let sessionId: string | null = null;

// Voice chat methods
async function joinAsListener() {
	try {
		currentUserRole.value = 'listener';
		await connectToVoiceChat(false);
	} catch (error) {
		console.error('Failed to join as listener:', error);
		connectionError.value = i18n.ts.failedToJoinVoiceChat;
	}
}

async function joinAsSpeaker() {
	try {
		currentUserRole.value = 'speaker';
		await connectToVoiceChat(true);
	} catch (error) {
		console.error('Failed to join as speaker:', error);
		connectionError.value = i18n.ts.failedToJoinVoiceChat;
	}
}

async function connectToVoiceChat(asSpeaker: boolean) {
	try {
		// Create session
		const sessionResponse = await misskeyApi('voice-chat/create-session', {});
		sessionId = sessionResponse.sessionId;

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
			// Handle incoming audio tracks
			console.log('Received track:', event.track);
		};

		if (asSpeaker) {
			// Get user media for speakers
			localStream = await navigator.mediaDevices.getUserMedia({ audio: true });

			// Add audio track
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
			tracks: asSpeaker ? [{
				location: 'local' as const,
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
		const audioTrack = localStream.getAudioTracks()[0];
		if (audioTrack) {
			audioTrack.enabled = !audioTrack.enabled;
			isMuted.value = !audioTrack.enabled;
		}
	}
}

function requestToSpeak() {
	// TODO: Implement request to speak functionality
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
	emit('closeVoiceChat');
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

	sessionId = null;
}

onUnmounted(() => {
	cleanup();
});
</script>

<style lang="scss" module>
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

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.title {
	font-weight: 600;
	font-size: 18px;
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
</style>
