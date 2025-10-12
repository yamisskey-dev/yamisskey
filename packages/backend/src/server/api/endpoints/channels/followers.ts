/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { ChannelFollowingsRepository } from '@/models/_.js';
import type { MiFollowing } from '@/models/Following.js';
import { QueryService } from '@/core/QueryService.js';
import { FollowingEntityService } from '@/core/entities/FollowingEntityService.js';
import { DI } from '@/di-symbols.js';
import { GetterService } from '@/server/api/GetterService.js';
import { RoleService } from '@/core/RoleService.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['channels'],

	requireCredential: true,
	kind: 'read:channels',

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'Following',
		},
	},

	errors: {
		noSuchChannel: {
			message: 'No such channel.',
			code: 'NO_SUCH_CHANNEL',
			id: '998e4ab5-e0c9-4b43-b0bd-0bb5f8393cee',
		},
		accessDenied: {
			message: 'Access denied.',
			code: 'ACCESS_DENIED',
			id: '4e9c7230-c09f-4d66-a655-dc88b282fabd',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		channelId: { type: 'string', format: 'misskey:id' },
		sinceId: { type: 'string', format: 'misskey:id' },
		untilId: { type: 'string', format: 'misskey:id' },
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
	},
	required: ['channelId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.channelFollowingsRepository)
		private channelFollowingsRepository: ChannelFollowingsRepository,

		private followingEntityService: FollowingEntityService,
		private queryService: QueryService,
		private getterService: GetterService,
		private roleService: RoleService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const channel = await this.getterService.getChannel(ps.channelId).catch(() => {
				throw new ApiError(meta.errors.noSuchChannel);
			});

			// Check visibility permissions
			const iAmOwner = me && channel.userId === me.id;
			const iAmModerator = me && await this.roleService.isModerator(me);
			const iAmFollowing = me && await this.channelFollowingsRepository.findOneBy({
				followerId: me.id,
				followeeId: channel.id,
			});

			// Visibility checks
			if (channel.followersVisibility === 'private') {
				if (!iAmOwner && !iAmModerator) {
					throw new ApiError(meta.errors.accessDenied);
				}
			} else if (channel.followersVisibility === 'followers') {
				if (!iAmFollowing && !iAmOwner && !iAmModerator) {
					throw new ApiError(meta.errors.accessDenied);
				}
			}

			const query = this.queryService.makePaginationQuery(
				this.channelFollowingsRepository.createQueryBuilder('following'),
				ps.sinceId,
				ps.untilId,
			)
				.andWhere('following.followeeId = :channelId', { channelId: ps.channelId })
				.innerJoinAndSelect('following.follower', 'follower');

			const followings = await query
				.limit(ps.limit)
				.getMany();

			// MiChannelFollowing has the same structure as MiFollowing (id, followeeId, followerId, followee, follower)
			// so we can safely cast it for the pack function
			return await this.followingEntityService.packMany(followings as MiFollowing[], me, { populateFollower: true });
		});
	}
}
