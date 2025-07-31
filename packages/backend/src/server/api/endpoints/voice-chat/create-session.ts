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
	},
	required: ['title'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.config)
		private config: MiMeta,

		private roleService: RoleService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// Check if voice chat is configured
			if (!this.config.cloudflareRealtimeEnabled || !this.config.cloudflareRealtimeAppId || !this.config.cloudflareRealtimeAppSecret) {
				throw new ApiError(meta.errors.notConfigured);
			}

			// Check user permissions
			const policies = await this.roleService.getUserPolicies(me.id);
			if (!policies.canUseVoiceChat) {
				throw new ApiError(meta.errors.permissionDenied);
			}

			// Create new session with Cloudflare Realtime
			const response = await fetch(`https://rtc.live.cloudflare.com/v1/apps/${this.config.cloudflareRealtimeAppId}/sessions/new`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.config.cloudflareRealtimeAppSecret}`,
					'Content-Type': 'application/json',
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to create voice chat session: ${response.statusText}`);
			}

			const data = await response.json();

			return {
				sessionId: data.sessionId,
				apiBase: `https://rtc.live.cloudflare.com/v1/apps/${this.config.cloudflareRealtimeAppId}`,
			};
		});
	}
}
