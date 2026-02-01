export const getVerificationEmailHtml = (code: string) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #c3d9c3; border-radius: 8px; background: #f8fdf8;">
      <h2 style="color: #2d5a2d; text-align: center;">Verify Your Organization</h2>
      <p style="color: #4a6b4a; font-size: 16px;">Hello,</p>
      <p style="color: #4a6b4a; font-size: 16px;">Use the code below to verify your email address for Verch. This code will expire in 10 minutes.</p>
      
      <div style="background: linear-gradient(135deg, #e8f5e8 0%, #fff9e6 100%); padding: 24px; text-align: center; margin: 30px 0; border-radius: 6px; border: 2px solid #d4e8d4;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2d5a2d; font-family: monospace;">
          ${code}
        </span>
      </div>

      <p style="color: #7a9b7a; font-size: 14px; text-align: center;">
        If you didn't request this code, you can safely ignore this email.
      </p>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #d4e8d4; text-align: center; font-size: 12px; color: #8fae8f;">
        © ${new Date().getFullYear()} Verch Inc. All rights reserved.
      </div>
    </div>
  `;
};

export const getOrderConfirmationHtml = (orderId: string, total: number) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #c3d9c3; border-radius: 8px; background: #f8fdf8;">
      <h2 style="color: #2d5a2d; text-align: center;">Order Confirmed! 🎉</h2>
      <p style="color: #4a6b4a; font-size: 16px;">Your order has been successfully placed.</p>
      
      <div style="background: linear-gradient(135deg, #e8f5e8 0%, #fff9e6 100%); padding: 20px; border-radius: 6px; margin: 20px 0; border: 2px solid #d4e8d4;">
        <p style="color: #2d5a2d; font-size: 14px; margin: 5px 0;"><strong>Order Number:</strong> #${orderId}</p>
        <p style="color: #2d5a2d; font-size: 18px; margin: 5px 0;"><strong>Total:</strong> $${total.toFixed(
          2
        )}</p>
      </div>
      
      <p style="color: #4a6b4a; font-size: 14px;">We'll send you another email once your order has been shipped.</p>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #d4e8d4; text-align: center; font-size: 12px; color: #8fae8f;">
        © ${new Date().getFullYear()} Verch Inc. All rights reserved.
      </div>
    </div>
  `;
};
