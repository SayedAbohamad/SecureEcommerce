using System.Threading;
using System.Threading.Tasks;

namespace BackEnd.Services
{
    public interface IRecaptchaService
    {
        Task<bool> ValidateTokenAsync(string? token, string expectedAction, decimal minimumScore = 0.5m, CancellationToken cancellationToken = default);
    }
}
