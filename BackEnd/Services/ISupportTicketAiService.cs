using BackEnd.DTO.Support;
using BackEnd.Models;

namespace BackEnd.Services;

public interface ISupportTicketAiService
{
    Task<SupportTicketSummaryDto> SummarizeAsync(SupportTicket ticket, CancellationToken cancellationToken);
    Task<SupportTicketReplyDraftDto> SuggestReplyAsync(SupportTicket ticket, string? additionalContext, CancellationToken cancellationToken);
    Task<SupportTicketClassificationDto> ClassifyAsync(SupportTicket ticket, CancellationToken cancellationToken);
}
