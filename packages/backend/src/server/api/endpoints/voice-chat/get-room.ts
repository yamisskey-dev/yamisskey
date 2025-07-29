/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import type { UsersRepository } from '@/models/_.js';
import { RoleService } from '@/core/RoleService.js';
import { ApiError } from '../../error.js';
import { voiceChatRooms } from './create-room.js';

export const meta = {
	tags: ['voice-chat'],

	requireCredential: true,
	secure: true,

	kind: 'read:voice-chat',

	errors: {
		permissionDenied: {
			message: 'Permission denied.',
			code: 'PERMISSION_DENIED',
			id: 'e2b3c8f0-7e5a-4f0d-9f1e-2e8f3e4d5c6b',
		},
		roomNotFound: {
			message: 'Room not found.',
			code: 'ROOM_NOT_FOUND',
			id: 'a1b2c3d4-5e6f-7g8h-9i0j-1k2l3m4n5o6p',
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

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private roleService: RoleService,
	) {
		super(meta, paramDef, async (ps, me) => {
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

			// Get host user info
			const host = await this.usersRepository.findOneBy({ id: room.hostId });

			// Get participant count
			const participantCount = room.participants.length;
			const speakerCount = room.speakers.length;

			return {
				id: room.id,
				title: room.title,
				description: room.description,
				host: host ? {
					id: host.id,
					name: host.name,
					username: host.username,
					avatarUrl: host.avatarUrl,
				} : null,
				status: room.status,
				participantCount,
				speakerCount,
				createdAt: room.createdAt.toISOString(),
				isHost: room.hostId === me.id,
				isParticipant: room.participants.includes(me.id),
				isSpeaker: room.speakers.includes(me.id),
			};
		});
	}
}
