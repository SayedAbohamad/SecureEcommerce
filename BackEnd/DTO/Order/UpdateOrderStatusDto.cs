using BackEnd.Models;
using System.Text.Json.Serialization;

namespace BackEnd.DTO.Order
{
    public class UpdateOrderStatusDto
    {
        [JsonPropertyName("status")]
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public OrderStatus Status { get; set; }
    }
}

