# PollResultsProps Documentation

## Overview

The `PollResultsProps` interface defines a comprehensive set of properties for displaying poll results with professional styling, interactive features, and accessibility support. This documentation provides detailed information about each property and implementation guidelines following the style guide principles.

## Interface Definition

```typescript
export interface PollResultsProps {
  pollId: string;
  poll: Poll;
  results: PollResult[];
  totalVotes: number;
  uniqueVoters: number;
  showPercentages?: boolean;
  showVoterDetails?: boolean;
  showVoterCount?: boolean;
  isLoading?: boolean;
  isRealTime?: boolean;
  displayMode?: "bar" | "pie" | "list" | "minimal";
  theme?: "light" | "dark" | "auto";
  animationEnabled?: boolean;
  sortBy?: "votes" | "percentage" | "alphabetical" | "order";
  sortOrder?: "asc" | "desc";
  highlightWinning?: boolean;
  showResultsAfter?: "immediately" | "after-vote" | "after-end" | "never";
  allowExport?: boolean;
  onResultClick?: (optionId: string, result: PollResult) => void;
  onVoterClick?: (voterId: string) => void;
  onExport?: (format: "csv" | "json" | "pdf") => void;
  className?: string;
  style?: React.CSSProperties;
}
```

## Required Properties

### `pollId: string`
- **Description**: Unique identifier for the poll
- **Usage**: Used for tracking, analytics, and export functionality
- **Example**: `"poll-123-abc"`

### `poll: Poll`
- **Description**: Complete poll object containing metadata
- **Usage**: Provides context like title, description, settings
- **Type**: Full `Poll` interface from types

### `results: PollResult[]`
- **Description**: Array of poll option results with vote data
- **Usage**: Core data for visualization and display
- **Structure**: Each result contains optionId, text, votes, percentage, and optional voter details

### `totalVotes: number`
- **Description**: Total number of votes cast across all options
- **Usage**: Used for percentage calculations and display
- **Example**: `1247`

### `uniqueVoters: number`
- **Description**: Number of unique individuals who voted
- **Usage**: Displayed in summary statistics
- **Note**: May differ from totalVotes in multiple-choice polls

## Optional Display Properties

### `showPercentages?: boolean`
- **Default**: `true`
- **Description**: Controls display of percentage values
- **Usage**: Toggle percentage badges and progress bar labels

### `showVoterDetails?: boolean`
- **Default**: `false`
- **Description**: Enables expandable voter information
- **Requirements**: Requires voter data in PollResult objects
- **Privacy**: Respect user privacy and poll settings

### `showVoterCount?: boolean`
- **Default**: `true`
- **Description**: Shows unique voter count in header
- **Usage**: Part of summary statistics display

### `isLoading?: boolean`
- **Default**: `false`
- **Description**: Triggers loading state UI
- **Usage**: Show skeleton placeholders during data fetch

### `isRealTime?: boolean`
- **Default**: `false`
- **Description**: Indicates live updating results
- **Features**: Shows "Live" badge and enables real-time animations

## Visual Configuration

### `displayMode?: "bar" | "pie" | "list" | "minimal"`
- **Default**: `"bar"`
- **Options**:
  - `"bar"`: Horizontal bar chart with progress bars
  - `"pie"`: Circular pie chart visualization
  - `"list"`: Clean list format with rankings
  - `"minimal"`: Compact text-only display

### `theme?: "light" | "dark" | "auto"`
- **Default**: `"auto"`
- **Description**: Visual theme preference
- **Auto**: Follows system preference

### `animationEnabled?: boolean`
- **Default**: `true`
- **Description**: Controls motion animations
- **Performance**: Disable for better performance on low-end devices

## Data Organization

### `sortBy?: "votes" | "percentage" | "alphabetical" | "order"`
- **Default**: `"votes"`
- **Options**:
  - `"votes"`: Sort by vote count
  - `"percentage"`: Sort by percentage
  - `"alphabetical"`: Sort by option text
  - `"order"`: Original poll option order

### `sortOrder?: "asc" | "desc"`
- **Default**: `"desc"`
- **Description**: Sort direction
- **Usage**: Ascending or descending order

### `highlightWinning?: boolean`
- **Default**: `true`
- **Description**: Visually emphasize the leading option
- **Styling**: Golden background and trophy icon

## Behavioral Properties

### `showResultsAfter?: "immediately" | "after-vote" | "after-end" | "never"`
- **Default**: `"after-vote"`
- **Description**: Controls when results are visible
- **Integration**: Should match poll's showResults setting

### `allowExport?: boolean`
- **Default**: `false`
- **Description**: Enables export functionality
- **Formats**: CSV, JSON, PDF options

## Event Handlers

### `onResultClick?: (optionId: string, result: PollResult) => void`
- **Description**: Callback when a result option is clicked
- **Use Cases**: Navigate to details, show analytics, expand view
- **Parameters**: Option ID and complete result object

### `onVoterClick?: (voterId: string) => void`
- **Description**: Callback when a voter is clicked (if voter details shown)
- **Privacy**: Ensure user consent for voter identification
- **Use Cases**: Show voter profile, voting history

### `onExport?: (format: "csv" | "json" | "pdf") => void`
- **Description**: Callback for export functionality
- **Implementation**: Handle data export in various formats
- **Security**: Validate export permissions

## Styling Properties

### `className?: string`
- **Description**: Additional CSS classes
- **Usage**: Custom styling and responsive adjustments
- **Example**: `"shadow-lg max-w-2xl mx-auto"`

### `style?: React.CSSProperties`
- **Description**: Inline styles object
- **Usage**: Dynamic styling based on props or state
- **Recommendation**: Prefer className for static styles

## Implementation Examples

### Basic Usage
```typescript
<PollResults
  pollId="poll-123"
  poll={pollData}
  results={pollResults}
  totalVotes={1247}
  uniqueVoters={1189}
/>
```

### Advanced Configuration
```typescript
<PollResults
  pollId="poll-123"
  poll={pollData}
  results={pollResults}
  totalVotes={1247}
  uniqueVoters={1189}
  showVoterDetails={true}
  isRealTime={true}
  displayMode="bar"
  highlightWinning={true}
  allowExport={true}
  sortBy="votes"
  sortOrder="desc"
  onResultClick={handleResultClick}
  onVoterClick={handleVoterClick}
  onExport={handleExport}
  className="shadow-lg"
/>
```

### Event Handler Implementation
```typescript
const handleResultClick = (optionId: string, result: PollResult) => {
  // Navigate to detailed analysis
  router.push(`/polls/${pollId}/results/${optionId}`);
};

const handleVoterClick = (voterId: string) => {
  // Show voter profile modal
  openVoterProfile(voterId);
};

const handleExport = (format: "csv" | "json" | "pdf") => {
  // Trigger export functionality
  exportPollResults(pollId, format);
};
```

## Best Practices

### Performance
- Use React.memo for components with frequently updating props
- Implement virtual scrolling for large voter lists
- Debounce real-time updates to prevent excessive re-renders
- Lazy load voter details to improve initial render time

### Accessibility
- Provide ARIA labels for all interactive elements
- Ensure keyboard navigation works for all controls
- Use semantic HTML elements for screen readers
- Maintain sufficient color contrast ratios

### User Experience
- Show loading states during data operations
- Provide clear visual feedback for interactions
- Implement smooth transitions between display modes
- Handle error states gracefully

### Data Privacy
- Respect poll anonymity settings
- Validate user permissions before showing voter details
- Implement proper data export authorization
- Follow GDPR and privacy regulations

## Integration Guidelines

### With Polling System
```typescript
// Fetch and transform poll data
const pollResults = await fetchPollResults(pollId);
const transformedResults = pollResults.map(transformToPollResult);

<PollResults
  pollId={pollId}
  poll={poll}
  results={transformedResults}
  totalVotes={poll.totalVotes}
  uniqueVoters={poll.uniqueVoters}
  showResultsAfter={poll.showResults}
  isRealTime={poll.status === 'active'}
/>
```

### With Real-time Updates
```typescript
useEffect(() => {
  if (isRealTime) {
    const subscription = subscribeToResults(pollId, (newResults) => {
      setResults(newResults);
    });
    return () => subscription.unsubscribe();
  }
}, [pollId, isRealTime]);
```

## Testing Considerations

- Test with various data sizes (empty, small, large datasets)
- Verify accessibility with screen readers
- Test performance with real-time updates
- Validate export functionality across formats
- Test responsive behavior on different screen sizes

## Migration Guide

### From Legacy PollResultsProps
```typescript
// Old interface
interface OldPollResultsProps {
  poll: Poll;
  showVoterDetails?: boolean;
}

// New interface - add required properties
interface NewPollResultsProps {
  pollId: string; // Add poll ID
  poll: Poll;
  results: PollResult[]; // Add results array
  totalVotes: number; // Add vote totals
  uniqueVoters: number; // Add voter count
  showVoterDetails?: boolean; // Existing property
  // ... additional optional properties
}
```

This comprehensive interface enables rich, interactive poll result displays while maintaining flexibility and following established design principles.