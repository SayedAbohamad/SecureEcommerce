using System;
using System.Collections.Generic;

namespace BackEnd.DTO.Honeypot
{
    public class HoneypotEventDto
    {
        public Guid Id { get; set; }
        public string IpAddress { get; set; } = string.Empty;
        public string? UserAgent { get; set; }
        public string Path { get; set; } = string.Empty;
        public string Method { get; set; } = string.Empty;
        public string? QueryString { get; set; }
        public string? Body { get; set; }
        public string? Referrer { get; set; }
        public string? Country { get; set; }
        public string TrapType { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class HoneypotEventQueryDto
    {
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 20;
        public string? Path { get; set; }
        public string? IpAddress { get; set; }
        public string? UserAgent { get; set; }
        public DateTime? From { get; set; }
        public DateTime? To { get; set; }
    }

    public class PagedResultDto<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    public class HoneypotTopEntryDto
    {
        public string Key { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class HoneypotSummaryDto
    {
        public int TotalHits { get; set; }
        public int HitsToday { get; set; }
        public int UniqueIps { get; set; }
        public string? MostTargetedPath { get; set; }
        public DateTime? LatestAttackAt { get; set; }
        public List<HoneypotTopEntryDto> TopPaths { get; set; } = new();
        public List<HoneypotTopEntryDto> TopIps { get; set; } = new();
        public List<HoneypotTopEntryDto> HitsByDay { get; set; } = new();
        public List<string> RecentUserAgents { get; set; } = new();
        public List<string> RecentPayloads { get; set; } = new();
    }
}
