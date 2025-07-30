# URL State Persistence Implementation

This document describes the URL state persistence feature implemented for the price tracker application.

## Overview

The application now saves filter states in URL parameters when users interact with filters on the deals and products pages. This allows users to:

- Share filtered views via URL
- Use browser back/forward navigation while preserving filter state
- Refresh the page without losing their filter selections
- Bookmark specific filtered views

## Implementation Details

### Pages with State Persistence

#### 1. Deals Page (`/deals`)

**URL Parameters:**
- `days` - Time range filter (7 or 30 days)
- `sort` - Sort order (value or percentage)
- `category_id` - Selected category ID
- `manufacturer_id` - Selected manufacturer ID

**Example URL:**
```
/deals?days=30&sort=percentage&category_id=123&manufacturer_id=456
```

#### 2. Products Page (`/products`)

**URL Parameters:**
- `search` - Search query text
- `category_id` - Selected category ID
- `manufacturer_id` - Selected manufacturer ID
- `show_out_of_stock` - Stock filter (true/false)
- `sort` - Sort order (price-asc, price-desc, name-asc, name-desc)
- `price_min` - Minimum price filter
- `price_max` - Maximum price filter

**Example URL:**
```
/products?search=gaming&sort=price-desc&show_out_of_stock=false&category_id=123
```

### Technical Implementation

#### State Synchronization

Both pages use Svelte 5's reactive system with `$effect` to automatically sync filter state to URL parameters:

```typescript
$effect(() => {
    const params = new URLSearchParams();
    
    // Add non-default values to URL
    if (selectedCategory !== "all") {
        params.set('category_id', selectedCategory.toString());
    }
    // ... other parameters
    
    // Update URL without creating history entry
    goto(`?${params.toString()}`, { keepFocus: true, replaceState: true });
});
```

#### State Restoration

On page load, the `onMount` lifecycle reads URL parameters and restores filter state:

```typescript
onMount(() => {
    const urlParams = page.url.searchParams;
    
    const urlCategoryId = urlParams.get('category_id');
    if (urlCategoryId) {
        selectedCategory = urlCategoryId;
    }
    // ... restore other parameters
});
```

### Key Features

1. **Clean URLs**: Default values are not added to URL parameters to keep URLs clean
2. **Graceful Handling**: Invalid parameter values are ignored gracefully
3. **No History Pollution**: Uses `replaceState: true` to avoid creating browser history entries for each filter change
4. **Immediate Updates**: URL updates instantly when filters change
5. **Full Restoration**: All filter state is restored when navigating back or loading URL directly

### Browser Navigation Support

- **Back/Forward**: Filter state is preserved when using browser navigation
- **Direct URL Access**: Full filter state is restored when accessing URLs with parameters directly
- **Page Refresh**: Filter state persists through page refreshes
- **URL Sharing**: Users can share filtered views by copying the URL

## Testing

The implementation has been tested for:

- ✅ Filter changes update URL immediately
- ✅ Browser back navigation preserves filter state
- ✅ Direct URL navigation restores correct filter state
- ✅ Page refresh maintains filter state
- ✅ Invalid parameter values are handled gracefully
- ✅ Default values don't pollute URLs

## Benefits

1. **Improved UX**: Users don't lose their filter selections when navigating
2. **Shareable Links**: Filtered views can be shared via URL
3. **Better SEO**: Search engines can index filtered views
4. **Analytics**: Filter usage can be tracked via URL parameters
5. **Bookmarking**: Users can bookmark specific filtered views