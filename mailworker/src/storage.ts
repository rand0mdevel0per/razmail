export class MailStorage {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const mail = url.searchParams.get('mail');

    if (request.method === 'GET' && mail) {
      // 读取邮件
      const data = await this.state.storage.get<string>(`mail:${mail}`);
      return new Response(data || JSON.stringify({ status: 'empty' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (request.method === 'POST') {
      // 存储邮件
      const emailData = await request.json();
      const key = `mail:${emailData.to}`;
      await this.state.storage.put(key, JSON.stringify(emailData));

      // 设置 24 小时后删除
      const deleteTime = Date.now() + 86400000;
      await this.state.storage.setAlarm(deleteTime);

      return new Response('OK');
    }

    return new Response('Not Found', { status: 404 });
  }

  async alarm() {
    // 清理过期邮件
    const now = Date.now();
    const entries = await this.state.storage.list();
    for (const [key, value] of entries) {
      const data = JSON.parse(value as string);
      if (data.receivedAt && now - data.receivedAt > 86400000) {
        await this.state.storage.delete(key);
      }
    }
  }
}
