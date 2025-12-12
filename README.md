# SCBT Local App (Expo)

このフォルダは Expo を用いた React Native アプリの最小ひな形です。

## セットアップ

1. 依存関係をインストール

```bash
npx --yes expo install expo expo-status-bar react react-native
npm i -D typescript @types/react @types/react-native
```

2. 開発サーバーを起動

```bash
npm run start
```

ターミナル上で `i` (iOS), `a` (Android), `w` (Web) を押して各プラットフォームで起動できます。

## 構成

- `App.tsx` アプリのエントリーポイント（最小画面）
- `app.json` Expo 設定（名前・プラットフォーム等）
- `babel.config.js` Babel 設定（Expo プリセット）
- `tsconfig.json` TypeScript 設定（Expo 基準を継承）


