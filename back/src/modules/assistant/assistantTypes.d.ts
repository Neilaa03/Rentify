export type AssistantRole = 'user' | 'assistant' | 'tool' | 'system';

export interface AssistantChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export interface AssistantChatRequest {
  message: string;
  conversationId?: string;
  context?: AssistantChatMessage[];
}

export interface AssistantChatResponse {
  conversationId: string;
  message: AssistantChatMessage;
  toolsUsed: AssistantToolName[];
  toolResults?: AssistantToolResult[];
}

export type AssistantToolName =
  | 'getReservations'
  | 'getReservationDetails'
  | 'searchVehicles'
  | 'getVehicleDetails'
  | 'getListingDetails'
  | 'getCarDetails'
  | 'getUserProfile'
  | 'getListingAvailability'
  | 'calculateReservationPrice'
  | 'getPaymentStatus'
  | 'getFavorites'
  | 'getVehicleReviews'
  | 'getMyReviews'
  | 'requestCancelReservation'
  | 'requestCreateReservation'
  | 'requestLeaveReview'
  | 'requestUpdateProfile';

export interface AssistantToolResult {
  type: 'actionResult' | 'pendingAction' | 'reservation' | 'reservations' | 'vehicles' | 'listing' | 'car' | 'profile' | 'price' | 'payment' | 'availability' | 'reviews' | 'raw';
  title: string;
  [key: string]: unknown;
}

export interface SearchVehicleFilters {
  country?: string;
  city?: string;
  availableFrom?: string;
  availableTo?: string;
  minPrice?: number;
  maxPrice?: number;
  fuelType?: string;
  transmission?: string;
  seats?: number;
  brand?: string;
  year?: number;
  page?: number;
  limit?: number;
}

export interface AssistantAuthenticatedUser {
  id: string;
  role?: string;
  email?: string;
}
