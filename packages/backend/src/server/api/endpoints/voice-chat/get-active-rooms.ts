/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import { MiMeta } from '@/models/Meta.js';
import type { UsersRepository } from '@/models/_.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { ApiError } from '../../error.js';
import { voiceChatRooms } from './create-room.js';

export const meta = {
	tags: ['voice-chat'],

	requireCredential: true,
	secure: true,

	kind: 'read:voice-chat',

	limit: {
		duration: 30000,
		max: 30,
	},

	errors: {
		notConfigured: {
			message: 'Voice chat is not configured.',
			code: 'NOT_CONFIGURED',
			id: 'f3c4d5e6-8f9a-4b1c-2d3e-5f6g7h8i9j0k',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.config)
		private config: MiMeta,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Check if voice chat is configured
			if (!this.config.cloudflareRealtimeEnabled || !this.config.cloudflareRealtimeAppId || !this.config.cloudflareRealtimeAppSecret) {
				throw new ApiError(meta.errors.notConfigured);
			}

			// Get all active rooms (waiting or active status)
			const activeRooms = Array.from(voiceChatRooms.values()).filter(room =>
				room.status === 'waiting' || room.status === 'active',
			);

			// Format rooms for response
			const roomsData = await Promise.all(activeRooms.map(async room => {
				const host = await this.usersRepository.findOneBy({ id: room.hostId });
				const hostData = host ? await this.userEntityService.pack(host, me, { schema: 'UserLite' }) : null;

				return {
					id: room.id,
					title: room.title,
					description: room.description,
					participantCount: room.participants.length,
					host: hostData ? {
						name: hostData.name,
						username: hostData.username,
					} : undefined,
					status: room.status,
					createdAt: room.createdAt.toISOString(),
				};
			}));

			return roomsData;
		});
	}
}
