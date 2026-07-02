const RECOMMENDATION_SESSION_KEY = 'markety.recommendation.session';

const createSessionId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getRecommendationSessionId = () => {
  let sessionId = sessionStorage.getItem(RECOMMENDATION_SESSION_KEY);
  if (!sessionId) {
    sessionId = createSessionId();
    sessionStorage.setItem(RECOMMENDATION_SESSION_KEY, sessionId);
  }
  return sessionId;
};
