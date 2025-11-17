# yamisskey 開発ガイド

![yamisskeyプロジェクトアイコン](https://github.com/yamisskey-dev/yamisskey-assets/blob/main/yamisskey/yamisskey_project.png?raw=true)

## 概要

このドキュメントは、yamisskey 開発チームメンバー向けの技術手順書です。

> [!NOTE]
> 開発への参加を希望される方は、まずプロジェクト管理者にご連絡ください。

[Misskey](https://github.com/misskey-dev/misskey) フォーク「[yamisskey](https://github.com/yamisskey-dev/yamisskey/)」の開発手順を説明します。基本的な開発手順は[フォーク元の開発ガイド](https://github.com/misskey-dev/misskey/blob/develop/CONTRIBUTING.md#development)を参照してください。

## ブランチとバージョン

yamisskey は 3ブランチで開発を進めます：

| ブランチ | 環境 | バージョン形式 | 用途 |
|---------|------|---------------|------|
| **muyami** | 開発（ローカル） | `2025.1.0-muyami-1.4.3` | 新機能開発・実験的機能 |
| **nayami** | テスト（[なやみすきー](https://na.yami.ski/)） | `2025.1.0-nayami-1.4.3` | 本番前検証（push時にDockerイメージ自動ビルド） |
| **master** | 本番（[やみすきー](https://yami.ski/)） | `2025.1.0-yami-1.4.3` | 安定運用版（リリース時にDockerイメージ自動ビルド） |

**開発の流れ**: muyami → nayami → master

## ディレクトリ構造

3つのブランチすべてを `~/.ghq/` 配下の並列型ディレクトリで管理します：

```
~/.ghq/github.com/yamisskey-dev/
├── yamisskey/        # master（本番）- メインworktree
├── yamisskey-nayami/ # nayami（テスト）- リンクされたworktree
└── yamisskey-muyami/ # muyami（開発）- リンクされたworktree
```

**ツールの役割**:
- **[ghq](https://github.com/x-motemen/ghq)**: リポジトリの初回クローン（`ghq get`で場所を自動決定）
- **[gwq](https://github.com/d-kuro/gwq)**: worktreeの追加・削除・切り替え

## セットアップ

### 1. ツールのインストール

```bash
# 必要環境: Node.js, pnpm, Git 2.15+, Go
go install github.com/x-motemen/ghq@latest
go install github.com/d-kuro/gwq/cmd/gwq@latest
```

**推奨**: VSCode 1.103+ (`git.detectWorktrees: true`), Docker, Dev Container

### 2. リポジトリとworktreeの構築

```bash
# リポジトリ取得（masterブランチ）
ghq get yamisskey-dev/yamisskey

# リモート設定
cd $(ghq root)/github.com/yamisskey-dev/yamisskey
git remote add upstream https://github.com/misskey-dev/misskey.git
git fetch --all --prune --tags

# 開発用worktreeを作成
gwq add nayami  # → ~/.ghq/github.com/yamisskey-dev/yamisskey-nayami/
gwq add muyami  # → ~/.ghq/github.com/yamisskey-dev/yamisskey-muyami/

# 確認
gwq list
```

### 3. 依存関係のインストール

```bash
# 各worktreeで初期化
cd $(ghq root)/github.com/yamisskey-dev/yamisskey
pnpm install && pnpm build && pnpm build-misskey-js-with-types

cd $(gwq get nayami)
pnpm install && pnpm build && pnpm build-misskey-js-with-types

cd $(gwq get muyami)
pnpm install && pnpm build && pnpm build-misskey-js-with-types
```

> **Tips**: pnpmはハードリンクで`node_modules`を共有するため、worktreeを複数作成しても容量はほぼ1つ分で済みます。

## 開発フロー

### 日常的な開発作業

```bash
# VSCodeで開発環境を開く
code $(gwq get muyami)
# Dev Container で「Dev Containerで再度開く」を選択

# トピックブランチを作成
git checkout -b feat/新機能名

# 開発・テスト・コミット
pnpm dev
git add .
git commit -m "feat: 新機能の実装"

# muyamiにマージしてプッシュ
git checkout muyami
git merge feat/新機能名
git push origin muyami
```

### テスト環境への反映

```bash
cd $(gwq get nayami)
git pull origin nayami
git merge muyami
# package.jsonのバージョン更新（muyami → nayami）
git push origin nayami  # Dockerイメージが自動ビルドされる
```

[なやみすきー](https://na.yami.ski/)で動作確認後、本番への反映を進めます。

### 本番環境への反映

```bash
cd $(ghq root)/github.com/yamisskey-dev/yamisskey
git pull origin master
git merge nayami
# package.jsonのバージョン更新（nayami → yami）
git push origin master
```

**リリース手順**:
1. `DIFFERENCE.md` の Unreleased 項目に変更点を記載
2. `package.json` の version をインクリメント
3. GitHub で [Release Manager Dispatch](https://github.com/yamisskey-dev/yamisskey/actions/workflows/release-with-dispatch.yml) を実行
4. 自動生成された PR で `package.json` のバージョンを yami 形式に修正
5. PR をマージすると GitHub Release と Docker イメージが自動生成

## VSCode/Dev Container の使い分け

```bash
# 日常開発
code $(gwq get muyami)

# テスト確認
code $(gwq get nayami)

# リリース作業
code $(ghq root)/github.com/yamisskey-dev/yamisskey

# 他のOSS参照
code $(ghq root)/github.com/misskey-dev/misskey
code $(ghq root)/github.com/kokonect-link/cherrypick
```

**Dev Container**: 各worktreeで独立した環境（データベースも分離）を起動可能。VSCodeの「ソース管理」→「Worktrees」からGUI操作も可能。

## 高度な使い方

### 並列開発（Claude Code等）

複数の機能を同時開発する場合、機能ごとにworktreeを作成します：

```bash
# ブランチとworktreeを作成
cd $(ghq root)/github.com/yamisskey-dev/yamisskey
git branch feat/feature-a origin/muyami
git branch feat/feature-b origin/muyami
gwq add feat/feature-a
gwq add feat/feature-b

# 各worktreeで初期化して開発
cd $(gwq get feat/feature-a) && pnpm install && pnpm build
cd $(gwq get feat/feature-b) && pnpm install && pnpm build
code $(gwq get feat/feature-a) &
code $(gwq get feat/feature-b) &

# 開発完了後、muyamiにマージして削除
cd $(gwq get muyami)
git merge feat/feature-a
git merge feat/feature-b
git push origin muyami
gwq remove feat/feature-a
gwq remove feat/feature-b
```

### 他フォークからcherry-pick

```bash
# 他フォークを参照
cd $(ghq root)/github.com/kokonect-link/cherrypick
git log --oneline -20

# yamisskey muyamiに移動
cd $(gwq get muyami)
git remote add cherrypick $(ghq root)/github.com/kokonect-link/cherrypick
git fetch cherrypick
git cherry-pick <コミットID>
```

### アップストリームからの変更取り込み

#### 1. バックアップ作成

```bash
# 各ブランチでバージョン名のバックアップを作成
cd $(gwq get muyami)
VERSION=$(node -p "require('./package.json').version")
git branch backup/$VERSION muyami

cd $(gwq get nayami)
VERSION=$(node -p "require('./package.json').version")
git branch backup/$VERSION nayami

cd $(ghq root)/github.com/yamisskey-dev/yamisskey
VERSION=$(node -p "require('./package.json').version")
git branch backup/$VERSION master
```

例: `backup/2025.1.0-muyami-1.4.3`

#### 2. マージ

```bash
# muyamiに取り込み
cd $(gwq get muyami)
git fetch upstream --tags --prune
git merge --no-ff --no-edit -S <tag-name>
# コンフリクト解決後
git add -A && git commit -m "upstream: resolve conflicts for <tag-name>"

# nayami → master へ順次反映
```

## トラブルシューティング

### worktreeの削除と再作成

```bash
gwq remove muyami          # 削除
gwq remove --force muyami  # 強制削除
gwq add muyami             # 再作成
cd $(ghq root)/github.com/yamisskey-dev/yamisskey
git worktree prune         # クリーンアップ
```

### マージ失敗時

```bash
# 中断
git merge --abort

# バックアップから復元
cd $(gwq get muyami)
git branch --list 'backup/*'
git reset --hard backup/2025.1.0-muyami-1.4.3
git push --force origin muyami  # 注意: チーム開発では確認を取ること
```

### メインリポジトリの再取得

```bash
rm -rf $(ghq root)/github.com/yamisskey-dev/yamisskey
ghq get yamisskey-dev/yamisskey
cd $(ghq root)/github.com/yamisskey-dev/yamisskey
gwq add nayami
gwq add muyami
```

### 権限エラー

```bash
sudo chown -R $(whoami) ~/.ghq/github.com/yamisskey-dev/
```

## 開発ルール

- muyami での開発は必ずトピックブランチから行う
- nayami へのマージは十分なテスト後に実施
- 開発フロー（muyami → nayami → master）を徹底
- 重要な変更前は必ずバックアップを作成
- プライバシー・セキュリティ機能は特に慎重にテスト

## CI/CD と AI 活用

### GitHub Actions

- コード品質保証（リント、型チェック）
- 自動テスト実行とビルドエラー検出
- 本番環境への安全なデプロイ

### AI 活用

- **Claude Code**: Dev Container に事前設定済み（コード生成・レビュー・リファクタリング）
- **PR レビュー**: Claude と Gemini による自動コードレビュー
- 生成コードは必ず人間がレビュー
- セキュリティ・プライバシー関連は適切性を必ず確認
