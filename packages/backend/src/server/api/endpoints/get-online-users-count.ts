/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { MoreThan, In } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { USER_ONLINE_THRESHOLD } from '@/const.js';
import type { UsersRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['meta'],

	requireCredential: false,
	allowGet: true,
	cacheSec: 60 * 1,
	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			count: {
				type: 'number',
				optional: false, nullable: false,
			},
			details: {
				type: 'array',
				optional: false, nullable: false,
				items: {
					type: 'object',
					optional: false, nullable: false,
					properties: {
						id: {
							type: 'string',
							optional: false, nullable: false,
						},
						username: {
							type: 'string',
							optional: false, nullable: false,
						},
						name: {
							type: 'string',
							optional: true, nullable: true,
						},
						avatarUrl: {
							type: 'string',
							optional: true, nullable: true,
						},
						avatarBlurhash: {
							type: 'string',
							optional: true, nullable: true,
						},
						host: {
							type: 'string',
							optional: true, nullable: true,
						},
						lastActiveDate: {
							type: 'string',
							optional: false, nullable: false,
						},
					},
				},
			},
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
		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,
	) {
		super(meta, paramDef, async () => {
			const count = await this.usersRepository.countBy({
				lastActiveDate: MoreThan(new Date(Date.now() - USER_ONLINE_THRESHOLD)),
			});

			// クエリを実行して詳細を取得
			const details = await this.usersRepository.find({
				select: {
					id: true,
					username: true,
					name: true,
					avatarUrl: true,
					avatarBlurhash: true,
					host: true,
					isSuspended: true,
					isLocked: true,
					lastActiveDate: true,
				},
				where: {
					lastActiveDate: MoreThan(new Date(Date.now() - USER_ONLINE_THRESHOLD)),
					showActiveStatus: true,
				},
				order: {
					lastActiveDate: 'DESC',
				},
			});

			return {
				count,
				details,
			};
		});
	}
}
