/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import type { Packed } from '@/misc/json-schema.js';
import type { MiUserProfile } from '@/models/UserProfile.js';
import type { CommonProps } from '@/server/web/views/_.js';
import { Layout } from '@/server/web/views/base.js';

/**
 * yamisskey: 匿名アクセスに本文を見せない場合の最小プロフィールページ (#327)
 *
 * bio・表示名・アバター・投稿は出さず、以下のみを出力する:
 * - acct のみのタイトル / og:title（アカウントの存在は WebFinger / AP actor で公開済み）
 * - プロフィール追加情報の URL への rel=me リンク（AP actor の attachment として公開済みの情報。
 *   これが無いと他サーバーからの rel=me 検証バッジと OGP プレビューが機能しない）
 *
 * いずれも「連合有効かつ AP actor で既に公開されている情報」のみで構成され、新規の露出はない。
 * 呼び出し側 (ClientServerService) がプロフィール本体・ローカル・連合有効の場合に限定しており、
 * 本コンポーネント内の federationEnabled ガードはその二重防御。
 */
export function UserMinimalPage(props: CommonProps<{
	user: { id: string; username: string; host: string | null; uri: string | null };
	profile: MiUserProfile;
}>) {
	const acct = `@${props.user.username}${props.user.host ? `@${props.user.host}` : ''}`;
	const me = props.profile.fields
		? props.profile.fields
			.filter(field => field.value != null && field.value.match(/^https?:/))
			.map(field => field.value)
		: [];

	function ogBlock() {
		return (
			<>
				<meta property="og:type" content="blog" />
				<meta property="og:title" content={acct} />
				<meta property="og:url" content={`${props.config.url}/@${props.user.username}`} />
				<meta property="twitter:card" content="summary" />
			</>
		);
	}

	function metaBlock() {
		return (
			<>
				<meta name="misskey:user-username" content={props.user.username} />
				<meta name="misskey:user-id" content={props.user.id} />

				{props.federationEnabled ? (
					<>
						{props.user.host == null ? <link rel="alternate" type="application/activity+json" href={`${props.config.url}/users/${props.user.id}`} /> : null}
						{props.user.uri != null ? <link rel="alternate" type="application/activity+json" href={props.user.uri} /> : null}
					</>
				) : null}

				{me.map((url) => (
					<link rel="me" href={url} />
				))}
			</>
		);
	}

	return (
		<Layout
			{...props}
			title={`${acct} | ${props.instanceName}`}
			noindex={true}
			metaSlot={metaBlock()}
			ogSlot={ogBlock()}
		>
		</Layout>
	);
}

export function UserPage(props: CommonProps<{
	user: Packed<'UserDetailed'>;
	profile: MiUserProfile;
	sub?: string;
}>) {
	const title = props.user.name ? `${props.user.name} (@${props.user.username}${props.user.host ? `@${props.user.host}` : ''})` : `@${props.user.username}${props.user.host ? `@${props.user.host}` : ''}`;
	const me = props.profile.fields
		? props.profile.fields
			.filter(field => field.value != null && field.value.match(/^https?:/))
			.map(field => field.value)
		: [];

	function ogBlock() {
		return (
			<>
				<meta property="og:type" content="blog" />
				<meta property="og:title" content={title} />
				{props.user.description != null ? <meta property="og:description" content={props.user.description} /> : null}
				<meta property="og:url" content={`${props.config.url}/@${props.user.username}`} />
				<meta property="og:image" content={props.user.avatarUrl} />
				<meta property="twitter:card" content="summary" />
			</>
		);
	}

	function metaBlock() {
		return (
			<>
				{props.user.host != null || props.profile.noCrawle ? <meta name="robots" content="noindex" /> : null}
				{props.profile.preventAiLearning ? (
					<>
						<meta name="robots" content="noimageai" />
						<meta name="robots" content="noai" />
					</>
				) : null}
				<meta name="misskey:user-username" content={props.user.username} />
				<meta name="misskey:user-id" content={props.user.id} />

				{props.sub == null && props.federationEnabled ? (
					<>
						{props.user.host == null ? <link rel="alternate" type="application/activity+json" href={`${props.config.url}/users/${props.user.id}`} /> : null}
						{props.user.uri != null ? <link rel="alternate" type="application/activity+json" href={props.user.uri} /> : null}
						{props.profile.url != null ? <link rel="alternate" type="text/html" href={props.profile.url} /> : null}
					</>
				) : null}

				{me.map((url) => (
					<link rel="me" href={url} />
				))}
			</>
		);
	}

	return (
		<Layout
			{...props}
			title={`${props.user.name || props.user.username} (@${props.user.username}) | ${props.instanceName}`}
			desc={props.user.description ?? ''}
			metaSlot={metaBlock()}
			ogSlot={ogBlock()}
		>
		</Layout>
	);
}
