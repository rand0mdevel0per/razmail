interface Env {
  MAIL_STORAGE: DurableObjectNamespace;
}

export { MailStorage } from './storage';

export default {
  async email(message: any, env: Env, ctx: ExecutionContext) {
    const to = message.to;
    const rawContent = await new Response(message.raw).text();

    const headers: Record<string, string> = {};
    for (const [key, value] of message.headers) {
      headers[key] = value;
    }

    const emailData = {
      from: message.from,
      to: to,
      headers: headers,
      raw: rawContent,
      receivedAt: Date.now()
    };

    // 使用 Durable Object 存储
    const id = env.MAIL_STORAGE.idFromName(to);
    const stub = env.MAIL_STORAGE.get(id);
    await stub.fetch('https://fake-host/', {
      method: 'POST',
      body: JSON.stringify(emailData)
    });
  }
};
