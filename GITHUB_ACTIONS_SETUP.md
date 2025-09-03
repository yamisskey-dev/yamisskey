# GitHub Actions 権限設定手順

Yamisskeyの自動リリースワークフローを有効にするために、GitHub App を使用する方法を推奨します。

## 推奨設定：GitHub App を使用 (技術的に最適)

### 1. GitHub App 作成

1. **yamisskey-dev Organization設定**に移動
2. **Settings** → **Developer settings** → **GitHub Apps** → **New GitHub App**
3. 以下の権限を設定：
   - Repository permissions:
     - Contents: Read and write
     - Issues: Write
     - Pull requests: Write
     - Metadata: Read

### 2. Secrets 設定

リポジトリの **Settings** → **Secrets and variables** → **Actions** で以下を追加：

```
RELEASE_APP_ID: [GitHub AppのID]
RELEASE_APP_PRIVATE_KEY: [GitHub Appの秘密鍵PEM形式]
```

### 3. 動作確認

nayamiブランチでワークフロー手動実行してPR作成を確認

## 代替案：標準権限設定

GitHub App設定が困難な場合のみ使用：

### 1. Actions 権限設定

1. **GitHubリポジトリページ**に移動
2. **Settings** タブをクリック
3. 左サイドバーの **Actions** → **General** をクリック
4. **"Workflow permissions"** セクションを見つける
5. 以下の設定を適用：
   - ✅ **"Read and write permissions"** を選択
   - ✅ **"Allow GitHub Actions to create and approve pull requests"** をチェック
6. **Save** をクリック

## リリースフロー

設定完了後のYamisskeyリリースフロー：

1. **nayamiブランチ**: 
   - 自動でPR作成（`Release: 2025.7.0-yami-x.x.x`）
   - package.jsonの手動バージョン変更が必要

2. **masterブランチ**: 
   - PR マージ時に自動リリース作成
   - DIFFERENCE.mdからリリースノート生成

## トラブルシューティング

### 権限エラーが続く場合

```
GraphQL: GitHub Actions is not permitted to create or approve pull requests
```

上記エラーが出る場合：
1. 組織設定で Actions 権限が制限されていないか確認
2. リポジトリが Fork の場合、元リポジトリの設定も確認
3. Personal Access Token の使用を検討

### 代替案: Personal Access Token

1. GitHub Settings → Developer settings → Personal access tokens
2. `repo` 権限でトークン生成
3. リポジトリ Settings → Secrets → `PAT_TOKEN` として追加
4. ワークフローの `GITHUB_TOKEN` を `PAT_TOKEN` に変更

## 設定完了の確認

✅ Actions → General → "Read and write permissions"  
✅ Actions → General → "Allow GitHub Actions to create and approve pull requests"  
✅ ワークフロー手動実行でPR作成成功  

設定完了後、nayamiブランチから手動でリリースワークフローを実行してください。