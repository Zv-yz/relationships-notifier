const { getModule } = require('powercord/webpack');
const { getCurrentUser } = getModule(['getCurrentUser'], false);
const { sleep } = require('powercord/util');
const { post } = require('powercord/http');

module.exports.NotifyWebhook = async function(Webhook, Data) {
   if (!Webhook.includes('/api/webhooks/')) return
   await post(Webhook)
   .set('User-Agent', navigator.userAgent)
   .set('Content-Type', 'application/json')
   .send(Data)
   .catch(async (err) => {
      switch (err.statusCode) {
         case 404:
            console.warn('[RN-WARNING] 401 - Probably webhook deleted');
            break;
         case 429:
            console.warn(`[RN-WARNING] 429 - Ratelimited, waiting for ${err.body.retry_after} seconds`);
            await sleep(err.body.retry_after);
            break;
         case 401:
            console.warn(`[RN-WARNING] 401 - Deleted? No permission? No token?`);
            break;
         default:
            console.warn(`[RN-WARNING] ${err.statusCode} - Unknown error`);
            break;
      }
   })
}
