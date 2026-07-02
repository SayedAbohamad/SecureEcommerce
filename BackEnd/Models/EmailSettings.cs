namespace BackEnd.Models
{
    public class EmailSettings
    {
        public string EmailHost { get; set; }
        public int EmailPort { get; set; }
        public string EmailUsername { get; set; }
        public string EmailPassword { get; set; }
        public string FromName { get; set; }
    }
}
