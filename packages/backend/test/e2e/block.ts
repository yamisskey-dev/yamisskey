/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import { describe, beforeAll, test, vi } from 'vitest';
import { MiBlocking } from '@/models/Blocking.js';
import { genAidx } from '@/misc/id/aidx.js';
import { api, castAsError, initTestDb, post, react, signup } from '../utils.js';
import type * as misskey from 'misskey-js';

const waitForPushToTlOptions = { timeout: 3000, interval: 25 };

describe('Block', () => {
	// alice blocks bob
	let alice: misskey.entities.SignupResponse;
	let bob: misskey.entities.SignupResponse;
	let carol: misskey.entities.SignupResponse;

	beforeAll(async () => {
		alice = await signup({ username: 'alice' });
		bob = await signup({ username: 'bob' });
		carol = await signup({ username: 'carol' });
	}, 1000 * 60 * 2);

	test('Block作成', async () => {
		const res = await api('blocking/create', {
			userId: bob.id,
		}, alice);

		assert.strictEqual(res.status, 200);
	});

	test('ブロックされているユーザーをフォローできない', async () => {
		const res = await api('following/create', { userId: alice.id }, bob);

		assert.strictEqual(res.status, 400);
		assert.strictEqual(castAsError(res.body).error.id, 'c4ab57cc-4e41-45e9-bfd9-584f61e35ce0');
	});

	test('ブロックされているユーザーにリアクションできない', async () => {
		const note = await post(alice, { text: 'hello' });

		const res = await api('notes/reactions/create', { noteId: note.id, reaction: '👍' }, bob);

		assert.strictEqual(res.status, 400);
		assert.ok(res.body);
		assert.strictEqual(castAsError(res.body).error.id, '20ef5475-9f38-4e4c-bd33-de6d979498ec');
	});

	test('ブロックされているユーザーに返信できない', async () => {
		const note = await post(alice, { text: 'hello' });

		const res = await api('notes/create', { replyId: note.id, text: 'yo' }, bob);

		assert.strictEqual(res.status, 400);
		assert.ok(res.body);
		assert.strictEqual(castAsError(res.body).error.id, 'b390d7e1-8a5e-46ed-b625-06271cafd3d3');
	});

	test('ブロックされているユーザーのノートをRenoteできない', async () => {
		const note = await post(alice, { text: 'hello' });

		const res = await api('notes/create', { renoteId: note.id, text: 'yo' }, bob);

		assert.strictEqual(res.status, 400);
		assert.strictEqual(castAsError(res.body).error.id, 'b390d7e1-8a5e-46ed-b625-06271cafd3d3');
	});

	// TODO: ユーザーリストに入れられないテスト

	// TODO: ユーザーリストから除外されるテスト

	test('タイムライン(LTL)にブロックされているユーザーの投稿が含まれない', async () => {
		const aliceNote = await post(alice, { text: 'hi' });
		const bobNote = await post(bob, { text: 'hi' });
		const carolNote = await post(carol, { text: 'hi' });

		await vi.waitFor(async () => {
			const res = await api('notes/local-timeline', {}, bob);
			const body = res.body as misskey.entities.Note[];

			assert.strictEqual(res.status, 200);
			assert.strictEqual(Array.isArray(res.body), true);
			assert.strictEqual(body.some(note => note.id === aliceNote.id), false);
			assert.strictEqual(body.some(note => note.id === bobNote.id), true);
			assert.strictEqual(body.some(note => note.id === carolNote.id), true);
		}, waitForPushToTlOptions);
	});
});

describe('Block (notes/reactions)', () => {
	let alice: misskey.entities.SignupResponse;
	let bob: misskey.entities.SignupResponse;
	let carol: misskey.entities.SignupResponse;
	let dave: misskey.entities.SignupResponse;

	beforeAll(async () => {
		alice = await signup({ username: 'block_r_alice' });
		bob = await signup({ username: 'block_r_bob' });
		carol = await signup({ username: 'block_r_carol' });
		dave = await signup({ username: 'block_r_dave' });
	}, 1000 * 60 * 2);

	test('自分をブロックしているユーザーのリアクションが notes/reactions に含まれない', async () => {
		// carol が alice をブロック
		await api('blocking/create', { userId: alice.id }, carol);

		const note = await post(bob, { text: 'hi', visibility: 'public' });
		await react(bob, note, '👍');
		await react(carol, note, '👍');

		const res = await api('notes/reactions', { noteId: note.id }, alice);

		assert.strictEqual(res.status, 200);
		assert.strictEqual(res.body.some(r => r.user.id === bob.id), true);
		assert.strictEqual(res.body.some(r => r.user.id === carol.id), false);
	});

	test('被ブロックキャッシュ未生成でも自分をブロックしているユーザーのリアクションが notes/reactions に含まれない', async () => {
		// blocking/create 経由だとキャッシュが更新されるので、DB に直接挿入してキャッシュミス状態を再現する
		const connection = await initTestDb(true);
		await connection.getRepository(MiBlocking).insert({
			id: genAidx(Date.now()),
			blockerId: carol.id,
			blockeeId: dave.id,
		});
		await connection.destroy();

		const note = await post(bob, { text: 'hi', visibility: 'public' });
		await react(bob, note, '👍');
		await react(carol, note, '👍');

		const res = await api('notes/reactions', { noteId: note.id }, dave);

		assert.strictEqual(res.status, 200);
		assert.strictEqual(res.body.some(r => r.user.id === bob.id), true);
		assert.strictEqual(res.body.some(r => r.user.id === carol.id), false);
	});
});
