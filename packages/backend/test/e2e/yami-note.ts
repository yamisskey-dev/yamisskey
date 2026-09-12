/*
 * SPDX-FileCopyrightText: hitalin and yamisskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import { describe, beforeAll, test } from 'vitest';
import { api, castAsError, post, react, signup } from '../utils.js';
import type * as misskey from 'misskey-js';

describe('Yami note', () => {
	let root: misskey.entities.SignupResponse;
	let alice: misskey.entities.SignupResponse;
	let bob: misskey.entities.SignupResponse;
	let carol: misskey.entities.SignupResponse;

	beforeAll(async () => {
		root = await signup({ username: 'root' });
		alice = await signup({ username: 'alice' });
		bob = await signup({ username: 'bob' });
		carol = await signup({ username: 'carol' });

		// 連合ありやみノートを投稿できるようにする
		const meta = await api('admin/update-meta', { yamiNoteFederationEnabled: true }, root);
		assert.strictEqual(meta.status, 204);

		const yamiRole = await api('admin/roles/create', {
			name: 'yami',
			description: '',
			color: null,
			iconUrl: null,
			displayOrder: 0,
			target: 'manual',
			condFormula: {},
			isModerator: false,
			isAdministrator: false,
			isPublic: false,
			isExplorable: false,
			asBadge: false,
			canEditMembersByModerator: false,
			policies: {
				canYamiNote: {
					useDefault: false,
					priority: 0,
					value: true,
				},
			},
		}, root);
		assert.strictEqual(yamiRole.status, 200);

		const assign = await api('admin/roles/assign', { userId: alice.id, roleId: yamiRole.body.id }, root);
		assert.strictEqual(assign.status, 204);

		// 閲覧側は全員やみモード
		for (const user of [alice, bob, carol]) {
			const res = await api('i/update', { isInYamiMode: true }, user);
			assert.strictEqual(res.status, 200);
		}
	}, 1000 * 60 * 2);

	describe('renote', () => {
		test('連合ありやみノートはリノートできない', async () => {
			const note = await post(alice, { text: 'yami', isNoteInYamiMode: true, visibility: 'public' });
			assert.strictEqual(note.isNoteInYamiMode, true);
			assert.strictEqual(note.localOnly, false);

			const res = await api('notes/create', { renoteId: note.id }, bob);

			assert.strictEqual(res.status, 400);
			assert.strictEqual(castAsError(res.body as any).error.code, 'CANNOT_RENOTE_FEDERATED_YAMI_NOTE');
		});

		test('ローカル限定やみノートはリノートできる', async () => {
			const note = await post(alice, { text: 'yami', isNoteInYamiMode: true, visibility: 'public', localOnly: true });
			assert.strictEqual(note.isNoteInYamiMode, true);
			assert.strictEqual(note.localOnly, true);

			const res = await api('notes/create', { renoteId: note.id }, bob);

			assert.strictEqual(res.status, 200);
		});
	});

	describe('visibility (notes/reactions)', () => {
		test('やみモードの投稿者は自分の specified やみノートのリアクションを見れる', async () => {
			const note = await post(alice, { text: 'yami dm', isNoteInYamiMode: true, visibility: 'specified', visibleUserIds: [bob.id] });
			await react(bob, note, '👍');

			const res = await api('notes/reactions', { noteId: note.id }, alice);

			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.body.length, 1);
		});

		test('やみモードの指定ユーザーは specified やみノートのリアクションを見れる', async () => {
			const note = await post(alice, { text: 'yami dm', isNoteInYamiMode: true, visibility: 'specified', visibleUserIds: [bob.id] });
			await react(bob, note, '👍');

			const res = await api('notes/reactions', { noteId: note.id }, bob);

			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.body.length, 1);
		});

		test('やみモードでも指定されていないユーザーは specified やみノートのリアクションを見れない', async () => {
			const note = await post(alice, { text: 'yami dm', isNoteInYamiMode: true, visibility: 'specified', visibleUserIds: [bob.id] });
			await react(bob, note, '👍');

			const res = await api('notes/reactions', { noteId: note.id }, carol);

			assert.strictEqual(res.status, 400);
			assert.strictEqual(castAsError(res.body as any).error.code, 'NO_SUCH_NOTE');
		});

		test('やみモードの投稿者は自分の followers やみノートのリアクションを見れる', async () => {
			const note = await post(alice, { text: 'yami followers', isNoteInYamiMode: true, visibility: 'followers' });

			const res = await api('notes/reactions', { noteId: note.id }, alice);

			assert.strictEqual(res.status, 200);
		});
	});
});
