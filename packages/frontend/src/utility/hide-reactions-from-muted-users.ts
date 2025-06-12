import { ref, reactive } from 'vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';

// ミュートユーザーIDのグローバルキャッシュ
const userMutings = ref(new Set<string>());

// 最後の更新時刻を追跡してキャッシュの鮮度を管理
let lastUpdated = 0;
const CACHE_TTL = 60 * 1000; // 1分間キャッシュを有効にする

// リアクションユーザーのキャッシュ
// キー: noteId:reaction、値: ユーザーIDのリスト
const reactionUsersCache = reactive(new Map<string, string[]>());

/**
 * ミュートユーザーリストを取得する
 * @param forceUpdate 強制的に最新のデータを取得するかどうか
 * @returns ミュートユーザーIDのSet
 */
export async function fetchMutings(forceUpdate = false): Promise<Set<string>> {
	if (!$i) return new Set();

	// キャッシュが有効な場合はそれを使用
	const now = Date.now();
	if (!forceUpdate && now - lastUpdated < CACHE_TTL && userMutings.value.size > 0) {
		return userMutings.value;
	}

	try {
		const mutings = await misskeyApi('mute/list');
		userMutings.value = new Set(mutings.map(m => m.muteeId));
		lastUpdated = now;
		return userMutings.value;
	} catch (err) {
		console.error('Failed to fetch mutings:', err);
		return new Set();
	}
}

/**
 * ユーザーがミュートされているか確認する
 * @param userId 確認するユーザーID
 * @returns ミュートされていればtrue
 */
export function isUserMuted(userId: string): boolean {
	// 自分自身は常にミュートされていない
	if ($i && userId === $i.id) return false;
	return userMutings.value.has(userId);
}

/**
 * 特定のノートの特定のリアクションに対するユーザーリストを取得する
 * @param noteId ノートID
 * @param reaction リアクション絵文字
 * @returns ユーザーIDのリスト
 */
export async function fetchReactionUsers(noteId: string, reaction: string): Promise<string[]> {
	const cacheKey = `${noteId}:${reaction}`;

	// キャッシュがあればそれを使用
	if (reactionUsersCache.has(cacheKey)) {
		return reactionUsersCache.get(cacheKey) || [];
	}

	try {
		const reactions = await misskeyApi('notes/reactions', {
			noteId,
			type: reaction,
			limit: 100, // 十分な数を取得
		});

		const userIds = reactions.map(r => r.user.id);
		reactionUsersCache.set(cacheKey, userIds);

		return userIds;
	} catch (err) {
		console.error(`Failed to fetch users for reaction ${reaction}:`, err);
		return [];
	}
}

/**
 * リアクションユーザーをフィルタリングして返す
 * @param reactions リアクションユーザーの配列
 * @returns フィルタリングされたリアクションユーザーの配列
 */
export function filterMutedReactionUsers(reactions) {
	if (!$i || userMutings.value.size === 0) return reactions;

	return reactions.filter(r => {
		// 自分のリアクションは常に表示
		if ($i && r.user.id === $i.id) return true;

		// ミュートユーザーのリアクションは除外
		return !isUserMuted(r.user.id);
	});
}

/**
 * リアクション絵文字ごとのカウントを調整する
 * @param reactions リアクション絵文字とカウントのオブジェクト
 * @param noteId ノートID
 * @returns 更新されたリアクションカウント
 */
export async function filterMutedReactionCounts(reactions, noteId) {
	if (!$i || userMutings.value.size === 0) return { ...reactions };

	// ミュートユーザーリストを取得
	await fetchMutings();

	// 新しいリアクションオブジェクトを作成
	const result = {};

	// すべてのリアクションを処理
	for (const currentReaction of Object.keys(reactions)) {
		// リアクションごとのユーザーリストを取得
		const userIds = await fetchReactionUsers(noteId, currentReaction);

		if (userIds.length === 0) {
			// APIからユーザー情報を取得できなかった場合
			// ミュートユーザーのリアクションも含まれている可能性があるため、
			// 安全のために元のカウントを維持しない (非表示に)
			continue;
		}

		// 非ミュートユーザーのID一覧
		const nonMutedUserIds = userIds.filter(userId => !isUserMuted(userId));

		// 非ミュートユーザーのカウント
		const nonMutedCount = nonMutedUserIds.length;

		// 自分のリアクションの場合は常に表示
		const isMyReaction = $i && userIds.includes($i.id);

		// 非ミュートユーザーからのリアクションがある場合、または自分のリアクションの場合は追加
		if (nonMutedCount > 0 || isMyReaction) {
			// 自分のリアクションの場合は最低1にする
			result[currentReaction] = isMyReaction ? Math.max(nonMutedCount, 1) : nonMutedCount;
		}
		// 完全にミュートユーザーだけの場合は結果に含めない (resultに追加しない)
	}

	return result;
}

/**
 * 特定のリアクションがミュートユーザーだけのものかをチェック
 * @param noteId ノートID
 * @param reaction リアクション絵文字
 * @returns ミュートユーザーだけのリアクションならtrue
 */
export async function isReactionFromMutedUsersOnly(noteId, reaction) {
	// リアクションユーザーを取得
	const userIds = await fetchReactionUsers(noteId, reaction);

	if (userIds.length === 0) return false;

	// 自分のリアクションなら「ミュートユーザーだけ」ではない
	if ($i && userIds.includes($i.id)) return false;

	// すべてのユーザーがミュートされているかチェック
	return userIds.every(userId => isUserMuted(userId));
}

/**
 * キャッシュをクリアする
 */
export function clearCache() {
	userMutings.value.clear();
	reactionUsersCache.clear();
	lastUpdated = 0;
}

// WebSocketイベントでミュートリストをリアルタイム更新するコード
// (必要に応じて実装)

// リアクションタブ用のヘルパー関数を追加
export async function getFilteredReactionEmojis(noteId: string, reactions: Record<string, number>): Promise<string[]> {
  if (!$i || !prefer.s.hideReactionsFromMutedUsers) {
    return Object.keys(reactions);
  }

  // ミュートユーザーからのリアクションを除外
  const visibleReactions = await filterMutedReactionCounts(reactions, noteId);

  // 結果を絵文字のリストに変換
  return Object.keys(visibleReactions);
}
