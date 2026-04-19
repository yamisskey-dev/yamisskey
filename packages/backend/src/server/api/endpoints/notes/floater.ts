/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Brackets, DataSource } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { NotesRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { QueryService } from '@/core/QueryService.js';
import ActiveUsersChart from '@/core/chart/charts/active-users.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { ChannelMutingService } from '@/core/ChannelMutingService.js';
import { CacheService } from '@/core/CacheService.js';
import { DI } from '@/di-symbols.js';
import { IdService } from '@/core/IdService.js';
import { MiLocalUser } from '@/models/User.js';

export const meta = {
	tags: ['notes'],

	requireCredential: true,
	kind: 'read:account',

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			properties: {
				id: { type: 'string', optional: false, nullable: false, format: 'misskey:id' },
				notes: {
					type: 'array',
					optional: false, nullable: false,
					items: {
						type: 'object',
						optional: false, nullable: false,
						ref: 'Note',
					},
				},
				last: { type: 'string', optional: false, nullable: true, format: 'misskey:id' },
				isFirstPublicPost: { type: 'boolean', optional: false, nullable: false },
				isFollowing: { type: 'boolean', optional: false, nullable: false },
			},
		},
	},
} as const;

// クエリパラメータに noteLimit と maxNoteLimit を追加
export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
		noteLimit: { type: 'integer', minimum: 0, maximum: 20, default: 0 }, // 0=日付差があるまで取得
		maxNoteLimit: { type: 'integer', minimum: 1, maximum: 20, default: 10 }, // 最大取得数
		anchorId: { type: 'string', format: 'misskey:id' },
		anchorDate: { type: 'integer' },
		offset: { type: 'integer', minimum: 0, default: 0 },
		excludeBots: { type: 'boolean', default: false },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.db)
		private db: DataSource,

		private noteEntityService: NoteEntityService,
		private activeUsersChart: ActiveUsersChart,
		private idService: IdService,
		private queryService: QueryService,
		private channelMutingService: ChannelMutingService,
		private cacheService: CacheService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const anchorId = ps.anchorId ?? this.idService.gen(ps.anchorDate);

			const [mutedChannelIds, followings] = await Promise.all([
				this.channelMutingService
					.list({ requestUserId: me.id }, { idOnly: true })
					.then(xs => xs.map(x => x.id)),
				this.cacheService.userFollowingsCache.fetch(me.id),
			]);
			const followeeIds = Object.keys(followings);

			const updates = await this.getFromDb({
				anchorId,
				offset: ps.offset,
				limit: ps.limit,
				noteLimit: ps.noteLimit,
				maxNoteLimit: ps.maxNoteLimit,
				excludeBots: ps.excludeBots,
				mutedChannelIds,
				followeeIds,
			}, me);

			process.nextTick(() => {
				this.activeUsersChart.read(me);
			});

			for (const update of updates) {
				update.notes = await this.noteEntityService.packMany(update.notes, me);
			}
			return updates;
		});
	}

	// getFromDb メソッドをシンプル化
	private async getFromDb(ps: {
		anchorId: string | null;
		offset: number;
		limit: number;
		noteLimit?: number;
		maxNoteLimit?: number;
		excludeBots: boolean;
		mutedChannelIds: string[];
		followeeIds: string[];
	}, me: MiLocalUser) {
		// フォローしているユーザーと、フォローしていないローカルユーザーのパブリック投稿、両方を含むクエリ
		// $1=followeeIds, $2=anchorId, $3=offset, $4=limit, $5=isInYamiMode, $6=excludeBots
		const updatedUsers = await this.db.query(`
            WITH local_active_users AS (
                -- 最近投稿したローカルユーザーを取得
                SELECT DISTINCT u.id AS "userId"
                FROM "user" u
                JOIN "note" n ON u.id = n."userId"
                WHERE
                    -- ローカルユーザーのみ
                    u."host" IS NULL
                    -- suspended ユーザーを除外
                    AND u."isSuspended" = FALSE
                    -- excludeBots=TRUE のとき bot を除外
                    AND (u."isBot" = FALSE OR $6 = FALSE)
                    -- anchorId以降に投稿がある
                    AND n."id" > $2
                    -- パブリック投稿
                    AND n."visibility" IN ('public')
                    -- リノート・リプライを除外
                    AND n."renoteId" IS NULL
                    AND n."replyId" IS NULL
                    -- やみモードフィルタリング
                    AND (n."isNoteInYamiMode" = FALSE OR $5 = TRUE)
            ),
            user_last_posts AS (
                -- 各ユーザーの最後の投稿（anchorId以前）を取得
                SELECT
                    lau."userId",
                    (
                        SELECT "id"
                        FROM "note"
                        WHERE "userId" = lau."userId"
                            AND "id" <= $2
                            AND "visibility" IN ('public')
                            AND "renoteId" IS NULL
                            AND "replyId" IS NULL
                            AND ("isNoteInYamiMode" = FALSE OR $5 = TRUE)
                        ORDER BY "id" DESC
                        LIMIT 1
                    ) AS last_post_id,
                    -- 初浮上: anchor 以前に当該ユーザーのノートが 1 つも存在しないこと
                    -- (リプライ/リノート/home/followers/specified も "過去の活動" と見なす。
                    --  visibility=public かつ renoteId/replyId IS NULL に限ると、
                    --  リプライや home のみ投稿してきた既存ユーザーが誤って初浮上判定されてしまう)
                    NOT EXISTS (
                        SELECT 1 FROM "note"
                        WHERE "userId" = lau."userId"
                            AND "id" < $2
                            AND ("isNoteInYamiMode" = FALSE OR $5 = TRUE)
                    ) AS is_first_public_post,
                    -- フォロー状態 (userFollowingsCache から受け取った配列で判定)
                    (lau."userId" = ANY($1::varchar[])) AS is_following
                FROM local_active_users lau
            )
            -- フォロー状態順 + 最後の投稿古い順 + オフセット + リミット
            SELECT
                "userId" AS user,
                last_post_id AS last,
                is_following,
                is_first_public_post
            FROM user_last_posts
            ORDER BY
                -- フォロー中ユーザーを優先
                is_following DESC,
                -- 最後の投稿が古いか存在しない（初投稿）ユーザーを優先
                last_post_id ASC NULLS FIRST
            OFFSET $3
            LIMIT $4
        `, [ps.followeeIds, ps.anchorId, ps.offset, ps.limit, me.isInYamiMode, ps.excludeBots]);

		return await Promise.all(updatedUsers.map(async (row: { user: string; last: string | null; is_following: boolean; is_first_public_post: boolean }) => {
			const userId = row.user;
			const query = this.notesRepository.createQueryBuilder('note').innerJoinAndSelect('note.user', 'user');

			// 標準の可視性クエリ
			this.queryService.generateVisibilityQuery(query, me);
			// ミュート/ブロック/suspended/blockedHost の共通フィルタ (renote 変種も含む)
			this.queryService.generateBaseNoteFilteringQuery(query, me);
			// 被ミュートユーザーによる自分のノート renote の除外
			this.queryService.generateMutedUserRenotesQueryForNotes(query, me);

			// フォローしていないユーザーの場合は明示的にパブリック投稿のみに制限
			if (!row.is_following && userId !== me.id) {
				query.andWhere('note.visibility = :visibility', { visibility: 'public' });
			}

			// やみモード投稿のフィルタリング
			if (!me.isInYamiMode) {
				query.andWhere('note.isNoteInYamiMode = FALSE');
			}

			// ミュート済みチャンネルの renote を除外
			if (ps.mutedChannelIds.length > 0) {
				query.andWhere(new Brackets(qb => {
					qb.where('note.renoteChannelId IS NULL')
						.orWhere('note.renoteChannelId NOT IN (:...mutedChannelIds)', { mutedChannelIds: ps.mutedChannelIds });
				}));
			}

			// bot 除外 (excludeBots=TRUE のとき)
			if (ps.excludeBots) {
				query.andWhere('user.isBot = FALSE');
			}

			query.andWhere('note.renoteId IS NULL');
			query.andWhere('note.replyId IS NULL');
			query.andWhere('note.userId = :userId', { userId });
			query.andWhere('note.id > :anchorId', { anchorId: ps.anchorId });
			query.orderBy('note.id', 'DESC');

			// クエリ実行前の処理
			if (ps.noteLimit === 0) {
				// 日付差があるまで取得（最大数制限あり）
				query.limit(ps.maxNoteLimit);

				const notes = await query.getMany();
				const processedNotes = [];

				if (notes.length > 0) {
					// 最初のノートは必ず含める
					processedNotes.push(notes[0]);
					const firstDate = this.idService.parse(notes[0].id).date;

					// 最初のノートと日付が異なるノートを探す
					for (let i = 1; i < notes.length; i++) {
						const currentDate = this.idService.parse(notes[i].id).date;

						// 日付が同じなら追加
						if (firstDate.getFullYear() === currentDate.getFullYear() &&
							firstDate.getMonth() === currentDate.getMonth() &&
							firstDate.getDate() === currentDate.getDate()) {
							// 表示用の上限数までは追加
							if (i < 3) {
								processedNotes.push(notes[i]);
							}
						} else {
							// 日付が異なるノートを発見したら追加して終了
							processedNotes.push(notes[i]);
							break;
						}
					}
				}

				return {
					id: userId,
					notes: processedNotes,
					last: row.last,
					isFirstPublicPost: row.is_first_public_post,
					isFollowing: row.is_following,
				};
			} else {
				// 通常モード（指定された数のノートを取得）
				query.limit(ps.noteLimit);

				return {
					id: userId,
					notes: await query.getMany(),
					last: row.last,
					isFirstPublicPost: row.is_first_public_post,
					isFollowing: row.is_following,
				};
			}
		}));
	}
}
