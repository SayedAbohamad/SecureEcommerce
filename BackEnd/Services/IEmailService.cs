using System.Threading.Tasks;

namespace BackEnd.Services
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string message);
        Task SendOtpEmailAsync(string toEmail, string otp);
        Task SendPasswordResetEmailAsync(string toEmail, string resetLink);
        Task SendDeleteAccountOtpEmailAsync(string toEmail, string otp);
    }
}
