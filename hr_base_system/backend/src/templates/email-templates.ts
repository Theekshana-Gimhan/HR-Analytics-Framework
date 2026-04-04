/**
 * Email template for password reset
 */
export const passwordResetTemplate = (resetUrl: string, userName: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #1976d2; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Reset Your Password</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
                Hi <strong>${userName}</strong>,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 30px;">
                You requested to reset your Simpala HR password. Click the button below to create a new password:
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" 
                       style="display: inline-block; background-color: #1976d2; color: #ffffff; 
                              padding: 14px 40px; text-decoration: none; border-radius: 4px; 
                              font-size: 16px; font-weight: bold;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 22px; margin: 30px 0 0;">
                <strong>Note:</strong> This link will expire in 1 hour for security reasons.
              </p>
              <p style="color: #666666; font-size: 14px; line-height: 22px; margin: 10px 0 0;">
                If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Simpala HR. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Email template for leave request submission confirmation
 */
export const leaveRequestSubmittedTemplate = (
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  days: number
): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Leave Request Submitted</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #4CAF50; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Leave Request Submitted</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
                Hi <strong>${employeeName}</strong>,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 30px;">
                Your leave request has been submitted successfully and is now pending approval.
              </p>
              
              <!-- Leave Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px; border: 1px solid #eeeeee;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #666666;">Type:</strong>
                          <span style="color: #333333; margin-left: 10px;">${leaveType}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #666666;">From:</strong>
                          <span style="color: #333333; margin-left: 10px;">${startDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #666666;">To:</strong>
                          <span style="color: #333333; margin-left: 10px;">${endDate}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #666666;">Duration:</strong>
                          <span style="color: #333333; margin-left: 10px;">${days} day(s)</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <strong style="color: #666666;">Status:</strong>
                          <span style="background-color: #FFA726; color: #ffffff; padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-left: 10px;">Pending</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 22px; margin: 30px 0 0;">
                You will receive a notification once your leave request is reviewed by your manager.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Simpala HR. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Email template for leave approval notification
 */
export const leaveApprovedTemplate = (
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string
): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Leave Request Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #4CAF50; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✓ Leave Request Approved</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
                Hi <strong>${employeeName}</strong>,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 30px;">
                Good news! Your <strong>${leaveType}</strong> request has been <span style="color: #4CAF50; font-weight: bold;">approved</span>.
              </p>
              
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9f9f9; border-radius: 4px; border: 1px solid #eeeeee;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; color: #666666;"><strong>Leave Period:</strong></p>
                    <p style="margin: 10px 0 0; color: #333333; font-size: 18px;">
                      ${startDate} to ${endDate}
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 22px; margin: 30px 0 0;">
                Enjoy your time off!
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Simpala HR. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Email template for leave rejection notification
 */
export const leaveRejectedTemplate = (
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  reason?: string
): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Leave Request Not Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #f44336; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Leave Request Not Approved</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
                Hi <strong>${employeeName}</strong>,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 30px;">
                Your <strong>${leaveType}</strong> request for <strong>${startDate} to ${endDate}</strong> has not been approved.
              </p>
              
              ${reason ? `
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; color: #666666; font-size: 14px;"><strong>Reason:</strong></p>
                    <p style="margin: 10px 0 0; color: #333333;">${reason}</p>
                  </td>
                </tr>
              </table>
              ` : ''}
              
              <p style="color: #666666; font-size: 14px; line-height: 22px; margin: 30px 0 0;">
                If you have any questions, please contact your manager.
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Simpala HR. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Email template for document expiry warning
 */
export const documentExpiringTemplate = (
  employeeName: string,
  documentName: string,
  expiryDate: string
): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Expiring Soon</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #FF9800; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚠️ Document Expiring Soon</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
                Hi <strong>${employeeName}</strong>,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 30px;">
                This is a reminder that your <strong>${documentName}</strong> is expiring on <strong>${expiryDate}</strong>.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fff3e0; border-radius: 4px; border-left: 4px solid #FF9800;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; color: #666666; font-size: 14px;"><strong>Action Required:</strong></p>
                    <p style="margin: 10px 0 0; color: #333333;">
                      Please renew this document and upload the new version to your profile as soon as possible.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 22px; margin: 30px 0 0;">
                If you have already renewed it, please ignore this message.
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Simpala HR. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Email template for document expired notification
 */
export const documentExpiredTemplate = (
  employeeName: string,
  documentName: string,
  expiryDate: string
): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document Expired</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #D32F2F; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⛔ Document Expired</h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px;">
                Hi <strong>${employeeName}</strong>,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 30px;">
                Your <strong>${documentName}</strong> has expired on <strong>${expiryDate}</strong>.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffebee; border-radius: 4px; border-left: 4px solid #D32F2F;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; color: #666666; font-size: 14px;"><strong>Urgent:</strong></p>
                    <p style="margin: 10px 0 0; color: #333333;">
                      This document is no longer valid. Please upload a renewed version immediately to avoid compliance issues.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 22px; margin: 30px 0 0;">
                If you have any questions, please contact your manager.
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Simpala HR. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
