/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { MiMeta } from '@/models/Meta.js';
import { RoleService } from '@/core/RoleService.js';
import { IdService } from '@/core/IdService.js';
import { ApiError } from '../../error.js';

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
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		title: { type: 'string', minLength: 1, maxLength: 100 },
		description: { type: 'string', maxLength: 500 },
	},
	required: ['title'],
} as const;

// In-memory store for voice chat rooms (in production, this should be in Redis or database)
const voiceChatRooms = new Map<string, {
	id: string;
	title: string;
	description?: string;
	hostId: string;
	createdAt: Date;
	status: 'waiting' | 'active' | 'ended';
	participants: string[];
	speakers: string[];
	sessionId?: string; // Cloudflare session ID when active
}>();

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.meta)
		private serverSettings: MiMeta,

		private roleService: RoleService,
		private idService: IdService,
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

			// Create room metadata
			const roomId = this.idService.gen();
			const room = {
				id: roomId,
				title: ps.title,
				description: ps.description,
				hostId: me.id,
				createdAt: new Date(),
				status: 'waiting' as const,
				participants: [me.id],
				speakers: [me.id], // Host is initially a speaker
			};

			voiceChatRooms.set(roomId, room);

			return {
				roomId,
				title: room.title,
				description: room.description,
				status: room.status,
				isHost: true,
			};
		});
	}
}

// Export the rooms store for other endpoints to use
export { voiceChatRooms };
