# yamisskey 開発ガイド

![yamisskeyプロジェクトアイコン](https://github.com/yamisskey-dev/yamisskey-assets/blob/main/yamisskey/yamisskey_project.png?raw=true)

## 概要

このドキュメントは、yamisskey 開発チームメンバー向けの技術手順書です。

> [!NOTE]
> 開発への参加を希望される方は、まずプロジェクト管理者にご連絡ください。

[Misskey](https://github.com/misskey-dev/misskey) フォーク「[yamisskey](https://github.com/yamisskey-dev/yamisskey/)」の開発手順を説明します。基本的な開発手順は[フォーク元の開発ガイド](https://github.com/misskey-dev/misskey/blob/develop/CONTRIBUTING.md#development)を参照してください。

### 3ブランチによる開発フロー

開発の流れ: **muyami** → **nayami** → **master**

- **muyami**: 開発環境（ローカル）
- **nayami**: テスト環境（[なやみすきー](https://na.yami.ski/)）
- **master**: 本番環境（[やみすきー](https://yami.ski/)）

## ブランチ構成

### muyami ブランチ（開発環境）

- ローカルでの新機能開発と実験的機能の実装
- バージョン形式: `2025.1.0-muyami-1.4.3`

### nayami ブランチ（テスト環境）

- [なやみすきー](https://na.yami.ski/)での本番前検証
- バージョン形式: `2025.1.0-nayami-1.4.3`
- push時にDockerイメージ自動ビルド

### master ブランチ（本番環境）

- [やみすきー](https://yami.ski/)の安定運用版
- バージョン形式: `2025.1.0-yami-1.4.3`
- GitHubリリース時にDockerイメージ自動ビルド

## セットアップ

### 必要環境

- Node.js
- pnpm（worktreeとの併用でディスク容量を節約）
- Git（バージョン 2.15 以降）
- Go（ghq/gwq のインストール用）

### ghqとgwqのインストール

```bash
# ghqのインストール
go install github.com/x-motemen/ghq@latest

# gwqのインストール
go install github.com/d-kuro/gwq/cmd/gwq@latest
```

### 推奨開発環境

- Visual Studio Code（バージョン 1.103 以降、`git.detectWorktrees: true` で GUI 管理可能）
- Docker
- Dev Container（Claude Code が設定済み）

### リポジトリ準備

#### ghqを使ったリポジトリ管理（閲覧用）

[ghq](https://github.com/x-motemen/ghq)は閲覧用として、Misskey本家や他フォークを管理します。

```bash
# yamisskey（参照用）
ghq get https://github.com/yamisskey-dev/yamisskey.git

# Misskey本家（アップストリーム参照用）
ghq get https://github.com/misskey-dev/misskey.git

# 他フォーク（コード参照用）
ghq get https://github.com/kokonect-link/cherrypick.git
```

### git worktree構築（開発用）

#### gwqを使ったworktree管理

開発作業はすべて[gwq](https://github.com/d-kuro/gwq)で管理するworktreeで行います。ghqのリポジトリは閲覧専用として残します。

```bash
# ghqのリポジトリに移動（これがmasterブランチ）
cd $(ghq root)/github.com/yamisskey-dev/yamisskey

# リモート追加
git remote add upstream https://github.com/misskey-dev/misskey.git
git fetch --all --prune --tags

# gwqで開発用worktreeを作成（masterはghqのリポジトリを使用）
gwq add nayami
gwq add muyami
gwq list
```

#### pnpmとworktreeの相性

pnpmはハードリンクで`node_modules`を共有するため、worktreeを複数作成しても容量はほぼ1つ分で済みます。npmやyarnでは各worktreeで完全に複製されるため、容量が倍増します。

#### 各 worktree での初期設定

```bash
cd $(gwq get master)
pnpm install && pnpm build && pnpm build-misskey-js-with-types

cd $(gwq get nayami)
pnpm install && pnpm build && pnpm build-misskey-js-with-types

cd $(gwq get muyami)
pnpm install && pnpm build && pnpm build-misskey-js-with-types
```

#### Tips

- `gwq list` で開発用 worktree の一覧を確認
- `gwq get <ブランチ名>` で worktree のパスを取得
- ghq は閲覧用、gwq は開発用として分離
- VSCode では「ソース管理」→「Worktrees」から GUI 操作も可能
- Dev Container で権限エラーが出る場合：`sudo chown -R $(whoami) /workspaces/yamisskey.worktrees`

## 開発フロー

### 1. 新機能開発（muyami ブランチ）

```bash
cd $(gwq get muyami)
git pull origin muyami
git checkout -b feat/新機能名
```

### 2. 開発作業

```bash
# ...コーディング作業...
pnpm dev
pnpm build
pnpm migrate
git add .
git commit -m "feat: 機能の説明"
```

### 3. muyami ブランチへのマージ

```bash
git checkout muyami
git merge feat/新機能名
git push origin muyami
```

### 4. テスト環境への反映（nayami ブランチ）

```bash
cd $(gwq get nayami)
git pull origin nayami
git merge muyami
# package.jsonのバージョン更新（muyami → nayami）
pnpm build
git push origin nayami
```

### 5. 本番環境への反映（master ブランチ）

```bash
cd $(gwq get master)
git pull origin master
git merge nayami
# package.jsonのバージョン更新（nayami → yami）
pnpm build
git push origin master
```

## Claude Code を使った並列開発

複数の機能を並行開発する場合、機能ごとに worktree を作成します。pnpm のハードリンク共有により、worktree を増やしても容量はほぼ増えません。

```bash
cd $(ghq root)/github.com/yamisskey-dev/yamisskey

# 機能ごとのworktreeを作成
gwq add feat/feature-a
gwq add feat/feature-b

# 各worktreeで初期化
cd $(gwq get feat/feature-a)
pnpm install && pnpm build

cd $(gwq get feat/feature-b)
pnpm install && pnpm build

# 各worktreeでVSCodeを開く
code $(gwq get feat/feature-a)
code $(gwq get feat/feature-b)

# 開発完了後、muyamiにマージ
cd $(gwq get muyami)
git merge feat/feature-a
git merge feat/feature-b
git push origin muyami

# 不要なworktreeを削除
gwq remove feat/feature-a
gwq remove feat/feature-b
```

**Tips**: VSCode の GUI を使う場合は「ソース管理」→「Worktrees」から worktree を作成し、「Open Worktree in New Window」で各ウィンドウを開けます。同一ファイルを複数 worktree で編集する場合は、マージ時のコンフリクトに注意してください。

## 他フォークから機能を cherry-pick

```bash
# ghqで管理している他フォークのコミットログを確認（閲覧用）
cd $(ghq root)/github.com/kokonect-link/cherrypick
git log --oneline -20

# yamisskey muyami worktreeに移動（開発用）
cd $(gwq get muyami)

# 他フォークをリモートに追加（初回のみ）
git remote add cherrypick $(ghq root)/github.com/kokonect-link/cherrypick
git fetch cherrypick

# 特定のコミットをcherry-pick
git cherry-pick コミットID

# コンフリクトがある場合
git add .
git cherry-pick --continue
```

## アップストリームからの変更取り込み

### 準備：バックアップ作成

```bash
cd $(gwq get muyami)
git branch backup/$(date +%Y%m%d) muyami

cd $(gwq get nayami)
git branch backup/$(date +%Y%m%d) nayami

cd $(gwq get master)
git branch backup/$(date +%Y%m%d) master
```

### マージプロセス

#### 1. 開発ブランチ（muyami）への変更取り込み

```bash
cd $(gwq get muyami)
git fetch upstream --tags --prune
git merge --no-ff --no-edit -S <tag-name>

# コンフリクト解決後
git add -A && git commit -m "upstream: resolve conflicts for <tag-name>"
```

#### 2. テスト環境（nayami）への反映

```bash
cd $(gwq get nayami)
git merge muyami
pnpm build
git push origin nayami
```

#### 3. 本番環境（master）への反映

1. `DIFFERENCE.md` の Unreleased 項目に変更点を記載
2. `package.json` の version をインクリメント
3. GitHub で [Release Manager Dispatch](https://github.com/yamisskey-dev/yamisskey/actions/workflows/release-with-dispatch.yml) を実行
4. 自動生成された PR で `package.json` のバージョンを正しい yami 形式に修正
5. PR をマージすると、GitHub Release と Docker イメージが自動生成

## トラブルシューティング

### git worktree 関連の問題

```bash
# worktree の削除と再作成
gwq remove muyami          # 削除
gwq remove --force muyami  # 強制削除
gwq add muyami             # 再作成（ghq のリポジトリから）
gwq list                   # 状態確認

# worktree のクリーンアップ
git worktree prune
```

### マージ失敗時の対応

```bash
git merge --abort                        # マージ中断
git checkout backup/[現在のバージョン]  # バックアップから復帰
```

### ghq 関連の問題（閲覧用リポジトリ）

```bash
ghq root                                     # ルートディレクトリ確認
rm -rf $(ghq root)/github.com/yamisskey-dev/yamisskey  # リポジトリ削除
ghq get https://github.com/yamisskey-dev/yamisskey.git # 再取得
```

## ブランチ保護と開発ルール

### master ブランチの保護設定

- **ブランチ削除の禁止**：誤った削除を防止
- 本番環境の安定性と品質を確保

### 開発ルール

- muyami ブランチでの開発は必ずトピックブランチから行う
- nayami ブランチへのマージは十分なテスト後に行う
- 開発フロー：muyami（開発）→ nayami（テスト）→ master（本番）を徹底

## CI/CD と AI 活用

### GitHub Actions の役割

- コードの品質保証（リント、型チェック）
- 自動テスト実行によるバグの早期発見
- ビルドエラーの検出
- 本番環境への安全なデプロイ

### AI 活用

- **Claude Code**：Dev Container に事前設定済み、コード生成・レビュー・リファクタリングに活用
- **Pull Request レビュー**：Claude と Gemini による自動コードレビュー
- 生成されたコードは必ず人間によるレビューを実施
- セキュリティ・プライバシー関連機能では生成コードの適切性を必ず確認

## 注意事項

- 重要な変更前は必ずバックアップを作成
- プライバシー機能に関する変更は特に慎重にテスト
- パフォーマンスへの影響を必ず確認
- セキュリティ関連の修正は優先して取り込み
- 各ブランチの役割を尊重し、適切なフローで開発を進める
