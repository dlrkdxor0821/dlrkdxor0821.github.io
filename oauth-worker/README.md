# decap-cms-oauth-worker

`/admin`(Decap CMS)의 GitHub 로그인용 OAuth 토큰 교환 프록시. Cloudflare Worker라 상시 가동 서버가 아니라
요청 시에만 실행되고, 개인 블로그 트래픽으로는 무료 티어 안에서 충분하다.

## 배포

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   - Homepage URL: `https://dlrkdxor0821.github.io`
   - Authorization callback URL: `https://<이 worker의 배포 주소>/callback` (예: `https://decap-cms-oauth-worker.<subdomain>.workers.dev/callback`)
   - 등록 후 Client ID, Client Secret 확보
2. `wrangler.toml`의 `GITHUB_CLIENT_ID` 값을 위에서 받은 Client ID로 교체
3. ```bash
   npm install -g wrangler   # 이미 있으면 생략
   cd oauth-worker
   wrangler deploy
   wrangler secret put GITHUB_CLIENT_SECRET   # 프롬프트에 Client Secret 입력
   ```
4. 배포 후 나오는 `*.workers.dev` 주소를 `site/public/admin/config.yml`의 `backend.base_url`에 반영하고,
   1번의 callback URL도 실제 주소로 맞춰서 GitHub OAuth App 설정을 업데이트한다.
