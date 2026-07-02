import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { assistantApi, cartApi } from '../../api';
import { AssistantAction, AssistantChatResponse, AssistantProduct, Product } from '../../types';
import { resolveImageUrl } from '../../utils/media';
import { useAuth } from '../../hooks/useAuth';
import { useWishlist } from '../../hooks/useWishlist';
import { showConfirm, showToast } from '../../utils/toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  response?: AssistantChatResponse;
}

const welcomeMessage: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm Markety AI. I can find and compare products, add items to your cart or wishlist, track orders, and help you shop securely. ممكن تكلمني بالعربي كمان.",
};

const quickPrompts = [
  { icon: 'fa-search', label: 'Smart search', prompt: 'رشحلي أفضل لابتوب للألعاب تحت 50000 جنيه' },
  { icon: 'fa-balance-scale', label: 'Compare', prompt: 'قارن بين أفضل كارتين شاشة متاحين' },
  { icon: 'fa-truck', label: 'Track order', prompt: 'عايز أتتبع آخر طلب ليا' },
  { icon: 'fa-shield-alt', label: 'Security', prompt: 'إزاي أحمي حسابي وعمليات الدفع؟' },
];

const panelVariants = {
  hidden: { x: '-105%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring' as const, damping: 25, stiffness: 260 } },
  exit: { x: '-105%', opacity: 0, transition: { duration: 0.2 } },
} as const satisfies Variants;

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const containsArabic = (value: string) => /[\u0600-\u06ff]/.test(value);

const toProduct = (product: AssistantProduct): Product => ({
  id: product.id,
  name: product.name,
  description: product.description,
  price: product.price,
  stock: product.stock,
  imageUrl: product.imageUrl,
  categoryId: '',
  categoryName: product.categoryName,
  sizes: product.sizes,
});

const formatPrice = (price: number) =>
  price.toLocaleString('en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  });

export const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [sending, setSending] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { addToWishlist, isInWishlist } = useWishlist();

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => inputRef.current?.focus(), 250);
  }, [open]);

  useEffect(() => {
    if (!open || !messageListRef.current) return;
    messageListRef.current.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, sending, open]);

  const sendMessage = async (event?: FormEvent, prompt?: string) => {
    event?.preventDefault();
    const content = (prompt ?? input).trim();
    if (!content || sending) return;

    const userMessage: ChatMessage = { id: newId(), role: 'user', content };
    const conversation = messages
      .filter((message) => message.id !== 'welcome')
      .slice(-10)
      .map((message) => ({ role: message.role, content: message.content }));

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await assistantApi.chat({ message: content, conversation });
      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: 'assistant',
          content: response.reply,
          response,
        },
      ]);
    } catch (error: any) {
      const isRateLimited = error?.response?.status === 429;
      setMessages((current) => [
        ...current,
        {
          id: newId(),
          role: 'assistant',
          content: isRateLimited
            ? containsArabic(content)
              ? 'إنت بتبعت رسائل بسرعة شوية. استنى لحظة وجرب تاني.'
              : 'You are sending messages too quickly. Please wait a moment and try again.'
            : containsArabic(content)
              ? 'حصلت مشكلة مؤقتة في الاتصال بالمساعد. جرّب تاني بعد لحظة.'
              : 'I could not reach the assistant service. Please try again in a moment.',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const addSystemMessage = (content: string) => {
    setMessages((current) => [...current, { id: newId(), role: 'assistant', content }]);
  };

  const executeAction = async (
    messageId: string,
    action: AssistantAction,
    response?: AssistantChatResponse,
  ) => {
    if (executingAction) return;

    if (action.type === 'login') {
      navigate('/login');
      setOpen(false);
      return;
    }

    if (action.type === 'open_orders') {
      navigate('/orders');
      setOpen(false);
      return;
    }

    const product = [...(response?.products ?? []), ...(response?.comparison ?? [])].find(
      (item) => item.id === action.productId,
    );
    if (!product) {
      showToast.error('The selected product is no longer available.');
      return;
    }

    if (!user) {
      addSystemMessage('Please sign in before changing your cart or wishlist.');
      return;
    }

    if (action.requiresConfirmation) {
      const confirmed = await showConfirm(
        action.type === 'add_to_cart' ? 'Add to cart?' : 'Add to wishlist?',
        `${product.name}${action.size ? ` — ${action.size}` : ''}`,
        'Confirm',
      );
      if (!confirmed) return;
    }

    setExecutingAction(messageId);
    try {
      if (action.type === 'add_to_cart') {
        await cartApi.add({
          productId: product.id,
          quantity: action.quantity || 1,
          size: action.size || undefined,
        });
        await queryClient.invalidateQueries({ queryKey: ['cart'] });
        showToast.success(`${product.name} added to your cart.`);
        addSystemMessage(`Done — ${product.name} was added to your cart securely.`);
      } else {
        if (isInWishlist(product.id)) {
          addSystemMessage(`${product.name} is already in your wishlist.`);
        } else {
          addToWishlist(toProduct(product));
          showToast.success(`${product.name} added to your wishlist.`);
          addSystemMessage(`Done — ${product.name} was added to your wishlist.`);
        }
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        (typeof error?.response?.data === 'string' ? error.response.data : null) ||
        'The action could not be completed.';
      showToast.error(message);
      addSystemMessage(`I couldn't complete that action: ${message}`);
    } finally {
      setExecutingAction(null);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="chatbot-toggle"
            type="button"
            className="chatbot-toggle-btn"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, scale: 0.85, x: -15 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: -15 }}
            whileHover={{ y: -2 }}
            aria-expanded={open}
            aria-controls="markety-ai-panel"
          >
            <span className="chatbot-toggle-icon">
              <i className="fas fa-robot" />
            </span>
            <span>
              <strong>Markety AI</strong>
              <small>Shopping Assistant</small>
            </span>
            <span className="chatbot-online-dot" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              className="chatbot-backdrop"
              aria-label="Close AI assistant"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.aside
              id="markety-ai-panel"
              className="chatbot-panel"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              aria-label="Markety AI Shopping Assistant"
            >
              <header className="chatbot-header">
                <div className="chatbot-brand">
                  <div className="chatbot-logo">
                    <i className="fas fa-robot" />
                  </div>
                  <div>
                    <div className="chatbot-title-row">
                      <strong>Markety AI</strong>
                      <span className="chatbot-live-badge">LIVE</span>
                    </div>
                    <small>
                      <span className="chatbot-status-dot" /> Shopping & Security Assistant
                    </small>
                  </div>
                </div>
                <div className="chatbot-header-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setMessages([welcomeMessage]);
                    }}
                    aria-label="Start new conversation"
                    title="New conversation"
                  >
                    <i className="fas fa-redo" />
                  </button>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Close chat">
                    <i className="fas fa-times" />
                  </button>
                </div>
              </header>

              <div className="chatbot-capabilities">
                {quickPrompts.map((item) => (
                  <button
                    type="button"
                    key={item.label}
                    onClick={() => inputRef.current?.focus()}
                    disabled={sending}
                  >
                    <i className={`fas ${item.icon}`} />
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="chatbot-messages" ref={messageListRef} aria-live="polite">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`chat-message-row ${message.role === 'user' ? 'is-user' : 'is-assistant'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="chat-message-avatar">
                        <i className="fas fa-robot" />
                      </div>
                    )}
                    <div className="chat-message-stack">
                      <div className="chat-message-bubble">{message.content}</div>

                      {message.response?.products && message.response.products.length > 0 && (
                        <div className="chat-products">
                          {message.response.products.map((product) => (
                            <article className="chat-product-card" key={product.id}>
                              <button
                                type="button"
                                className="chat-product-image"
                                onClick={() => {
                                  navigate(`/product/${product.id}`);
                                  setOpen(false);
                                }}
                              >
                                <img src={resolveImageUrl(product.imageUrl)} alt={product.name} />
                              </button>
                              <div className="chat-product-info">
                                <small>{product.categoryName}</small>
                                <strong>{product.name}</strong>
                                <div className="chat-product-meta">
                                  <span>{formatPrice(product.price)}</span>
                                  <em className={product.stock > 0 ? 'in-stock' : 'out-stock'}>
                                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                                  </em>
                                </div>
                                <div className="chat-product-buttons">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigate(`/product/${product.id}`);
                                      setOpen(false);
                                    }}
                                  >
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    className="primary"
                                    onClick={() =>
                                      void sendMessage(
                                        undefined,
                                        `Add ${product.name} to my cart`,
                                      )
                                    }
                                  >
                                    <i className="fas fa-cart-plus" /> Add
                                  </button>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      )}

                      {message.response?.comparison && message.response.comparison.length >= 2 && (
                        <ComparisonTable products={message.response.comparison} />
                      )}

                      {message.response?.orders && message.response.orders.length > 0 && (
                        <div className="chat-orders">
                          {message.response.orders.map((order) => (
                            <button
                              type="button"
                              key={order.id}
                              onClick={() => {
                                navigate(`/orders/${order.id}`);
                                setOpen(false);
                              }}
                            >
                              <span>
                                <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
                                <small>{new Date(order.orderDate).toLocaleDateString()}</small>
                              </span>
                              <span>
                                <em className={`order-status status-${order.status.toLowerCase()}`}>
                                  {order.status}
                                </em>
                                <strong>{formatPrice(order.totalAmount)}</strong>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {message.response?.action && (
                        <button
                          type="button"
                          className="chat-confirm-action"
                          disabled={executingAction === message.id}
                          onClick={() =>
                            void executeAction(message.id, message.response!.action!, message.response)
                          }
                        >
                          {executingAction === message.id ? (
                            <i className="fas fa-circle-notch fa-spin" />
                          ) : (
                            <i
                              className={`fas ${
                                message.response.action.type === 'add_to_cart'
                                  ? 'fa-cart-plus'
                                  : message.response.action.type === 'add_to_wishlist'
                                    ? 'fa-heart'
                                    : message.response.action.type === 'open_orders'
                                      ? 'fa-box'
                                      : 'fa-sign-in-alt'
                              }`}
                            />
                          )}
                          {message.response.action.label}
                        </button>
                      )}

                      {message.role === 'assistant' && message.response && (
                        <small className="chat-response-source">
                          <i className="fas fa-shield-alt" />
                          {message.response.provider !== 'local'
                            ? 'AI answer grounded in live store data'
                            : 'Smart answer grounded in live store data'}
                        </small>
                      )}
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="chat-message-row is-assistant">
                    <div className="chat-message-avatar">
                      <i className="fas fa-robot" />
                    </div>
                    <div className="chat-typing" aria-label="Assistant is thinking">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}
              </div>

              <form className="chatbot-composer" onSubmit={sendMessage}>
                <div className="chatbot-input-shell">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    maxLength={1000}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Ask for products, comparisons, orders..."
                    aria-label="Message Markety AI"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || sending}
                    aria-label="Send message"
                  >
                    <i className="fas fa-paper-plane" />
                  </button>
                </div>
                <small>
                  <i className="fas fa-lock" /> Never share passwords, OTPs, or card numbers in chat.
                </small>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

const ComparisonTable = ({ products }: { products: AssistantProduct[] }) => (
  <div className="chat-comparison">
    <div className="chat-comparison-title">
      <i className="fas fa-balance-scale" /> Product comparison
    </div>
    <div className="chat-comparison-scroll">
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            {products.map((product) => (
              <th key={product.id}>{product.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Price</td>
            {products.map((product) => (
              <td key={product.id}>{formatPrice(product.price)}</td>
            ))}
          </tr>
          <tr>
            <td>Category</td>
            {products.map((product) => (
              <td key={product.id}>{product.categoryName}</td>
            ))}
          </tr>
          <tr>
            <td>Stock</td>
            {products.map((product) => (
              <td key={product.id}>{product.stock}</td>
            ))}
          </tr>
          <tr>
            <td>Options</td>
            {products.map((product) => (
              <td key={product.id}>{product.sizes.length ? product.sizes.join(', ') : 'Standard'}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);
