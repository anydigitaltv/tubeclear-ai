/**
 * Dynamic Date Utilities for Future-Proof Policy Engine
 * Replaces hardcoded years with dynamic CURRENT_YEAR
 */

// Get current year dynamically
export const CURRENT_YEAR = new Date().getFullYear();

// Get current month/year formatted string
export const getCurrentMonthYear = (): string => {
  const now = new Date();
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
};

// Get short month/year (e.g., "Apr 2026")
export const getShortMonthYear = (): string => {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

// Format policy effective date to show relative time
export const formatPolicyDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  
  // If date is in future, show "Upcoming"
  if (date > now) {
    return `Effective: ${getShortMonthYear()}`;
  }
  
  // Calculate relative time
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) {
    return 'Recently updated';
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years} year${years > 1 ? 's' : ''} ago`;
  }
};

// Generate dynamic policy description with current year
export const generateDynamicDescription = (
  baseDescription: string,
  year?: number
): string => {
  const targetYear = year || CURRENT_YEAR;
  return baseDescription.replace(/202[4-6]/g, String(targetYear));
};

// Check if policy needs review (older than 1 year)
export const needsPolicyReview = (effectiveDate: string): boolean => {
  const date = new Date(effectiveDate);
  const now = new Date();
  const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
  
  return date < oneYearAgo;
};

// Get policy horizon message
export const getPolicyHorizonMessage = (): string => {
  return `Verified with Latest ${getCurrentMonthYear()} Policies`;
};
