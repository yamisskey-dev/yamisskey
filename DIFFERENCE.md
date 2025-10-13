# DIFFRENCE

## Unreleased

### Fix
- **やみモード切り替え時の閲覧不可能なタイムラインへの遷移を防止**
  - やみモード切り替え時に、ロール設定により閲覧不可能になるタイムラインを表示していた場合、エラーメッセージが表示される問題を修正
  - モード切り替え前に、切り替え後も現在のTLが閲覧可能かを実際のロール権限（`$i.policies`）とユーザー設定（`prefer.s`）で判定
  - 閲覧不可能になる場合は、事前にホームTLに自動遷移してエラーを回避
  - 各TL（yami/local/social/global）の権限を個別に評価し、決め打ちではなく柔軟に対応
- **投稿フォームボタン設定のエラー修正とUI改善**
  - 不正なボタン定義によるTypeError (`Cannot read properties of undefined (reading 'icon')`) を修正
  - 保存された設定に不正なキーが含まれていても自動的にフィルタリングして動作するように改善
  - UIをnavbar/statusbar設定と同じスタイルに統一（ドラッグハンドル + アイコン + テキスト + 削除ボタン）
  - スマホでの操作性を向上（タッチでドラッグしやすく、項目が判別しやすい）

### Feat
- **投稿フォームボタン設定の独立ページ化**
  - `/settings/postform-buttons` に専用設定ページを新設
  - 投稿フォームのフッターバー右端に設定アイコン（⚙️）を追加
  - 3つのアクセス経路を用意：投稿フォームから直接 / 設定の投稿フォームセクション内 / 設定トップのリンクエリア
  - navbar/statusbarと統一されたUIパターンで一貫性を向上

### Technical Details
- **Frontend実装**
  - `navbar.vue`: `toggleYamiMode()` 関数にTL閲覧可否チェックロジックを追加
  - `local-storage.ts`: やみモード切り替え確認ダイアログのキー（`neverShowExitYamiModeInfo`, `neverShowEnterYamiModeInfo`）を`Keys`型に追加して型エラーを解消
  - `postform-buttons.vue`: 新規設定ページ作成（navbar.vueをベースに実装）
  - `MkPostForm.vue`: フッター右側に設定ボタン追加、`openPostFormSettings()` 関数実装
  - `preferences.vue`: 投稿フォームセクション内と下部リンクエリアにpostform-buttonsへのリンク追加、旧実装を削除
  - `router.definition.ts`: `/settings/postform-buttons` ルート定義追加
  - `post-form.ts`: `bottomItemDef` のアイコン定義は変更なし（`ti-` プレフィックス付き）

## 2025.10.0-yami-1.9.23

### Feat
- **チャンネル投稿フィルタリング機能の追加**
  - ホーム・ソーシャルタイムラインに「フォロー中チャンネルのフォロー外ユーザーの投稿を除外」オプションを追加
  - デフォルトはOFF（本家Misskey仕様：フォロー中チャンネルの全ユーザーの投稿を表示）
  - ONにすると、フォロー中チャンネル内でもフォロー中のユーザー（または自分）の投稿のみを表示
  - 通常タイムラインとDeck UIの両方に対応
  - 設定は永続化され、タイムラインごとに個別に設定可能

### Fix
- **やみノートとチャンネル投稿の分離**
  - チャンネル投稿が強制的に非やみノートに設定されるように修正
  - やみタイムラインとチャンネルタイムラインを明確に分離
  - チャンネル内投稿時にやみノートボタンが表示されないように修正（固定フォーム・ポップアップ両方）
- チャンネル編集画面でフォロワー公開範囲の選択肢が表示されない問題を修正（MkSelectコンポーネントの仕様変更に対応）

### Technical Details
- **Backend実装**
  - `NoteCreateService.ts`: チャンネル投稿を強制的に非やみノートに設定
  - `notes/timeline.ts`, `notes/hybrid-timeline.ts`: エンドポイントにフィルタリングロジック追加（DB直接取得とFanout timeline両方に対応）
  - `stream/channels/home-timeline.ts`, `stream/channels/hybrid-timeline.ts`: ストリーミングにフィルタリングロジック追加
- **Frontend実装**
  - `store.ts`: `excludeChannelNotesNonFollowing` フィルター設定を追加
  - `timeline.vue`, `tl-column.vue`: UI切り替えとパラメータ渡し
  - `MkStreamingNotesTimeline.vue`: Paginator/Streamingへのパラメータ伝播
  - `MkPostForm.vue`: チャンネル投稿時のやみノートボタン非表示化
  - `channel-editor.vue`: MkSelectコンポーネントの修正
- **misskey-js**: `streaming.types.ts`, `autogen/types.ts` に型定義追加
- **i18n**: 日本語・英語のロケールファイルに翻訳追加

## 2025.10.1-yami-1.9.22

### Fix
- 翻訳キーの追加と独自機能ラベルの統一
- 予約投稿成功通知でノート本文が重複表示される問題を修正
- 連合設定とDM/private公開範囲の整合性を修正

### Feat
- 予約投稿・下書きと時限消滅機能の統合

### Refactor
- 投稿設定の翻訳を簡潔化しUIを改善

## 2025.10.1-yami-1.9.21

### AI
@claude このPRをレビューしてください。yamisskeyへの本家misskey-dev/misskey 2025.10.0リリースのマージPRです。

#### Misskey 2025.10.0の主な変更点：

**NOTE**
- pnpm 10.16.0が必要
- ロールのインポート機能の利用可否ポリシーのデフォルト値が「いいえ」に変更
- ロールのアップロード可能なファイル種別ポリシーのデフォルト値に「text/*」が追加

**General**
- 予約投稿機能の実装（デフォルト作成可能数は1件、ロールポリシーで設定可能）
- 広告ごとのセンシティブフラグ設定
- 依存関係・翻訳の更新

**Client**
- QRコード表示・読み取り機能
- 動画圧縮アップロード機能
- (実験的) ブラウザ上でのノート翻訳
- チャット名称が「ダイレクトメッセージ」に変更（ベータ版終了）
- 画像編集にマスクエフェクト（塗りつぶし、ぼかし、モザイク）追加
- ウォーターマークにQRコード追加可能に
- テーマのドラッグ&ドロップ対応
- 各種パフォーマンス改善とバグ修正

**Server**
- Fastify​Options.trustProxyの追加（ユーザーIP取得の改善）

#### レビュー時の重点確認ポイント：

**互換性・影響範囲**
- yamisskey特有のプライバシー機能（やみノート、未ログイン制限、時限消滅等）への影響
- 既存の下書き機能から予約投稿への移行の整合性
- 予約投稿とやみノート機能の併用時の挙動
- APIエンドポイントの変更（`notes/schedule/*` → `notes/drafts/*`統合）による影響

**セキュリティ**
- 予約投稿機能のセキュリティ（やみノートの予約投稿が意図せず公開されないか）
- QRコード機能のセキュリティリスク
- 広告のセンシティブフラグが適切に機能しているか
- yamisskey独自の認証・制限機能への影響

**データ整合性**
- NoteDraftからScheduledNoteへのマイグレーション（`1758677617888-scheduled-post.js`）の安全性
- 既存の下書きデータが正しく予約投稿に変換されるか
- やみノートフラグ（`isPrivateNote`）が予約投稿でも保持されるか
- キューシステム（QueueService、QueueModule）での予約投稿処理の信頼性

**型定義とコンフリクト解決**
- misskey-js型定義の大規模更新（`autogen/types.ts`、`autogen/entities.ts`、`autogen/endpoint.ts`）
- yamisskey独自のAPIエンドポイント型定義が正しく維持されているか
- 以下のファイルでのマージコンフリクト解決が適切か：
  - `packages/backend/src/core/QueueModule.ts`
  - `packages/backend/src/core/QueueService.ts`
  - `packages/backend/src/core/RoleService.ts`
  - `packages/backend/src/core/entities/NotificationEntityService.ts`
  - `packages/backend/src/models/json-schema/notification.ts`
  - ロケールファイル（`ja-JP.yml`, `ja-KS.yml`, `en-US.yml`等）

**運用・パフォーマンス**
- 予約投稿のキュー処理パフォーマンス
- 画像編集機能の新エフェクト（blur、fill、pixelate）のパフォーマンス
- QRコード生成・読み取りのパフォーマンス
- ウォーターマークQRコード機能の負荷

**UI/UX**
- 予約投稿一覧UI（`MkNoteDraftsDialog.vue`）の使いやすさ
- 投稿フォーム（`MkPostForm.vue`）での予約投稿機能の統合が直感的か
- やみマークが予約投稿一覧で正しく表示されるか
- QRコードページ（`/qr`）のUI/UX

**テスト推奨項目**
- やみノートの予約投稿作成・実行・表示
- 予約投稿一覧でのやみマーク表示
- やみタイムラインでの予約投稿の扱い
- QRコード機能（表示・読み取り・ウォーターマーク統合）
- 広告のセンシティブフラグ機能
- 画像編集の新エフェクト（blur、fill、pixelate）
- ロールポリシー（予約投稿数制限、やみノート権限等）
- 既存のyamisskey独自機能全般（やみモード切り替え、未ログイン制限、時限消滅等）

特に今回は、**予約投稿機能の統合**が最大の変更点であり、yamisskey独自の下書き機能からの移行と、やみノート機能との統合が適切に行われているかを重点的に確認してください。また、**多数のマージコンフリクト**が発生しているため、型定義やキューシステム、ロールシステムでのyamisskey独自実装が正しく維持されているかも慎重にレビューお願いします。

セキュリティ、パフォーマンス、コード品質、データ整合性の観点で問題点があれば指摘してください。

### Misskey 2025.10.0への追従

yamisskey (muyami) ブランチにて、Misskey 2025.10.0のアップストリームタグをマージしました。

#### Misskey 2025.10.0の主な変更点

本家 Misskey 2025.10.0 の主要な新機能・改善：

##### General
- **予約投稿機能の追加**: ノートを予約投稿できるように（デフォルトは1件、ロールのポリシーで設定可能）
- **広告のセンシティブフラグ**: 広告ごとにセンシティブフラグを設定可能に
- **依存関係の更新**: セキュリティ・安定性の向上
- **翻訳の更新**: 多言語対応の改善

##### Client
- **QRコード機能**: アカウントのQRコードを表示・読み取り可能に
- **動画圧縮アップロード**: 動画を圧縮してアップロード可能に
- **(実験的) ブラウザ翻訳**: ブラウザ上でノートの翻訳を実行可能に
- **チャット名称の変更**: 「チャット」の日本語名称が「ダイレクトメッセージ」に戻り、ベータ版機能ではなくなりました
- **画像編集の強化**: マスクエフェクト（塗りつぶし、ぼかし、モザイク）と集中線エフェクトの強化を追加
- **ウォーターマークQRコード**: ウォーターマークにアカウントのQRコードを追加可能に
- **テーマのドラッグ&ドロップ**: テーマをドラッグ&ドロップでインストール可能に
- **絵文字ピッカーのサイズ拡大**: より大きいサイズに設定可能
- **カスタム絵文字一覧のパフォーマンス改善**: 大量の絵文字でもフリーズしないように
- **時刻計算のパフォーマンス向上**: 基準値を一か所で管理し最適化
- **お問い合わせページの改善**: バグ調査に役立つ情報（OS・ブラウザバージョン等）を取得・コピー可能に
- **各種バグ修正**: iOSダークモードエラー、アクティビティウィジェット、絵文字検索など

##### Server
- **ユーザーIP取得の改善**: 設定ファイルに`Fastify​Options.trustProxy`を追加

#### yamisskey 固有機能への影響と対応

##### 予約投稿機能（下書き→予約投稿への移行）
- **影響**: yamisskey既存の下書き機能（`NoteDraft`）から本家の予約投稿機能（`ScheduledNote`）へ移行
- **対応**:
  - マイグレーション作成: `1758677617888-scheduled-post.js`
  - `NoteDraftService`を予約投稿に対応するよう更新
  - `QueueService`・`QueueModule`に予約投稿処理を統合
  - フロントエンド: 下書き一覧UIを予約投稿一覧に更新（`MkNoteDraftsDialog.vue`）
  - フロントエンド: 投稿フォーム（`MkPostForm.vue`）に予約投稿機能を統合

##### やみノートとの統合
- **影響**: 予約投稿とやみノート機能の併用
- **対応**:
  - 予約投稿作成時にやみノートフラグ（`isPrivateNote`）を保持
  - 予約投稿一覧でやみマークを表示
  - やみタイムラインでの予約投稿の扱いを考慮

##### QRコード機能
- **影響**: なし（新機能として追加）
- **対応**: yamisskey独自機能と干渉なし。QRコードページ実装（`/qr`）を追加

##### 広告のセンシティブフラグ
- **影響**: 広告管理機能への追加
- **対応**:
  - マイグレーション作成: `1757823175259-sensitive-ad.js`
  - バックエンド: `Ad`モデルに`isSensitive`フィールド追加
  - フロントエンド: 管理画面の広告作成・編集UIに対応

##### 画像編集・ウォーターマーク機能の強化
- **影響**: yamisskey既存のウォーターマーク機能との統合
- **対応**:
  - 本家の画像エフェクト強化（blur、fill、pixelate）をマージ
  - ウォーターマークにQRコード追加機能を統合
  - `ImageEffector`と関連エフェクトの更新

##### ロールシステムの更新
- **影響**: yamisskey独自のロールポリシー（やみノート権限等）との統合
- **対応**:
  - `RoleService`の更新に伴い、yamisskey独自のロール条件を維持
  - 予約投稿数のロールポリシーを追加
  - コンフリクト解決: `packages/backend/src/core/RoleService.ts`

##### 通知システムの更新
- **影響**: yamisskey独自の通知タイプ（`unfollow`等）との統合
- **対応**:
  - `NotificationEntityService`の更新に伴い、yamisskey独自通知を維持
  - `Notification`モデルの型定義を統合
  - コンフリクト解決: `packages/backend/src/models/json-schema/notification.ts`

##### キューシステムの拡張
- **影響**: 予約投稿キュー処理の追加
- **対応**:
  - `QueueService`・`QueueModule`に`postScheduledNote`キューを追加
  - `PostScheduledNoteProcessorService`を実装（旧`ScheduleNotePostProcessorService`を置き換え）
  - キュー定数の更新: `packages/backend/src/queue/const.ts`
  - コンフリクト解決: キュー関連の複数ファイル

##### 型定義とAPIエンドポイントの更新
- **影響**: misskey-js型定義の大幅な変更
- **対応**:
  - `misskey-js`の型定義を再生成: `autogen/types.ts`、`autogen/entities.ts`、`autogen/endpoint.ts`
  - yamisskey独自のAPIエンドポイント型定義を維持
  - `notes/drafts/*`エンドポイントを予約投稿に対応

##### ロケール（多言語対応）の更新
- **影響**: 本家の翻訳更新とyamisskey独自の翻訳の統合
- **対応**:
  - 全ロケールファイルをマージ（特に`ja-JP.yml`、`ja-KS.yml`、`en-US.yml`）
  - yamisskey独自の翻訳キー（やみノート関連等）を維持
  - コンフリクト解決: 複数のロケールファイル

#### 技術的な課題と対応

##### マイグレーション
- **削除**: `1699437894737-scheduleNote.js`（旧下書き機能）
- **追加**:
  - `1757823175259-sensitive-ad.js`（広告センシティブフラグ）
  - `1758677617888-scheduled-post.js`（予約投稿への移行）

##### モデル・スキーマの変更
- **削除**: `NoteSchedule`モデル（旧予約投稿）
- **更新**: `NoteDraft`モデルを予約投稿に統合
- **更新**: `Ad`、`Notification`、`Role`のスキーマ

##### フロントエンドコンポーネントの変更
- **削除**: `MkSchedulePostListDialog.vue`
- **更新**: `MkNoteDraftsDialog.vue`を予約投稿一覧に更新
- **更新**: `MkPostForm.vue`に予約投稿UI統合
- **追加**: QRコードページ（`qr.vue`、`qr.show.vue`、`qr.read.vue`）

##### コンフリクト解決
多数のファイルでマージコンフリクトが発生し、以下のように対応：
- `QueueModule.ts`、`QueueService.ts`: yamisskey独自のキュー処理を維持しつつ予約投稿キューを統合
- `RoleService.ts`: yamisskey独自のロール条件とポリシーを維持
- `NotificationEntityService.ts`: yamisskey独自の通知タイプを維持
- ロケールファイル（`ja-JP.yml`、`en-US.yml`等）: yamisskey独自の翻訳を維持しつつ本家の更新をマージ

#### 互換性とテスト

##### 破壊的変更
- 下書き機能から予約投稿への移行（既存の下書きは自動的に予約投稿に変換されます）
- APIエンドポイント: `notes/schedule/*`から`notes/drafts/*`への統合

##### 推奨テスト項目
- やみノートと予約投稿の併用
- 予約投稿一覧でのやみマーク表示
- QRコード機能（ウォーターマークとの統合含む）
- 広告のセンシティブフラグ
- 画像編集機能（新エフェクト含む）
- ロールポリシー（予約投稿数制限含む）
- 既存のyamisskey独自機能（やみタイムライン、未ログイン制限等）の動作確認

#### まとめ

Misskey 2025.10.0の主要な変更をyamisskeyに統合し、既存の独自機能（やみノート、時限消滅、プライバシー設定等）との互換性を維持しました。特に予約投稿機能の統合では、既存の下書き機能からのスムーズな移行を実現しています。

## 2025.9.0-yami-1.9.21

### Feat
- チュートリアルにやみノートの説明を追加（日本語・英語・関西弁対応）

### Fix
- 型エラー150個以上を修正（本番コード完全解決）
  - CreateSystemUserService/MfmService/NoteCreateService等の型定義を修正
  - API endpoints: 適切な権限スコープ（kind）を追加
  - yamisskey独自のセキュリティ設定（requireCredential, secure）を維持
- ESLintエラーを修正
- 新規ユーザーのプライバシーデフォルト値をpowerマイグレーションに追加
  - publicReactions: false（リアクションを非公開）
  - hideActivity: true（アクティビティを非公開）
  - hideProfileFiles: true（プロフィールのファイルを非公開）
- 通知設定から廃止済みのgroupInvited項目を除外

### Chore
- `pnpm build-misskey-js-with-types`の実行

## 2025.9.0-yami-1.9.20

### Feat
- デッキUIでやみタイムラインとその専用オプションに対応
- 新規ユーザーチュートリアルの改善（セキュリティ設定・やみノート・公開範囲の説明追加）

### Fix
- モデレーターにモデレーションログの閲覧権限を付与
- アクセストークン権限の翻訳欠落を修正（ユーザー承認システム関連）
- モデレーションログの翻訳追加（clearQueue, promoteQueue）
- 未実装の`followRequestRejected`通知タイプを削除
- フォーク由来のTypeScriptエラーを修正
- フォーク特有の型定義エラーと実装ミスを修正
- 管理者・設定ページでの SearchLabel 重複警告を解決

### Perf
- 使用されていないRedisタイムラインキャッシュを削除（hybrid/globalタイムライン）

### i18n
- 英語・関西弁の翻訳とタイムラインフィルター対応を追加
- デッキUIのタイムラインフィルターオプションを追加（localOnly, remoteOnly, withHashtags, excludeBots）

## 2025.9.0-yami-1.9.19

### AI
<!-- Gemini: @gemini このPRをレビューしてください（Gemini APIは認証問題により無効化中） -->
@claude このPRをレビューしてください。yamisskeyへの本家misskey-dev/misskey 2025.9.0リリースのマージPRです。

#### 2025.9.0 主な変更点は以下の通りです：

##### Client:
- AiScriptAppウィジェットのエラー表示改善
- `/flush`ページでのキャッシュクリア機能追加
- クリップ/リスト/アンテナ/ロール追加メニューの表示件数拡張
- 「キャッシュを削除」ボタンのブラウザキャッシュ対応
- Ctrl/Command+クリックで新タブ対応
- プッシュ通知・RSSティッカー・アカウント切替・画像表示等のバグ修正

##### Server:
- webp等画像のセンシティブ検出修正

#### レビュー時の重点確認ポイント：

- yamisskey特有のプライバシー機能（やみノート、未ログイン制限等）への影響
- 既存のcherry-pick機能や独自拡張との競合リスク
- APIや型定義ファイル（TypeScript定義等）でのコンフリクト・破壊的変更の有無
- セキュリティ、パフォーマンス、コード品質の観点での問題点

特に今回、型定義ファイル（定義ファイル）で多くのコンフリクトが発生したため、
型の互換性やyamisskey固有の型拡張・上書き部分が正しく維持されているかを重点的に確認してください。

### Feat
- Misskey 2025.9.0への追従

## 2025.8.0-yami-1.9.19

### Fix
- ハッシュタグボタンを押しても入力欄が表示されない問題を修正
- `excludeBots`タイムラインフィルターがリロード時にリセットされる問題を修正

## 2025.8.0-yami-1.9.18

### Feat
- チャンネル一覧ページにピン止めタブを追加
- チャンネルピン止め機能をお気に入り機能から独立し、検索式選択に改善
- チャンネルタイムラインに専用の投稿フォーム設定オプションを追加

## 2025.8.0-yami-1.9.17

### Fix
- 浮上タイムラインに自動ロード機能を対応

## 2025.8.0-yami-1.9.16

### Fix
- リリースワークフローでDockerイメージが作成されない問題を修正
- GitHub Releaseを`published`状態で作成してDockerワークフローを発火させるよう改善

## 2025.8.0-yami-1.9.15

### Test
- 修正版リリースワークフローのテスト実行

## 2025.8.0-yami-1.9.14

### Test
- タグ重複エラー修正の検証
- DIFFERENCE.mdからの正確なリリースノート抽出テスト
- AI Code Reviewセクション除去の確認

### Fix
- GitHub Actionsリリースワークフローの修正
- タグ重複エラーの解決: 既存タグ削除処理を追加
- リリースノート取得の改善: DIFFERENCE.mdから正確にバージョンセクションを抽出
- AI Code Review Requestセクションの除去
- 既存リリース削除処理を追加してリリース重複エラーを回避

## 2025.8.0-yami-1.9.13

### AI
@claude このPRをレビューしてください。セキュリティ、パフォーマンス、コード品質の観点で問題点があれば指摘してください。
<!-- Gemini: @gemini このPRをレビューしてください（Gemini APIは認証問題により無効化中） -->

### Fix
- 外部クライアントとの互換性問題（`user.createdAt`が`null`になる）を修正するため、登録日を非表示にする機能を削除

## 2025.8.0-yami-1.9.12

### AI
@claude このPRをレビューしてください。本家misskey-dev/misskeyの2025.8.0リリースをyamisskeyフォークにマージした内容です。

以下の観点で重点的に確認をお願いします：

**互換性・影響範囲**
- yamisskey特有のプライバシー機能（やみノート、未ログイン制限等）への影響
- 既存のcherry-pickした機能との競合リスク
- APIの破壊的変更（ノート削除時の関連データ保持）の影響範囲

**セキュリティ**
- Node.js 22.15.0への更新に伴うセキュリティ強化点
- 新しいリモート投稿クリーニング機能の安全性
- 認証周りの変更がyamisskeyの制限機能に与える影響

**運用・パフォーマンス**
- データベースサイズ削減機能の効果と注意点
- 新しいCLIコマンドの運用面での利便性
- AiScript 1.1.0更新によるプラグイン互換性

**テスト推奨項目**
- やみモード関連機能の動作確認
- 未ログインユーザー制限の継続確認
- 時限消滅ノート機能との相互作用

セキュリティ、パフォーマンス、コード品質の観点で問題点があれば指摘してください。

<!-- Gemini: @gemini このPRをレビューしてください（Gemini APIは認証問題により無効化中） -->

### Feat
- Misskey 2025.8.0への追従
- 全タイムライン種別にBotフィルタリングオプションを追加
- 予約投稿一覧に削除予定時刻の表示を追加
- アクティブ状態の既定値を非公開に変更（プライバシー強化）

### Fix
- やみタイムラインのMisskey 2025.8.0互換性を修正
- やみタイムラインのオプション`showYamiNonFollowingPublicNotes`で過去のノートが取得できない問題を修正
- 廃止されたSearchKeywordをSearchTextに置換し、SearchIcon閉じタグを修正
- フロントエンド：重複するプライバシー設定エントリを削除
- フロントエンド：タイムラインフィルターオプションにアイコンを追加してUIレイアウトを統一
- 一行に収まらないやみTLフィルタリングオプションの翻訳を短縮
- 過度に長い英語タブタイトルを短縮
- Botアカウントを除外するタイムラインオプションの翻訳を追加
- メンタルヘルス設定項目の「独自機能」ラベル付け忘れを修正
- `pnpm build-misskey-js-with-types`の修正
- ロケールファイルの更新

### Refactor
- 削除予定アイコンをメタデータエリアに移動

### Clean
- JitsiMeet ウィジェットからデバッグ用console.logを削除

### Chore
- 依存関係の更新
- セキュリティ修正の適用
- yamisskey著作権表示更新
- Claude PR Assistantの一時削除（`claude /install-github-app`準備のため）

### Enhance
- 最新版Misskeyとの互換性向上
- UIの一貫性とユーザビリティの改善
- プライバシー機能の強化

## 2025.7.0-yami-1.9.11

### Feat
- リリースワークフローを Yamisskey フォークと nayami→yami フローに移行
- ユーザー登録日プライバシーオプション追加

### Enhance
- やみノートが投稿できる時にデフォルトでやみノートで投稿する設定を有効化
- フォロー解除通知の型定義を追加
- フロントエンド ESLint エラーを修正
- yamisskey-timeline Promise バグを修正

### Chore
- GitHub Actions ワークフローを yamisskey repository 用に更新
- Docker ワークフローを yamisskey 用に更新
- カスタムフォントリストに新しいフォント追加
- SPDX ライセンスヘッダーを追加
- やみモード切り替えボタンの設定表示を改善

### Fix
- muyami ブランチでバージョン名プレフィックスが nayami になっていた問題を修正
- CI コンプライアンス用の各種修正
- Repository URL を実際の GitHub organization 名に修正

## 2024.10.1-yami-1.3.8
### Feat
- 最終アクティブでコンディショナルなロールを制御可能に (cherry-pick: pwpspace)

## 2024.10.0-yami-1.3.7
### Feat
- アカウント登録を承認制に出来るように (cherry-pick: serafuku) + chore(lqvp-fork)

## 2024.10.0-yami-1.3.6
### Feat
- ユーザーのサーバー情報をアイコンのみにする (MattyaDaihuku)
- 投稿フォーム下部の項目をカスタマイズできるように (cherry-pick: kakurega.app)
- 投稿フォームをリセットできるボタンを追加 (cherry-pick: kakurega.app)
- ノートの時限消滅のデフォルト値を設定できるように (cherry-pick: kakurega.app)
### Enhance
- ノートの時限消滅の設定欄を折りたたんだ状態の表示を改善 (cherry-pick: kakurega.app)
- ノートの時限消滅機能を改善 (cherry-pick: kakurega.app)
- ノートの時限消滅の経過指定の挙動を改善 (cherry-pick: kakurega.app)
### Refactor
- 時限消滅ノートで1年以上後の日時を指定できないように (cherry-pick: kakurega.app)

## 2024.10.0-yami-1.3.5
### Enhance
- ドライブの削除をすぐ消すように変更

## 2024.10.0-yami-1.3.4
### Enhance
- 連合情報周りで認証を必須に
- /aboutの不要な部分を削除

## 2024.10.0-yami-1.3.3
### Feat
- KaTeXを戻す
## Enhance
- user/note/channelの一部metaを削除

## 2024.9.0-yami-1.3.2
### Feat
- ドライブの写真をプロフィールから見れなくする

## 2024.9.0-yami-1.3.1
### Client
- フォロー/フォロワー/アナウンス/みつける/Play/ギャラリー/チャンネル/TL/ユーザー/ノートのページをログイン必須に
- hideReactionUsersをデフォルトで有効に(未ログインユーザーからリアクションしたユーザーを隠せます)

## 2024.9.0-yami-1.3.0
### Feat
- ロールで引用通知の設定を制限出来るように

## 2024.9.0-yami-1.2.9
### Feat
- ノート数を隠せるように(連合しません)

## 2024.9.0-yami-1.2.8
### Feat
- Cherry-Pick アクティビティの非公開機能(hideki0403/kakurega.app)
- Cherry-Pick 誰がリアクションをしたのかを非表示にできる機能を実装(hideki0403/kakurega.app)
- Cherry-Pick リアクション数の非表示機能を実装(hideki0403/kakurega.app)

## 2024.9.0-yami-1.2.7
### Enhance
- プライバシーに考慮して、「noCrawle/isExplorable/hideOnline/ffVisibility/フォロリクの自動承認/鍵垢/リアクションの受け入れ」のデフォルト値を変更

## 2024.9.0-yami-1.2.6
### Client
- 状態にかかわらず未ログインユーザーからノートを非表示に(1.2.4の強化)
### Server
- `notes/show`, `users/notes`の認証を不要に(revert?)

## 2024.9.0-yami-1.2.5
### Feat
- フォロー解除時にも通知するように

## 2024.8.0-yami-1.2.4
### Feat
- リアクションでミュートを考慮する
### Client
- 連合なしノートを未ログイン状態で閲覧出来ないように

## 2024.8.0-yami-1.2.0
### Feat
- ノートの時限消滅(cherry-pick)
- フォローリクエスト自動拒否(cherry-pick)

## 2024.8.0-yami-1.1.0
### Server
- Cherry-Pick リバーシの連合に対応(yojo-art/cherrypick)

## 2024.8.0-yami-1.0.1/1.0.2/1.0.3/1.0.4
### Client
- エントランスからユーザー数/ノート数/チャートを削除
### Server
- ノート/ハイライトの取得に認証を要求
- 絵文字のエクスポートにモデレーター権限を要求
- チャンネル内のTLの取得に認証を要求
- metaからノートの内容を削除

## 2024.7.0-yami_v1.0
### Client
- Cherry-Pick 利用する検索エンジンを選べるようにする(nexryai/nexkey) + SearX Support
