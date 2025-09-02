"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart3,
  PieChart,
  List,
  Minimize2,
  Download,
  Trophy,
  Users,
  Eye,
  Clock,
  SortAsc,
  SortDesc,
  MoreVertical,
  User,
} from "lucide-react";
import { PollResultsProps, PollResult } from "@/types";
import { cn } from "@/lib/utils";

const PollResults: React.FC<PollResultsProps> = ({
  pollId,
  poll,
  results,
  totalVotes,
  uniqueVoters,
  showPercentages = true,
  showVoterDetails = false,
  showVoterCount = true,
  isLoading = false,
  isRealTime = false,
  displayMode = "bar",
  theme = "auto",
  animationEnabled = true,
  sortBy = "votes",
  sortOrder = "desc",
  highlightWinning = true,
  showResultsAfter = "after-vote",
  allowExport = false,
  onResultClick,
  onVoterClick,
  onExport,
  className,
  style,
}) => {
  const [currentDisplayMode, setCurrentDisplayMode] = useState(displayMode);
  const [currentSortBy, setCurrentSortBy] = useState(sortBy);
  const [currentSortOrder, setCurrentSortOrder] = useState(sortOrder);
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());

  // Sort and process results
  const sortedResults = useMemo(() => {
    const sorted = [...results].sort((a, b) => {
      let comparison = 0;

      switch (currentSortBy) {
        case "votes":
          comparison = a.votes - b.votes;
          break;
        case "percentage":
          comparison = a.percentage - b.percentage;
          break;
        case "alphabetical":
          comparison = a.optionText.localeCompare(b.optionText);
          break;
        case "order":
          comparison = results.indexOf(a) - results.indexOf(b);
          break;
      }

      return currentSortOrder === "asc" ? comparison : -comparison;
    });

    return sorted.map((result, index) => ({
      ...result,
      rank: index + 1,
      isWinning: highlightWinning && index === 0 && result.votes > 0,
    }));
  }, [results, currentSortBy, currentSortOrder, highlightWinning]);

  const winningResult = sortedResults[0];

  const toggleExpanded = (optionId: string) => {
    const newExpanded = new Set(expandedOptions);
    if (newExpanded.has(optionId)) {
      newExpanded.delete(optionId);
    } else {
      newExpanded.add(optionId);
    }
    setExpandedOptions(newExpanded);
  };

  const handleExport = (format: "csv" | "json" | "pdf") => {
    onExport?.(format);
  };

  const getDisplayModeIcon = (mode: string) => {
    switch (mode) {
      case "bar":
        return <BarChart3 className="h-4 w-4" />;
      case "pie":
        return <PieChart className="h-4 w-4" />;
      case "list":
        return <List className="h-4 w-4" />;
      case "minimal":
        return <Minimize2 className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const renderResultBar = (result: PollResult & { rank: number; isWinning?: boolean }) => {
    const isExpanded = expandedOptions.has(result.optionId);

    return (
      <motion.div
        key={result.optionId}
        layout={animationEnabled}
        initial={animationEnabled ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: result.rank * 0.1 }}
        className={cn(
          "space-y-2 p-4 rounded-lg border transition-all duration-200",
          result.isWinning
            ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 dark:from-yellow-900/20 dark:to-amber-900/20 dark:border-yellow-700"
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
          onResultClick && "cursor-pointer hover:shadow-md hover:border-blue-300"
        )}
        onClick={() => onResultClick?.(result.optionId, result)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {result.isWinning && (
              <Trophy className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            )}
            <Badge variant="outline" className="text-xs flex-shrink-0">
              #{result.rank}
            </Badge>
            <p className="font-medium text-sm truncate">{result.optionText}</p>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {showPercentages && (
              <Badge variant="secondary" className="text-xs">
                {result.percentage}%
              </Badge>
            )}
            <span className="text-sm font-semibold">
              {result.votes.toLocaleString()}
            </span>
            {showVoterDetails && result.voters && result.voters.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(result.optionId);
                }}
                className="h-6 w-6 p-0"
              >
                <Users className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Progress
            value={result.percentage}
            className={cn(
              "h-2 transition-all duration-500",
              result.isWinning && "bg-yellow-100 dark:bg-yellow-900/30"
            )}
          />

          {totalVotes > 0 && (
            <div className="flex justify-between text-xs text-gray-500">
              <span>{result.votes} votes</span>
              {showPercentages && <span>{result.percentage}% of total</span>}
            </div>
          )}
        </div>

        <AnimatePresence>
          {isExpanded && result.voters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2 border-t border-gray-200 dark:border-gray-600"
            >
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Voters ({result.voters.length}):
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.voters.map((voter) => (
                    <div
                      key={voter.id}
                      className={cn(
                        "flex items-center justify-between text-xs p-2 rounded bg-gray-50 dark:bg-gray-700",
                        onVoterClick && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                      )}
                      onClick={() => onVoterClick?.(voter.id)}
                    >
                      <div className="flex items-center space-x-2">
                        <User className="h-3 w-3" />
                        <span>{voter.name || "Anonymous"}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(voter.votedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderListView = () => (
    <div className="space-y-3">
      {sortedResults.map((result) => renderResultBar(result))}
    </div>
  );

  const renderMinimalView = () => (
    <div className="space-y-2">
      {sortedResults.map((result) => (
        <div
          key={result.optionId}
          className={cn(
            "flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800",
            onResultClick && "cursor-pointer"
          )}
          onClick={() => onResultClick?.(result.optionId, result)}
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {result.isWinning && <Trophy className="h-3 w-3 text-yellow-500" />}
            <span className="text-sm truncate">{result.optionText}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <span className="font-medium">{result.votes}</span>
            {showPercentages && (
              <span className="text-gray-500">({result.percentage}%)</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)} style={style}>
        <CardHeader>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className={cn("w-full", className)} style={style}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center space-x-2">
                <span>Poll Results</span>
                {isRealTime && (
                  <Badge variant="outline" className="text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="flex items-center space-x-4 text-sm">
                <span className="flex items-center space-x-1">
                  <BarChart3 className="h-3 w-3" />
                  <span>{totalVotes.toLocaleString()} total votes</span>
                </span>
                {showVoterCount && (
                  <span className="flex items-center space-x-1">
                    <Users className="h-3 w-3" />
                    <span>{uniqueVoters.toLocaleString()} voters</span>
                  </span>
                )}
                {winningResult && winningResult.votes > 0 && (
                  <span className="flex items-center space-x-1 text-yellow-600">
                    <Trophy className="h-3 w-3" />
                    <span>Leading: {winningResult.optionText}</span>
                  </span>
                )}
              </CardDescription>
            </div>

            <div className="flex items-center space-x-2">
              {/* Display Mode Selector */}
              <div className="flex rounded-md border">
                {["bar", "list", "minimal"].map((mode) => (
                  <Tooltip key={mode}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={currentDisplayMode === mode ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentDisplayMode(mode as any)}
                        className="h-8 w-8 p-0 rounded-none first:rounded-l-md last:rounded-r-md"
                      >
                        {getDisplayModeIcon(mode)}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="capitalize">{mode} view</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {/* Sort Controls */}
              <Select
                value={`${currentSortBy}-${currentSortOrder}`}
                onValueChange={(value) => {
                  const [sortBy, sortOrder] = value.split('-') as [any, any];
                  setCurrentSortBy(sortBy);
                  setCurrentSortOrder(sortOrder);
                }}
              >
                <SelectTrigger className="w-36 h-8">
                  <div className="flex items-center space-x-1">
                    {currentSortOrder === "asc" ?
                      <SortAsc className="h-3 w-3" /> :
                      <SortDesc className="h-3 w-3" />
                    }
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="votes-desc">Most Votes</SelectItem>
                  <SelectItem value="votes-asc">Least Votes</SelectItem>
                  <SelectItem value="percentage-desc">Highest %</SelectItem>
                  <SelectItem value="percentage-asc">Lowest %</SelectItem>
                  <SelectItem value="alphabetical-asc">A-Z</SelectItem>
                  <SelectItem value="alphabetical-desc">Z-A</SelectItem>
                  <SelectItem value="order-asc">Original Order</SelectItem>
                </SelectContent>
              </Select>

              {/* Export Menu */}
              {allowExport && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <Download className="h-3 w-3 mr-1" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport("csv")}>
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("json")}>
                      Export as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("pdf")}>
                      Export as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {totalVotes === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No votes yet</p>
              <p className="text-sm">Results will appear here once voting begins</p>
            </div>
          ) : (
            <>
              {currentDisplayMode === "minimal" && renderMinimalView()}
              {(currentDisplayMode === "bar" || currentDisplayMode === "list") && renderListView()}
            </>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default PollResults;
