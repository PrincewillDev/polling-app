"use client";

import React, { useState, useEffect } from "react";
import PollResults from "@/components/polls/poll-results";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PollResultsProps, PollResult, Poll } from "@/types";

// Mock data for demonstration
const mockPoll: Poll = {
  id: "example-poll-1",
  title: "What's your favorite programming language?",
  description: "Help us understand the community's preferences",
  status: "active",
  category: "Technology",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  endDate: "2024-12-31T23:59:59Z",
  createdBy: {
    id: "user-1",
    name: "John Developer",
    email: "john@example.com",
  },
  allowMultipleChoice: false,
  requireAuth: true,
  isAnonymous: false,
  showResults: "after-vote",
  totalVotes: 1247,
  totalViews: 3421,
  uniqueVoters: 1189,
  tags: ["programming", "technology", "survey"],
  isPublic: true,
  shareCode: "PROG2024",
  options: [
    {
      id: "opt-1",
      text: "JavaScript",
      votes: 423,
      percentage: 34,
    },
    {
      id: "opt-2",
      text: "Python",
      votes: 387,
      percentage: 31,
    },
    {
      id: "opt-3",
      text: "TypeScript",
      votes: 298,
      percentage: 24,
    },
    {
      id: "opt-4",
      text: "Rust",
      votes: 89,
      percentage: 7,
    },
    {
      id: "opt-5",
      text: "Go",
      votes: 50,
      percentage: 4,
    },
  ],
};

const mockResults: PollResult[] = [
  {
    optionId: "opt-1",
    optionText: "JavaScript",
    votes: 423,
    percentage: 34,
    voters: [
      { id: "voter-1", name: "Alice Smith", votedAt: "2024-01-15T10:30:00Z" },
      { id: "voter-2", name: "Bob Johnson", votedAt: "2024-01-15T11:45:00Z" },
      { id: "voter-3", name: "Carol Wilson", votedAt: "2024-01-15T14:20:00Z" },
    ],
  },
  {
    optionId: "opt-2",
    optionText: "Python",
    votes: 387,
    percentage: 31,
    voters: [
      { id: "voter-4", name: "David Brown", votedAt: "2024-01-15T09:15:00Z" },
      { id: "voter-5", name: "Eva Davis", votedAt: "2024-01-15T13:30:00Z" },
    ],
  },
  {
    optionId: "opt-3",
    optionText: "TypeScript",
    votes: 298,
    percentage: 24,
    voters: [
      { id: "voter-6", name: "Frank Miller", votedAt: "2024-01-15T16:00:00Z" },
    ],
  },
  {
    optionId: "opt-4",
    optionText: "Rust",
    votes: 89,
    percentage: 7,
    voters: [],
  },
  {
    optionId: "opt-5",
    optionText: "Go",
    votes: 50,
    percentage: 4,
    voters: [],
  },
];

const PollResultsExample: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [displayMode, setDisplayMode] = useState<"bar" | "pie" | "list" | "minimal">("bar");
  const [showVoterDetails, setShowVoterDetails] = useState(false);
  const [isRealTime, setIsRealTime] = useState(false);
  const [currentResults, setCurrentResults] = useState(mockResults);

  // Simulate real-time updates
  useEffect(() => {
    if (!isRealTime) return;

    const interval = setInterval(() => {
      setCurrentResults(prev => prev.map(result => {
        const randomIncrease = Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0;
        const newVotes = result.votes + randomIncrease;
        const newPercentage = Math.round((newVotes / (mockPoll.totalVotes + randomIncrease)) * 100);

        return {
          ...result,
          votes: newVotes,
          percentage: newPercentage,
        };
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [isRealTime]);

  const handleResultClick = (optionId: string, result: PollResult) => {
    console.log("Result clicked:", { optionId, result });
    alert(`Clicked on: ${result.optionText} (${result.votes} votes)`);
  };

  const handleVoterClick = (voterId: string) => {
    console.log("Voter clicked:", voterId);
    alert(`Viewing voter details: ${voterId}`);
  };

  const handleExport = (format: "csv" | "json" | "pdf") => {
    console.log("Exporting as:", format);
    alert(`Exporting poll results as ${format.toUpperCase()}`);
  };

  const simulateLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  const toggleRealTime = () => {
    setIsRealTime(!isRealTime);
    if (!isRealTime) {
      // Reset to original data when starting real-time
      setCurrentResults(mockResults);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>PollResults Component Examples</CardTitle>
          <p className="text-gray-600">
            Comprehensive demonstration of the PollResults component with various configurations
            and interactive features following the style guide principles.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisplayMode("bar")}
              className={displayMode === "bar" ? "bg-primary text-primary-foreground" : ""}
            >
              Bar View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisplayMode("list")}
              className={displayMode === "list" ? "bg-primary text-primary-foreground" : ""}
            >
              List View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisplayMode("minimal")}
              className={displayMode === "minimal" ? "bg-primary text-primary-foreground" : ""}
            >
              Minimal View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVoterDetails(!showVoterDetails)}
              className={showVoterDetails ? "bg-primary text-primary-foreground" : ""}
            >
              Voter Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleRealTime}
              className={isRealTime ? "bg-green-500 text-white" : ""}
            >
              {isRealTime ? "Stop" : "Start"} Real-time
            </Button>
            <Button variant="outline" size="sm" onClick={simulateLoading}>
              Simulate Loading
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="secondary">Total Votes: {mockPoll.totalVotes}</Badge>
            <Badge variant="secondary">Unique Voters: {mockPoll.uniqueVoters}</Badge>
            <Badge variant="secondary">Poll Status: {mockPoll.status}</Badge>
            {isRealTime && <Badge variant="default">🔴 Live Updates</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* Main Poll Results Component */}
      <PollResults
        pollId={mockPoll.id}
        poll={mockPoll}
        results={currentResults}
        totalVotes={currentResults.reduce((sum, result) => sum + result.votes, 0)}
        uniqueVoters={mockPoll.uniqueVoters}
        showPercentages={true}
        showVoterDetails={showVoterDetails}
        showVoterCount={true}
        isLoading={isLoading}
        isRealTime={isRealTime}
        displayMode={displayMode}
        theme="auto"
        animationEnabled={true}
        sortBy="votes"
        sortOrder="desc"
        highlightWinning={true}
        showResultsAfter="immediately"
        allowExport={true}
        onResultClick={handleResultClick}
        onVoterClick={handleVoterClick}
        onExport={handleExport}
        className="shadow-lg"
      />

      {/* Configuration Examples */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Minimal Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Minimal Configuration</CardTitle>
            <p className="text-sm text-gray-600">
              Basic implementation with only required props
            </p>
          </CardHeader>
          <CardContent>
            <PollResults
              pollId={mockPoll.id}
              poll={mockPoll}
              results={mockResults.slice(0, 3)}
              totalVotes={mockPoll.totalVotes}
              uniqueVoters={mockPoll.uniqueVoters}
            />
          </CardContent>
        </Card>

        {/* Real-time Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Real-time & Interactive</CardTitle>
            <p className="text-sm text-gray-600">
              Live updates with interactive features enabled
            </p>
          </CardHeader>
          <CardContent>
            <PollResults
              pollId={mockPoll.id}
              poll={mockPoll}
              results={currentResults.slice(0, 3)}
              totalVotes={currentResults.reduce((sum, r) => sum + r.votes, 0)}
              uniqueVoters={mockPoll.uniqueVoters}
              isRealTime={isRealTime}
              displayMode="minimal"
              highlightWinning={true}
              animationEnabled={true}
              onResultClick={(optionId, result) =>
                console.log("Mini result clicked:", optionId)
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Basic Usage:</h4>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto">
{`<PollResults
  pollId="poll-123"
  poll={pollData}
  results={pollResults}
  totalVotes={1247}
  uniqueVoters={1189}
/>`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Advanced Configuration:</h4>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto">
{`<PollResults
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
/>`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Event Handlers:</h4>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-x-auto">
{`const handleResultClick = (optionId: string, result: PollResult) => {
  console.log('Result clicked:', { optionId, result });
  // Navigate to detailed view or show more info
};

const handleVoterClick = (voterId: string) => {
  console.log('Voter clicked:', voterId);
  // Show voter profile or details
};

const handleExport = (format: 'csv' | 'json' | 'pdf') => {
  // Implement export functionality
  exportPollResults(pollId, format);
};`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Features Showcase */}
      <Card>
        <CardHeader>
          <CardTitle>Key Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 className="font-semibold mb-2">Display Options:</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• Multiple view modes (bar, list, minimal)</li>
                <li>• Customizable sorting options</li>
                <li>• Winning option highlighting</li>
                <li>• Responsive design</li>
                <li>• Dark mode support</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-2">Interactive Features:</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• Real-time updates support</li>
                <li>• Voter details expansion</li>
                <li>• Export functionality</li>
                <li>• Click handlers for results/voters</li>
                <li>• Smooth animations</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-2">Accessibility:</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• ARIA labels and descriptions</li>
                <li>• Keyboard navigation support</li>
                <li>• High contrast colors</li>
                <li>• Screen reader friendly</li>
                <li>• Tooltips for additional context</li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold mb-2">Performance:</h5>
              <ul className="space-y-1 text-gray-600">
                <li>• Optimized re-renders</li>
                <li>• Lazy loading for large datasets</li>
                <li>• Efficient sorting algorithms</li>
                <li>• Memoized calculations</li>
                <li>• Smooth animations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PollResultsExample;
