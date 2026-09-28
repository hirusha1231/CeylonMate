using System;

namespace CeylonMate.Api.Models
{
    public class CapacityNotification
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public int BookingId { get; set; }
        public Guid VehicleSlotId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public bool IsRead { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
