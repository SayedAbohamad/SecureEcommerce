import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supportApi, SupportTicket, SupportTicketClassification, SupportTicketSummary } from '../../../api';
import { LoadingOverlay } from '../../../components/common/LoadingOverlay';
import { showToast } from '../../../utils/toast';
import classNames from 'classnames';

export const SupportInboxPage = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [aiSummary, setAiSummary] = useState<SupportTicketSummary | null>(null);
  const [aiClassification, setAiClassification] = useState<SupportTicketClassification | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const { data: tickets, isLoading, isError } = useQuery<SupportTicket[]>({
    queryKey: ['support-tickets', statusFilter],
    queryFn: () => supportApi.getAll(statusFilter || undefined),
  });

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setIsReplying(true);
    try {
      await supportApi.reply(selectedTicket.id, replyText);
      showToast.success('Reply sent successfully!');
      setReplyText('');
      setSelectedTicket((prev: SupportTicket | null) => prev ? { ...prev, status: 'Replied', adminReply: replyText } : null);
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    } catch (error) {
      console.error(error);
      showToast.error('Failed to send reply.');
    } finally {
      setIsReplying(false);
    }
  };

  const handleCloseTicket = async (id: string) => {
    try {
      await supportApi.close(id);
      showToast.success('Ticket closed.');
      if (selectedTicket?.id === id) {
        setSelectedTicket((prev: SupportTicket | null) => prev ? { ...prev, status: 'Closed' } : null);
      }
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
    } catch (error) {
      console.error(error);
      showToast.error('Failed to close ticket.');
    }
  };

  const selectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReplyText('');
    setAiSummary(null);
    setAiClassification(null);
  };

  const handleAiAction = async (action: 'summary' | 'reply' | 'classify') => {
    if (!selectedTicket) return;

    setAiLoading(action);
    try {
      if (action === 'summary') {
        const summary = await supportApi.summarize(selectedTicket.id);
        setAiSummary(summary);
        showToast.success('Ticket summarized.');
      } else if (action === 'reply') {
        const draft = await supportApi.suggestReply(selectedTicket.id);
        setReplyText(draft.suggestedReply);
        showToast.success('Reply draft added for review.');
      } else {
        const classification = await supportApi.classify(selectedTicket.id);
        setAiClassification(classification);
        showToast.success('Ticket classified.');
      }
    } catch (error) {
      console.error(error);
      showToast.error('AI assistant could not complete that action.');
    } finally {
      setAiLoading(null);
    }
  };

  if (isLoading) return <LoadingOverlay />;
  if (isError) return <div className="alert alert-danger">Failed to load support tickets.</div>;

  return (
    <div className="container-fluid py-4 h-100">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0">Support Inbox</h4>
        <select
          className="form-select w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Tickets</option>
          <option value="Open">Open</option>
          <option value="Replied">Replied</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <div className="row h-100" style={{ minHeight: '600px' }}>
        {/* Ticket List */}
        <div className="col-md-5 col-lg-4 border-end overflow-auto" style={{ maxHeight: 'calc(100vh - 150px)' }}>
          <div className="list-group list-group-flush">
            {tickets?.length === 0 ? (
              <div className="text-muted p-3">No tickets found.</div>
            ) : (
              tickets?.map((ticket) => (
                <button
                  key={ticket.id}
                  className={classNames('list-group-item list-group-item-action p-3', {
                    'active': selectedTicket?.id === ticket.id,
                  })}
                  onClick={() => selectTicket(ticket)}
                >
                  <div className="d-flex w-100 justify-content-between align-items-center mb-1">
                    <h6 className="mb-0 text-truncate" style={{ maxWidth: '70%' }}>{ticket.subject}</h6>
                    <small className={classNames('badge', {
                      'bg-warning': ticket.status === 'Open',
                      'bg-success': ticket.status === 'Replied',
                      'bg-secondary': ticket.status === 'Closed',
                    })}>
                      {ticket.status}
                    </small>
                  </div>
                  <p className="mb-1 text-truncate small">{ticket.name}</p>
                  <small className={selectedTicket?.id === ticket.id ? 'text-white-50' : 'text-muted'}>
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </small>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Ticket Details */}
        <div className="col-md-7 col-lg-8 d-flex flex-column" style={{ maxHeight: 'calc(100vh - 150px)' }}>
          {selectedTicket ? (
            <div className="card border-0 h-100 shadow-sm d-flex flex-column">
              <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-1 fw-bold">{selectedTicket.subject}</h5>
                  <div className="text-muted small">
                    From: <strong>{selectedTicket.name}</strong> ({selectedTicket.email})
                    {selectedTicket.phone && <span> • Phone: {selectedTicket.phone}</span>}
                  </div>
                </div>
                {selectedTicket.status !== 'Closed' && (
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => handleCloseTicket(selectedTicket.id)}>
                    Mark as Closed
                  </button>
                )}
              </div>
              <div className="card-body overflow-auto flex-grow-1" style={{ backgroundColor: '#f8f9fa' }}>
                <div className="bg-white p-3 rounded shadow-sm mb-4 border">
                  <div className="text-muted small mb-2 d-flex justify-content-between">
                    <span>Customer Message</span>
                    <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{selectedTicket.message}</p>
                </div>

                {selectedTicket.adminReply && (
                  <div className="bg-primary bg-opacity-10 p-3 rounded shadow-sm border border-primary border-opacity-25 ms-5">
                    <div className="text-primary small mb-2 d-flex justify-content-between">
                      <span>Our Reply ({selectedTicket.repliedBy})</span>
                      <span>{selectedTicket.repliedAt && new Date(selectedTicket.repliedAt).toLocaleString()}</span>
                    </div>
                    <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{selectedTicket.adminReply}</p>
                  </div>
                )}

                <div className="bg-white p-3 rounded shadow-sm border">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                    <div>
                      <h6 className="fw-semibold mb-0">AI Support Assistant</h6>
                      <small className="text-muted">Drafts and labels are for admin review only.</small>
                    </div>
                    <div className="btn-group btn-group-sm">
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        disabled={!!aiLoading}
                        onClick={() => handleAiAction('summary')}
                      >
                        {aiLoading === 'summary' ? 'Summarizing...' : 'Summarize'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        disabled={!!aiLoading || selectedTicket.status === 'Closed'}
                        onClick={() => handleAiAction('reply')}
                      >
                        {aiLoading === 'reply' ? 'Drafting...' : 'Suggest Reply'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-primary"
                        disabled={!!aiLoading}
                        onClick={() => handleAiAction('classify')}
                      >
                        {aiLoading === 'classify' ? 'Classifying...' : 'Classify'}
                      </button>
                    </div>
                  </div>

                  {aiSummary && (
                    <div className="alert alert-info py-2 mb-3">
                      <div className="small text-uppercase fw-semibold mb-1">Summary</div>
                      <div>{aiSummary.summary}</div>
                      <small className="text-muted">Provider: {aiSummary.provider}</small>
                    </div>
                  )}

                  {aiClassification && (
                    <div className="d-flex flex-wrap gap-2">
                      <span className="badge bg-danger-subtle text-danger">Priority: {aiClassification.priority}</span>
                      <span className="badge bg-secondary-subtle text-secondary">Sentiment: {aiClassification.sentiment}</span>
                      <span className="badge bg-primary-subtle text-primary">Category: {aiClassification.category}</span>
                      <span className="badge bg-light text-muted border">Provider: {aiClassification.provider}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="card-footer bg-white border-top p-3">
                {selectedTicket.status !== 'Closed' ? (
                  <form onSubmit={handleReply}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Send a Reply</label>
                      <textarea
                        className="form-control"
                        rows={4}
                        placeholder="Type your response here. This will be emailed to the customer."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        required
                        disabled={isReplying}
                      />
                    </div>
                    <div className="d-flex justify-content-end">
                      <button type="submit" className="btn btn-primary" disabled={isReplying || !replyText.trim()}>
                        {isReplying ? 'Sending...' : 'Send Reply via Email'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="alert alert-secondary mb-0 text-center">
                    This ticket is closed.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="d-flex align-items-center justify-content-center h-100 text-muted">
              <div className="text-center">
                <i className="fas fa-inbox fa-3x mb-3 opacity-50"></i>
                <h5>Select a ticket to view details</h5>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
