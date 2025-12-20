/**
 * Component barrel exports
 * Import components from here for cleaner imports:
 * import { PlaceCard, BudgetBar } from '../components';
 */

// Core UI Components
export { PlaceCard } from './PlaceCard';
export { BudgetBar } from './BudgetBar';
export { ChatInput } from './ChatInput';
export { Header } from './Header';
export { TypingIndicator } from './TypingIndicator';
export { Skeleton } from './SkeletonLoader';
export { AnimatedBackground } from './AnimatedBackground';

// Maps
export { InlineMap } from './InlineMap';
export { MiniMap } from './MiniMap';
export { default as ItineraryMap } from './ItineraryMap';

// Cards & Recommendations
export { DestinationCard } from './DestinationCard';
export { PlaceRecommendation } from './PlaceRecommendation';
export { ItineraryPreview } from './ItineraryPreview';

// Actions & Menus
export { ActionButtons } from './ActionButtons';
export { QuickActions } from './QuickActions';
export { QuickActionsMenu } from './QuickActionsMenu';
export { Sidebar } from './Sidebar';

// Modals
export { ChatModal } from './ChatModal';
export { AddExpenseModal } from './AddExpenseModal';
export { default as LogVisitModal } from './LogVisitModal';

// Notifications & Status
export { NotificationToast } from './NotificationToast';
export { OfflineBanner } from './OfflineBanner';
export { SetupWarning } from './SetupWarning';

// Utilities
export { default as CurrencyConverter } from './CurrencyConverter';
