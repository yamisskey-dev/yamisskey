/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import { RoleService } from '@/core/RoleService.js';
import type { UsersRepository } from '@/models/_.js';
import { NotificationService } from '@/core/NotificationService.js';
import { ApiError } from '../../error.js';

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
		userNotFound: {
			message: 'User not found.',
			code: 'USER_NOT_FOUND',
			id: 'a1b2c3d4-5e6f-7g8h-9i0j-1k2l3m4n5o6p',
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
		userId: { type: 'string', format: 'misskey:id' },
		sessionId: { type: 'string' },
		sessionTitle: { type: 'string', maxLength: 100 },
	},
	required: ['userId', 'sessionId', 'sessionTitle'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private roleService: RoleService,
		private notificationService: NotificationService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Check if voice chat is enabled
			const policies = await this.roleService.getUserPolicies(me.id);
			if (!policies.canUseVoiceChat) {
				throw new ApiError(meta.errors.permissionDenied);
			}

			// Check if Cloudflare Realtime is configured
			if (!this.config.cloudflareRealtime?.appId || !this.config.cloudflareRealtime?.appSecret) {
				throw new ApiError(meta.errors.notConfigured);
			}

			// Check if target user exists
			const targetUser = await this.usersRepository.findOneBy({ id: ps.userId });
			if (!targetUser) {
				throw new ApiError(meta.errors.userNotFound);
			}

			// Create notification for the invited user
			await this.notificationService.createNotification(ps.userId, 'app', {
				customIcon: 'ti ti-microphone',
				customHeader: 'Voice Chat Invitation',
				customBody: `${me.name ?? me.username} invited you to join "${ps.sessionTitle}"`,
				appAccessTokenId: null,
			});

			return { success: true };
		});
	}
}
