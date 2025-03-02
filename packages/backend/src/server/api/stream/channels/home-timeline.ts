/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import type { Packed } from '@/misc/json-schema.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { bindThis } from '@/decorators.js';
import { isRenotePacked, isQuotePacked } from '@/misc/is-renote.js';
import type { JsonObject } from '@/misc/json-value.js';
import { UserFollowingService } from '@/core/UserFollowingService.js'; // 追加
import Channel, { type MiChannelService } from '../channel.js';

class HomeTimelineChannel extends Channel {
	public readonly chName = 'homeTimeline';
	public static shouldShare = false;
	public static requireCredential = true as const;
	public static kind = 'read:account';
	private withRenotes: boolean;
	private withFiles: boolean;
	// 追加: following と followingChannels のプロパティ
	private following: Record<string, { id: string; withReplies: boolean }> = {};
	private followingChannels: Set<string> = new Set();

	constructor(
		private noteEntityService: NoteEntityService,
		private userFollowingService: UserFollowingService, // 追加
		id: string,
		connection: Channel['connection'],
	) {
		super(id, connection);
		//this.onNote = this.onNote.bind(this);
	}

	@bindThis
	public async init(params: JsonObject) {
		this.withRenotes = !!(params.withRenotes ?? true);
		this.withFiles = !!(params.withFiles ?? false);

		// 追加: following と followingChannels の初期化
		// チャンネルのフォロー情報を取得
		const channelFollowings = await this.userFollowingService.getFollowingChannelsCache(this.user!.id);
		this.followingChannels = new Set(channelFollowings);

		// フォロー中のユーザー情報を取得
		this.following = await this.userFollowingService.getFollowingsCache(this.user!.id);

		this.subscriber.on('notesStream', this.onNote);

		// チャンネル更新イベントをサブスクライブ
		this.subscriber.on('channelUpdated', this.onChannelUpdated);
	}

	@bindThis
	private async onNote(note: Packed<'Note'>) {
		const isMe = this.user!.id === note.userId;

		if (this.withFiles && (note.fileIds == null || note.fileIds.length === 0)) return;

		// チャンネル投稿の場合
		if (note.channelId) {
			// チャンネルをフォローしていなければ表示しない
			if (!this.followingChannels.has(note.channelId)) return;

			// propagateToTimelinesがfalseで、自分の投稿でもない場合は表示しない
			if (note.channel && !note.channel.propagateToTimelines && !isMe) return;

			// 自分の投稿でなく、かつ投稿者をフォローしていない場合は表示しない
			if (!isMe && !Object.hasOwn(this.following, note.userId)) return;
		} else {
			// チャンネル投稿でない場合は、投稿者をフォローしているか自分かどうか
			if (!isMe && !Object.hasOwn(this.following, note.userId)) return;
		}

		// その他の条件は既存のまま...
		if (note.visibility === 'followers') {
			if (!isMe && !Object.hasOwn(this.following, note.userId)) return;
		} else if (note.visibility === 'specified') {
			if (!isMe && !note.visibleUserIds!.includes(this.user!.id)) return;
		}

		if (note.reply) {
			const reply = note.reply;
			if (this.following[note.userId].withReplies) {
				// 自分のフォローしていないユーザーの visibility: followers な投稿への返信は弾く
				if (reply.visibility === 'followers' && !Object.hasOwn(this.following, reply.userId) && reply.userId !== this.user!.id) return;
			} else {
				// 「チャンネル接続主への返信」でもなければ、「チャンネル接続主が行った返信」でもなければ、「投稿者の投稿者自身への返信」でもない場合
				if (reply.userId !== this.user!.id && !isMe && reply.userId !== note.userId) return;
			}
		}

		// 純粋なリノート（引用リノートでないリノート）の場合
		if (isRenotePacked(note) && !isQuotePacked(note) && note.renote) {
			if (!this.withRenotes) return;
			if (note.renote.reply) {
				const reply = note.renote.reply;
				// 自分のフォローしていないユーザーの visibility: followers な投稿への返信のリノートは弾く
				if (reply.visibility === 'followers' && !Object.hasOwn(this.following, reply.userId) && reply.userId !== this.user!.id) return;
			}
		}

		if (this.isNoteMutedOrBlocked(note)) return;

		if (this.user && isRenotePacked(note) && !isQuotePacked(note)) {
			if (note.renote && Object.keys(note.renote.reactions).length > 0) {
				const myRenoteReaction = await this.noteEntityService.populateMyReaction(note.renote, this.user.id);
				note.renote.myReaction = myRenoteReaction;
			}
		}

		this.connection.cacheNote(note);

		this.send('note', note);
	}

	@bindThis
	private async onChannelUpdated(channel: any) {
		// フォローしているチャンネルが更新された場合のみ処理
		if (this.followingChannels.has(channel.id)) {
			// チャンネルの情報が更新されたら最新のチャンネル情報を取得し直す
			// 次回のnote表示時には最新のpropagateToTimelinesが反映される
			this.connection.cacheChannel(channel);
		}
	}

	@bindThis
	public dispose() {
		// Unsubscribe events
		this.subscriber.off('notesStream', this.onNote);
		this.subscriber.off('channelUpdated', this.onChannelUpdated);
	}
}

@Injectable()
export class HomeTimelineChannelService implements MiChannelService<true> {
	public readonly shouldShare = HomeTimelineChannel.shouldShare;
	public readonly requireCredential = HomeTimelineChannel.requireCredential;
	public readonly kind = HomeTimelineChannel.kind;

	constructor(
		private noteEntityService: NoteEntityService,
		private userFollowingService: UserFollowingService, // 追加
	) {
	}

	@bindThis
	public create(id: string, connection: Channel['connection']): HomeTimelineChannel {
		return new HomeTimelineChannel(
			this.noteEntityService,
			this.userFollowingService, // 追加
			id,
			connection,
		);
	}
}
