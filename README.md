# Razmail

> Temporaly email system based on Cloudflare email-route and worker system.

Special thanks to [Linux.DO](linux.do)

Prereqs:

* A Domain hosted on Cloudflare
* A Cloudflare account
* OpenSSL

---

### Deploy the Mail-API Worker

1. Generate the JWT HMAC Secret
   
   ```bash
   openssl rand -hex 128
   ```
   Copy the secret.

2. Deploy the worker to Cloudflare

   ### Deploy the API Worker

   [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/rand0mdevel0per/razmail&root_directory=apiworker)

   Remember to fill the `JWT_SECRET` and the `DOMAIN` variable in the VARIABLES.

   Give it a Custom-Domain: `mail.<yourdomain>` to make sure that the api-worker can work properly.

   ### Deploy the Mail-Route Worker

   [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/rand0mdevel0per/razmail&root_directory=mailworker)


3. Add the mail-route rule in your domain

   Click `Domain` -> `Overview` -> `<yourdomain>` -> `Mail` -> `Mail Routing` and add your domain in to it.
   
   ( It will require you to add a MX Record in your root domain which points to Cloudflare )
   
   Then add a email worker in your domain: `mailserv3`.
   
   Navigate to the `Overview` Page and edit the Catch-All rule, choose `Email Worker` and then choose `mailserv3`, save it and then enable it.
4. Test it
   
   Open your browser and navigate to `mail.<yourdomain>`, then follow the builtin API instructions to test it.
   
   e.g. https://mail.razkord.top

   Get Mail:
   ```bash
   curl -X POST https://mail.razkord.top/get-mail \
   -H "Content-Type: application/json" \
   -d '{"mail":"test"}'
   ```

   Read Mail:
   ```bash
   curl -X POST https://mail.razkord.top/read-mail \
   -H "Content-Type: application/json" \
   -d '{"key":"<YOUR_KEY>","mail":"test@razkord.top"}'
   ```
