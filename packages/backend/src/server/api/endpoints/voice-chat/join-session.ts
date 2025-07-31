/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { MiMeta } from '@/models/Meta.js';
import { RoleService } from '@/core/RoleService.js';
import { ApiError } from '../../error.js';
import { voiceChatRooms } from './create-room.js';

export const meta = {
	tags: ['voice-chat'],

	requireCredential: true,
	secure: true,

	kind: 'write:voice-chat',

	limit: {
		duration: 60000,
		max: 30,
	},

	errors: {
		permissionDenied: {
			message: 'Permission denied.',
			code: 'PERMISSION_DENIED',
			id: 'e2b3c8f0-7e5a-4f0d-9f1e-2e8f3e4d5c6b',
		},
		notConfigured: {
			message: 'Voice chat is not configured.',
			code: 'NOT_CONFIGURED',
			id: 'f3c4d5e6-8f9a-4b1c-2d3e-5f6g7h8i9j0k',
		},
		roomNotFound: {
			message: 'Room not found.',
			code: 'ROOM_NOT_FOUND',
			id: 'a1b2c3d4-5e6f-7g8h-9i0j-1k2l3m4n5o6p',
		},
		sessionNotActive: {
			message: 'Session is not active.',
			code: 'SESSION_NOT_ACTIVE',
			id: 'b2c3d4e5-6f7g-8h9i-0j1k-2l3m4n5o6p7q',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		roomId: { type: 'string', format: 'misskey:id' },
		role: { type: 'string', enum: ['speaker', 'listener'] },
	},
	required: ['roomId', 'role'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.meta)
		private serverSettings: MiMeta,

		private roleService: RoleService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Check if voice chat is configured
			if (!this.serverSettings.cloudflareRealtimeEnabled || !this.serverSettings.cloudflareRealtimeAppId || !this.serverSettings.cloudflareRealtimeAppSecret) {
				throw new ApiError(meta.errors.notConfigured);
			}

			// Check user permissions
			const policies = await this.roleService.getUserPolicies(me.id);
			if (!policies.canUseVoiceChat) {
				throw new ApiError(meta.errors.permissionDenied);
			}

			// Get room
			const room = voiceChatRooms.get(ps.roomId);
			if (!room) {
				throw new ApiError(meta.errors.roomNotFound);
			}

			// Check if session is active
			if (room.status !== 'active' || !room.sessionId) {
				throw new ApiError(meta.errors.sessionNotActive);
			}

			// Add user to participants if not already there
			if (!room.participants.includes(me.id)) {
				room.participants.push(me.id);
			}

			// Add to speakers if role is speaker
			if (ps.role === 'speaker' && !room.speakers.includes(me.id)) {
				room.speakers.push(me.id);
			}

			return {
				sessionId: room.sessionId,
				apiBase: `https://rtc.live.cloudflare.com/v1/apps/${this.serverSettings.cloudflareRealtimeAppId}`,
				roomId: ps.roomId,
				role: ps.role,
				isHost: room.hostId === me.id,
			};
		});
	}
}
