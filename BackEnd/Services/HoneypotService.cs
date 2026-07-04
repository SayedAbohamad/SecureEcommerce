using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BackEnd.DTO.Honeypot;
using BackEnd.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace BackEnd.Services
{
    public sealed class HoneypotService : IHoneypotService
    {
        private static readonly HashSet<string> SensitiveHeaderNames = new(StringComparer.OrdinalIgnoreCase)
        {
            "Authorization", "Cookie", "Proxy-Authorization", "X-Api-Key"
        };

        private readonly ApplicationDbContext _context;
        private readonly ILogger<HoneypotService> _logger;

        public HoneypotService(ApplicationDbContext context, ILogger<HoneypotService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task RecordHitAsync(HttpContext context, string trapType, CancellationToken cancellationToken)
        {
            var body = string.Empty;
            try
            {
                var request = context.Request;
                if (request.ContentLength is > 0 and < 20_000 &&
                    (request.Method == HttpMethods.Post || request.Method == HttpMethods.Put || request.Method == HttpMethods.Patch))
                {
                    request.EnableBuffering();
                    using var reader = new StreamReader(request.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, bufferSize: 4096, leaveOpen: true);
                    body = await reader.ReadToEndAsync();
                    request.Body.Position = 0;
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Honeypot: could not read request body, continuing without it.");
            }

            var headers = context.Request.Headers
                .Where(h => !SensitiveHeaderNames.Contains(h.Key))
                .ToDictionary(h => h.Key, h => h.Value.ToString());

            var evt = new HoneypotEvent
            {
                IpAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                UserAgent = Truncate(context.Request.Headers.UserAgent.ToString(), 500),
                Path = Truncate(context.Request.Path.Value ?? string.Empty, 300),
                Method = context.Request.Method,
                QueryString = Truncate(context.Request.QueryString.Value ?? string.Empty, 1000),
                Body = Truncate(body, 2000),
                HeadersJson = SafeSerialize(headers),
                Referrer = Truncate(context.Request.Headers.Referer.ToString(), 500),
                TrapType = trapType,
                CreatedAt = DateTime.UtcNow
            };

            _context.HoneypotEvents.Add(evt);

            try
            {
                await _context.SaveChangesAsync(cancellationToken);
                _logger.LogWarning(
                    "Honeypot hit recorded: {Method} {Path} from {Ip} (trap={TrapType})",
                    evt.Method, evt.Path, evt.IpAddress, evt.TrapType);
            }
            catch (Exception ex)
            {
                // Never let honeypot logging break the fake response served to the attacker.
                _logger.LogError(ex, "Failed to persist honeypot event for {Path}", evt.Path);
            }
        }

        public async Task<PagedResultDto<HoneypotEventDto>> GetEventsAsync(HoneypotEventQueryDto query, CancellationToken cancellationToken)
        {
            var page = Math.Max(1, query.Page);
            var pageSize = Math.Clamp(query.PageSize, 1, 100);

            var events = _context.HoneypotEvents.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(query.Path))
                events = events.Where(e => e.Path.Contains(query.Path));

            if (!string.IsNullOrWhiteSpace(query.IpAddress))
                events = events.Where(e => e.IpAddress.Contains(query.IpAddress));

            if (!string.IsNullOrWhiteSpace(query.UserAgent))
                events = events.Where(e => e.UserAgent != null && e.UserAgent.Contains(query.UserAgent));

            if (query.From.HasValue)
                events = events.Where(e => e.CreatedAt >= query.From.Value);

            if (query.To.HasValue)
                events = events.Where(e => e.CreatedAt <= query.To.Value);

            var totalCount = await events.CountAsync(cancellationToken);

            var items = await events
                .OrderByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new HoneypotEventDto
                {
                    Id = e.Id,
                    IpAddress = e.IpAddress,
                    UserAgent = e.UserAgent,
                    Path = e.Path,
                    Method = e.Method,
                    QueryString = e.QueryString,
                    Body = e.Body,
                    Referrer = e.Referrer,
                    Country = e.Country,
                    TrapType = e.TrapType,
                    CreatedAt = e.CreatedAt
                })
                .ToListAsync(cancellationToken);

            return new PagedResultDto<HoneypotEventDto>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<HoneypotSummaryDto> GetSummaryAsync(CancellationToken cancellationToken)
        {
            var todayStart = DateTime.UtcNow.Date;
            var since14Days = DateTime.UtcNow.AddDays(-14).Date;

            var totalHits = await _context.HoneypotEvents.CountAsync(cancellationToken);
            var hitsToday = await _context.HoneypotEvents.CountAsync(e => e.CreatedAt >= todayStart, cancellationToken);
            var uniqueIps = await _context.HoneypotEvents.Select(e => e.IpAddress).Distinct().CountAsync(cancellationToken);
            var latestAttackAt = await _context.HoneypotEvents
                .OrderByDescending(e => e.CreatedAt)
                .Select(e => (DateTime?)e.CreatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            var topPaths = await _context.HoneypotEvents
                .GroupBy(e => e.Path)
                .Select(g => new HoneypotTopEntryDto { Key = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(10)
                .ToListAsync(cancellationToken);

            var topIps = await _context.HoneypotEvents
                .GroupBy(e => e.IpAddress)
                .Select(g => new HoneypotTopEntryDto { Key = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .Take(10)
                .ToListAsync(cancellationToken);

            var byDayRaw = await _context.HoneypotEvents
                .Where(e => e.CreatedAt >= since14Days)
                .ToListAsync(cancellationToken);
            var hitsByDay = byDayRaw
                .GroupBy(e => e.CreatedAt.Date)
                .OrderBy(g => g.Key)
                .Select(g => new HoneypotTopEntryDto { Key = g.Key.ToString("yyyy-MM-dd"), Count = g.Count() })
                .ToList();

            var recentUserAgents = await _context.HoneypotEvents
                .Where(e => e.UserAgent != null && e.UserAgent != "")
                .OrderByDescending(e => e.CreatedAt)
                .Select(e => e.UserAgent!)
                .Distinct()
                .Take(10)
                .ToListAsync(cancellationToken);

            var recentPayloads = await _context.HoneypotEvents
                .Where(e => e.Body != null && e.Body != "")
                .OrderByDescending(e => e.CreatedAt)
                .Select(e => e.Body!)
                .Take(10)
                .ToListAsync(cancellationToken);

            return new HoneypotSummaryDto
            {
                TotalHits = totalHits,
                HitsToday = hitsToday,
                UniqueIps = uniqueIps,
                MostTargetedPath = topPaths.FirstOrDefault()?.Key,
                LatestAttackAt = latestAttackAt,
                TopPaths = topPaths,
                TopIps = topIps,
                HitsByDay = hitsByDay,
                RecentUserAgents = recentUserAgents,
                RecentPayloads = recentPayloads
            };
        }

        private static string Truncate(string? value, int maxLength)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            return value.Length <= maxLength ? value : value[..maxLength];
        }

        private static string? SafeSerialize(Dictionary<string, string> headers)
        {
            try
            {
                return JsonSerializer.Serialize(headers);
            }
            catch
            {
                return null;
            }
        }
    }
}
