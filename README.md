# Flashami Money

イベントや旅行の支出を、参加者と運営者で記録・確認する Expo Router アプリです。iOS、Android、Web の共通コードベースで動作します。

## ローカル開発

Node.js 22 を使用します。

```bash
npm ci
cp .env.example .env.local
npm run web
```

`.env.local` に次の公開用 Supabase 値を設定します。

```dotenv
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`EXPO_PUBLIC_` が付く値は Web bundle に含まれます。`service_role` key や database password は絶対に設定しないでください。

## 検証

```bash
npm run validate
```

型チェック、lint、format check、Expo Web static export をまとめて実行します。

## リリース構成

- `develop`: 次のリリースを統合するブランチ
- `main`: 本番ブランチ。更新されると Supabase と Web を自動デプロイ
- Web: EAS Hosting の production deployment（<https://flashami-money.expo.app>）
- Database: Supabase migration を timestamp 順に適用
- iOS / Android: GitHub Actions の `Build mobile` を手動実行（現時点では自動配信しない）

`main` への本番 workflow は次の順で動きます。

1. `npm run validate`
2. `supabase db push --linked`
3. `eas deploy --prod --environment production --non-interactive`

Database deployment が失敗した場合、Web deployment は開始されません。同時に複数の本番 deployment が走らないよう concurrency も設定しています。

## 初回 CI/CD セットアップ

GitHub の `production` environment を作り、deployment branch を `main` のみに制限します。次の値を登録してください。

Repository secret:

- `EXPO_TOKEN`: Expo account の access token。Web と将来の mobile build で使用

`production` environment secrets:

- `SUPABASE_ACCESS_TOKEN`: Supabase personal access token
- `SUPABASE_DB_PASSWORD`: production database password

`production` environment variable:

- `SUPABASE_PROJECT_ID`: production project reference

EAS production environment には、ローカル値を表示せず次のコマンドで Web/mobile 共通の公開用変数を登録できます。

```bash
npx --yes eas-cli@21.0.2 env:push production --path .env.local --force
```

Supabase Auth の URL Configuration では、Site URL を `https://flashami-money.expo.app`、Redirect URL を `https://flashami-money.expo.app/auth/callback` に設定します。ローカル開発用 URL と将来の native deep link `flashamimoneyapp://auth/callback` も必要に応じて Redirect URL に残します。

## 手動リリース

Web:

```bash
npm run validate
npx --yes eas-cli@21.0.2 deploy --prod --environment production
```

Supabase:

```bash
npx --yes supabase@2.109.1 migration list --linked
npx --yes supabase@2.109.1 db push --linked --dry-run
npx --yes supabase@2.109.1 db push --linked
```

remote migration history にだけ存在する version がある場合は、削除や `migration repair` を先に行わず、その migration file を Git へ戻して履歴を一致させます。

## iOS / Android の準備

`eas.json` には次の profile を用意しています。

- `preview`: 内部配布用。Android は APK
- `production`: store 配布用。build number/version code は EAS で自動更新

GitHub Actions の `Build mobile` から platform と profile を選択できます。store 提出を有効にする前に、Apple Developer / App Store Connect と Google Play Console の契約、署名情報、store listing、privacy 情報を準備してください。

CLI から実行する場合:

```bash
npx --yes eas-cli@21.0.2 build --platform all --profile preview
npx --yes eas-cli@21.0.2 build --platform all --profile production --auto-submit
```

bundle identifier / package name は `com.kipeo22.flashamimoneyapp` です。store 登録後は変更できないため、初回 production build の前に最終確認してください。
