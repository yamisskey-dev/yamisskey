/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { SearchService } from '@/core/SearchService.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { RoleService } from '@/core/RoleService.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['notes', 'yami'],

	requireCredential: true,
	kind: 'read:account',

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'Note',
		},
	},

	errors: {
		unavailable: {
			message: 'Search of yami notes unavailable.',
			code: 'UNAVAILABLE',
			id: '0b44998d-77aa-4427-80d0-d2c9b8523012',
		},
		notInYamiMode: {
			message: 'You must be in yami mode to search yami notes.',
			code: 'NOT_IN_YAMI_MODE',
			id: '0b44998d-77aa-4427-80d0-d2c9b8523013',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		query: { type: 'string' },
		sinceId: { type: 'string', format: 'misskey:id' },
		untilId: { type: 'string', format: 'misskey:id' },
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
		offset: { type: 'integer', default: 0 },
		host: {
			type: 'string',
			description: 'The local host is represented with `.`.',
		},
		userId: { type: 'string', format: 'misskey:id', nullable: true, default: null },
		channelId: { type: 'string', format: 'misskey:id', nullable: true, default: null },
	},
	required: ['query'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private noteEntityService: NoteEntityService,
		private searchService: SearchService,
		private roleService: RoleService,
	) {
		super(meta, paramDef, async (ps, me) => {
			// やみモードでない場合はエラー
			if (!me.isInYamiMode) {
				throw new ApiError(meta.errors.notInYamiMode);
			}

			const policies = await this.roleService.getUserPolicies(me.id);
			if (!policies.canSearchNotes) {
				throw new ApiError(meta.errors.unavailable);
			}

			// やみノート検索権限の追加チェック
			if (!policies.canYamiNote) {
				throw new ApiError(meta.errors.unavailable);
			}

			// クエリの長さ制限（DoS攻撃防止）
			if (ps.query.length > 1000) {
				throw new ApiError(meta.errors.unavailable);
			}

			// やみノート専用の検索オプション
			const searchOpts = {
				userId: ps.userId,
				channelId: ps.channelId,
				host: ps.host,
				// やみノートのみを検索対象とする
				yamiModeOnly: true,
				meId: me.id,
			};

			const notes = await this.searchService.searchNote(ps.query, me, searchOpts, {
				untilId: ps.untilId,
				sinceId: ps.sinceId,
				limit: ps.limit,
			});

			return await this.noteEntityService.packMany(notes, me);
		});
	}
} 