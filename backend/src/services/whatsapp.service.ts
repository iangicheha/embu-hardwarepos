import { logger } from "../config/logger";

const WHATSAPP_API_VERSION = "v21.0";

const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
const RECIPIENTS = (process.env.WHATSAPP_ALERT_RECIPIENTS ?? "")
  .split(",")
  .map((n) => n.trim())
  .filter(Boolean);

const isConfigured = Boolean(ACCESS_TOKEN && PHONE_NUMBER_ID && RECIPIENTS.length > 0);

class WhatsAppService {
  /**
   * Sends the approved `low_stock_alert` template to every configured
   * recipient. Business-initiated messages (i.e. us texting the owner,
   * not replying to them) MUST use a pre-approved Meta template — this
   * cannot send free-form text outside a live customer conversation.
   *
   * Never throws — a WhatsApp failure should never break order creation
   * or the in-app notification it's paired with. Errors are logged only.
   */
  async sendLowStockAlert(productName: string, quantity: number, reorderLevel: number) {
    if (!isConfigured) {
      logger.warn(
        "WhatsApp not configured (missing WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ALERT_RECIPIENTS) — skipping alert"
      );
      return;
    }

    const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

    const body = {
      messaging_product: "whatsapp",
      to: "", // set per-recipient below
      type: "template",
      template: {
        name: "low_stock_alert",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: productName },
              { type: "text", text: String(quantity) },
              { type: "text", text: String(reorderLevel) }
            ]
          }
        ]
      }
    };

    await Promise.allSettled(
      RECIPIENTS.map(async (to) => {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${ACCESS_TOKEN}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ ...body, to })
          });

          if (!res.ok) {
            const text = await res.text();
            logger.error(`WhatsApp low-stock alert failed for ${to}: ${res.status} ${text}`);
            return;
          }

          logger.info(`WhatsApp low-stock alert sent to ${to} for "${productName}"`);
        } catch (err) {
          logger.error(`WhatsApp low-stock alert threw for ${to}`, err as Error);
        }
      })
    );
  }
}

export default new WhatsAppService();