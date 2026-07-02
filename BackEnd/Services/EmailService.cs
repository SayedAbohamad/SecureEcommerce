using BackEnd.Models;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using System.Threading.Tasks;

namespace BackEnd.Services
{
    public class EmailService : IEmailService
    {
        private readonly EmailSettings _emailSettings;

        public EmailService(IOptions<EmailSettings> emailSettings)
        {
            _emailSettings = emailSettings.Value;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string message)
        {
            var email = new MimeMessage();
            email.From.Add(new MailboxAddress("Markety", _emailSettings.EmailUsername));
            email.To.Add(MailboxAddress.Parse(toEmail));
            email.Subject = subject;

            var builder = new BodyBuilder { HtmlBody = message };
            email.Body = builder.ToMessageBody();

            using var smtp = new SmtpClient();
            await smtp.ConnectAsync(_emailSettings.EmailHost, _emailSettings.EmailPort, SecureSocketOptions.StartTls);
            await smtp.AuthenticateAsync(_emailSettings.EmailUsername, _emailSettings.EmailPassword);
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
        }

        public async Task SendOtpEmailAsync(string toEmail, string otp)
        {
            var subject = $"Markety: {otp} is your verification code";
            var message = $@"
                <div style=""background-color: #f8f9fa; padding: 50px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;"">
                    <div style=""max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);"">
                        <div style=""background: linear-gradient(135deg, #5B3DC8 0%, #2D1B6B 100%); padding: 40px 20px; text-align: center;"">
                            <h1 style=""color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px;"">Markety</h1>
                        </div>
                        <div style=""padding: 40px 30px; text-align: center;"">
                            <h2 style=""color: #1a1a1a; margin-bottom: 10px; font-size: 22px;"">Security Verification</h2>
                            <p style=""color: #666666; font-size: 16px; line-height: 1.6;"">To complete your action, please use the following one-time password. This code is valid for <b>10 minutes</b>.</p>
                            
                            <div style=""margin: 35px 0; padding: 20px; background-color: #f4f1ff; border: 1px dashed #5B3DC8; border-radius: 12px;"">
                                <span style=""font-size: 36px; font-weight: 800; color: #5B3DC8; letter-spacing: 8px; font-family: monospace;"">{otp}</span>
                            </div>
                            
                            <p style=""color: #999999; font-size: 13px;"">If you did not request this code, please ignore this email or contact support if you're concerned about your account security.</p>
                        </div>
                        <div style=""padding: 20px; background-color: #fafafa; border-top: 1px solid #eeeeee; text-align: center;"">
                            <p style=""color: #bbbbbb; font-size: 12px; margin: 0;"">&copy; {DateTime.UtcNow.Year} Markety. All rights reserved.</p>
                        </div>
                    </div>
                </div>";

            await SendEmailAsync(toEmail, subject, message);
        }

        public async Task SendPasswordResetEmailAsync(string toEmail, string resetLink)
        {
            var subject = "Markety: Reset your password";
            var message = $@"
                <div style=""background-color: #f8f9fa; padding: 50px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;"">
                    <div style=""max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);"">
                        <div style=""background: linear-gradient(135deg, #5B3DC8 0%, #2D1B6B 100%); padding: 40px 20px; text-align: center;"">
                            <h1 style=""color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px;"">Markety</h1>
                        </div>
                        <div style=""padding: 40px 30px; text-align: center;"">
                            <h2 style=""color: #1a1a1a; margin-bottom: 10px; font-size: 22px;"">Reset Your Password</h2>
                            <p style=""color: #666666; font-size: 16px; line-height: 1.6;"">We received a request to reset your password. Click the button below to create a new password. This link is valid for <b>15 minutes</b>.</p>
                            
                            <div style=""margin: 35px 0;"">
                                <a href=""{resetLink}"" style=""background: linear-gradient(135deg, #5B3DC8 0%, #2D1B6B 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 15px rgba(91, 61, 200, 0.3);"">Reset Password</a>
                            </div>
                            
                            <p style=""color: #999999; font-size: 13px;"">If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
                            <p style=""color: #999999; font-size: 12px; margin-top: 20px;"">If the button doesn't work, copy and paste this link into your browser:<br><span style=""word-break: break-all; color: #5B3DC8;"">{resetLink}</span></p>
                        </div>
                        <div style=""padding: 20px; background-color: #fafafa; border-top: 1px solid #eeeeee; text-align: center;"">
                            <p style=""color: #bbbbbb; font-size: 12px; margin: 0;"">&copy; {DateTime.UtcNow.Year} Markety. All rights reserved.</p>
                        </div>
                    </div>
                </div>";

            await SendEmailAsync(toEmail, subject, message);
        }

        public async Task SendDeleteAccountOtpEmailAsync(string toEmail, string otp)
        {
            var subject = "Markety: We're sad to see you go - Delete Account Verification";
            var message = $@"
                <div style=""background-color: #f8f9fa; padding: 50px 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;"">
                    <div style=""max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05);"">
                        <div style=""background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); padding: 40px 20px; text-align: center;"">
                            <h1 style=""color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px;"">Markety</h1>
                        </div>
                        <div style=""padding: 40px 30px; text-align: center;"">
                            <h2 style=""color: #1a1a1a; margin-bottom: 10px; font-size: 22px;"">Account Deletion</h2>
                            <p style=""color: #666666; font-size: 16px; line-height: 1.6;"">We're really sad to see you go! 😔 If you're sure you want to delete your account, use the verification code below. We'll always welcome you back with open arms!</p>
                            
                            <div style=""margin: 35px 0; padding: 20px; background-color: #fdf2f0; border: 1px dashed #e74c3c; border-radius: 12px;"">
                                <span style=""font-size: 36px; font-weight: 800; color: #e74c3c; letter-spacing: 8px; font-family: monospace;"">{otp}</span>
                            </div>
                            
                            <p style=""color: #999999; font-size: 13px;"">If you changed your mind or didn't request this, just ignore this email. Your account is perfectly safe.</p>
                        </div>
                        <div style=""padding: 20px; background-color: #fafafa; border-top: 1px solid #eeeeee; text-align: center;"">
                            <p style=""color: #bbbbbb; font-size: 12px; margin: 0;"">&copy; {DateTime.UtcNow.Year} Markety. All rights reserved.</p>
                        </div>
                    </div>
                </div>";

            await SendEmailAsync(toEmail, subject, message);
        }
    }
}
