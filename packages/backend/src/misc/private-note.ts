/*
 * SPDX-FileCopyrightText: hitalin and yamisskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { MiNote } from '@/models/Note.js';
import type { NotesRepository } from '@/models/_.js';

/**
 * プライベートノート判定（自分のみ閲覧可能なノート）
 *
 * プライベートノートの条件:
 * - visibility が 'specified' である
 * - かつ、以下のいずれか:
 *   - visibleUserIds が空配列、null、または undefined
 *   - visibleUserIds が [自分のID] のみを含む（長さ1で、その要素が自分のID）
 *
 * @param note ノートオブジェクトまたは最低限必要なプロパティを持つオブジェクト
 * @returns プライベートノートの場合 true
 */
export function isPrivateNote(note: MiNote): boolean;
export function isPrivateNote(note: {
	visibility: string;
	visibleUserIds?: string[] | null;
	userId: string;
}): boolean;
export function isPrivateNote(note: {
	visibility: string;
	visibleUserIds?: string[] | null;
	userId: string;
}): boolean {
	if (note.visibility !== 'specified') {
		return false;
	}

	// visibleUserIds が空または未定義の場合
	if (!note.visibleUserIds || note.visibleUserIds.length === 0) {
		return true;
	}

	// visibleUserIds が自分のIDのみの場合
	if (note.visibleUserIds.length === 1 && note.visibleUserIds[0] === note.userId) {
		return true;
	}

	return false;
}

/**
 * リプライチェーンにプライベートノートが含まれているか再帰的にチェック
 *
 * この関数は以下の場合に true を返す:
 * 1. 指定されたノート自体がプライベートノートである
 * 2. リプライチェーンを辿った先にプライベートノートが存在する
 *
 * @param note チェック対象のノート
 * @param notesRepository ノートリポジトリ（リプライを取得するために使用）
 * @returns プライベートノートチェーンの場合 true
 */
export async function isPrivateNoteInReplyChain(
	note: MiNote,
	notesRepository: NotesRepository,
): Promise<boolean> {
	// 直接のプライベートノート判定
	if (isPrivateNote(note)) {
		return true;
	}

	// リプライチェーンを再帰的にチェック
	if (note.replyId) {
		try {
			const reply = await notesRepository.findOneBy({ id: note.replyId });
			if (!reply) return false;
			return await isPrivateNoteInReplyChain(reply, notesRepository);
		} catch (err) {
			console.error(`Error checking private note in reply chain: ${err}`);
			return false;
		}
	}

	return false;
}
