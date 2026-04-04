import { useContext } from 'react';
import FeedbackContext from '../app/providers/feedbackContext';

const useFeedback = () => {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }

  return context;
};

export default useFeedback;
