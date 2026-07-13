import nodemailer from "nodemailer";
import { env, isEmailConfigured } from "../config/env";
import { logger } from "../config/logger";

class EmailService {
  private getTransporter() {
    if (!isEmailConfigured()) {
      return null;
    }

    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: false,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });
  }

  async sendEmail(to: string, subject: string, html: string) {
    const transporter = this.getTransporter();

    if (!transporter) {
      logger.warn("Email not configured — skipping send");
      return null;
    }

    return transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html
    });
  }
}

export default new EmailService();
