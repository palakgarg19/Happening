/**
 * Helper function to get a default image placeholder based on category.
 */
export const getDefaultImage = (category) => {
  const text = category
    ? category.charAt(0).toUpperCase() + category.slice(1)
    : "Event";
  const size = "400x200";
  switch (category?.toLowerCase()) {
    case "sports":
      return `https://placehold.co/${size}/E91E63/white?text=${text}`;
    case "health":
      return `https://placehold.co/${size}/4CAF50/white?text=${text}`;
    case "arts":
      return `https://placehold.co/${size}/FFC107/black?text=${text}`;
    case "music":
      return `https://placehold.co/${size}/3F51B5/white?text=${text}`;
    case "food":
      return `https://placehold.co/${size}/FF5722/white?text=${text}`;
    case "tech":
      return `https://placehold.co/${size}/00BCD4/white?text=${text}`;
    default:
      return `https://placehold.co/${size}/607D8B/white?text=${text}`;
  }
};