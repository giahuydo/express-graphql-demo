const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('❌ SMTP configuration error:', error);
      } else {
        console.log('✅ SMTP server is ready to take our messages');
      }
    });
  }

  /**
   * Send voucher issued email
   */
  async sendVoucherEmail(voucherData) {
    const { email, name, voucherCode, eventName, eventDescription } = voucherData;
    
    const mailOptions = {
      from: process.env.EMAIL_USER,    
      to: email,
      subject: '🎫 Your Voucher is Ready!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">🎫 Voucher Issued!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">You have received a new voucher</p>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Hello ${name}!</h2>
            <p style="color: #666; line-height: 1.6;">
              Congratulations! You have been issued a voucher for the following event:
            </p>
            
            <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">${eventName}</h3>
              <p style="color: #666; margin: 10px 0;">${eventDescription || 'No description available'}</p>
              
              <div style="background: #e9ecef; padding: 15px; border-radius: 5px; text-align: center; margin: 15px 0;">
                <strong style="color: #333; font-size: 18px;">Voucher Code:</strong>
                <div style="font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; color: #28a745; margin: 10px 0; letter-spacing: 2px;">
                  ${voucherCode}
                </div>
              </div>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>⚠️ Important:</strong> Please keep this voucher code safe. You will need it to redeem your voucher.
              </p>
            </div>
          </div>
          
          <div style="background: #e9ecef; padding: 20px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
            <p style="margin: 5px 0 0 0;">© 2024 Express GraphQL Demo. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Voucher email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send voucher email:', error);
      throw error;
    }
  }


  /**
   * Send notification email
   */
  async sendNotificationEmail(notificationData) {
    const { email, name, subject, message, type = 'info' } = notificationData;
    
    const colors = {
      info: '#17a2b8',
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545'
    };
    
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Express GraphQL Demo'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: `${icons[type]} ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, ${colors[type]} 0%, ${colors[type]}dd 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">${icons[type]} ${subject}</h1>
          </div>
          
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-top: 0;">Hello ${name}!</h2>
            <div style="background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <p style="color: #666; line-height: 1.6; margin: 0;">${message}</p>
            </div>
          </div>
          
          <div style="background: #e9ecef; padding: 20px; text-align: center; color: #666; font-size: 14px;">
            <p style="margin: 0;">This is an automated message. Please do not reply to this email.</p>
            <p style="margin: 5px 0 0 0;">© 2024 Express GraphQL Demo. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Notification email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('❌ Failed to send notification email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
