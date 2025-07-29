/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
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
		max: 10,
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
		notHost: {
			message: 'Only the host can start the session.',
			code: 'NOT_HOST',
			id: 'b2c3d4e5-6f7g-8h9i-0j1k-2l3m4n5o6p7q',
		},
		sessionAlreadyActive: {
			message: 'Session is already active.',
			code: 'SESSION_ALREADY_ACTIVE',
			id: 'c3d4e5f6-7g8h-9i0j-1k2l-3m4n5o6p7q8r',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		roomId: { type: 'string', format: 'misskey:id' },
	},
	required: ['roomId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.config)
		private config: Config,

		private roleService: RoleService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Check if voice chat is configured
			if (!this.config.cloudflareRealtime || !this.config.cloudflareRealtime.appId || !this.config.cloudflareRealtime.appSecret) {
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

			// Check if user is the host
			if (room.hostId !== me.id) {
				throw new ApiError(meta.errors.notHost);
			}

			// Check if session is already active
			if (room.status === 'active') {
				throw new ApiError(meta.errors.sessionAlreadyActive);
			}

			// Create Cloudflare session
			const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${this.config.cloudflareRealtime.appId}/sessions/new`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.config.cloudflareRealtime.appSecret}`,
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to create voice chat session: ${response.statusText}`);
			}

			const data = await response.json();

			// Update room status
			room.status = 'active';
			room.sessionId = data.sessionId;

			return {
				sessionId: data.sessionId,
				apiBase: `https://rtc.live.cloudflare.com/v1/apps/${this.config.cloudflareRealtime.appId}`,
				roomId: ps.roomId,
			};
		});
	}
}
