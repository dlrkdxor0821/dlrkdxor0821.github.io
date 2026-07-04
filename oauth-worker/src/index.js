function renderCallbackBody(status, content) {
  return `<!DOCTYPE html><html><body><script>
    const receiveMessage = (message) => {
      window.opener.postMessage(
        'authorization:github:${status}:${JSON.stringify(content)}',
        message.origin
      );
      window.removeEventListener("message", receiveMessage, false);
    }
    window.addEventListener("message", receiveMessage, false);
    window.opener.postMessage("authorizing:github", "*");
  </script></body></html>`;
}

async function handleAuth(request, env) {
  const url = new URL(request.url);
  const redirectUrl = new URL("https://github.com/login/oauth/authorize");
  redirectUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  redirectUrl.searchParams.set("redirect_uri", `${url.origin}/callback`);
  redirectUrl.searchParams.set("scope", "repo user");
  redirectUrl.searchParams.set("state", crypto.randomUUID());
  return Response.redirect(redirectUrl.href, 302);
}

async function handleCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "user-agent": "decap-cms-oauth-worker",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const result = await tokenResponse.json();

  const body = result.error
    ? renderCallbackBody("error", result)
    : renderCallbackBody("success", { token: result.access_token, provider: "github" });

  return new Response(body, {
    status: result.error ? 401 : 200,
    headers: { "content-type": "text/html;charset=UTF-8" },
  });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === "/auth") return handleAuth(request, env);
      if (pathname === "/callback") return handleCallback(request, env);
      return new Response("Not found", { status: 404 });
    } catch (error) {
      return new Response(error.message, { status: 500 });
    }
  },
};
