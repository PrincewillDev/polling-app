"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Plus, Eye, Settings, Palette } from "lucide-react";
import { pollsAPI } from "@/lib/api/polls";
import { CreatePollRequest } from "@/types";
import { useAuth } from "@/components/auth/ssr-auth-provider";

const CATEGORIES = [
  "Technology",
  "Business",
  "Entertainment",
  "Sports",
  "Politics",
  "Education",
  "Food & Drink",
  "Travel",
  "Health & Fitness",
  "Lifestyle",
  "Science",
  "Art & Culture",
  "Gaming",
  "Music",
  "Movies & TV",
  "Books",
  "Fashion",
  "General",
];

const SHOW_RESULTS_OPTIONS = [
  { value: "immediately", label: "Immediately" },
  { value: "after-vote", label: "After voting" },
  { value: "after-end", label: "After poll ends" },
  { value: "never", label: "Never (private results)" },
];

export default function CreatePollPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreatePollRequest>({
    title: "",
    description: "",
    category: "",
    options: [{ text: "" }, { text: "" }],
    allowMultipleChoice: false,
    requireAuth: true,
    isAnonymous: false,
    showResults: "after-vote",
    endDate: "",
    isPublic: true,
    tags: [],
  });

  const [currentTag, setCurrentTag] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    const validOptions = formData.options.filter((opt) => opt.text.trim());
    if (validOptions.length < 2) {
      newErrors.options = "At least 2 options are required";
    }

    if (formData.endDate) {
      const endDate = new Date(formData.endDate);
      if (endDate <= new Date()) {
        newErrors.endDate = "End date must be in the future";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check authentication state with better handling
    console.log("Authentication state:", { user, isAuthenticated, loading });

    if (loading) {
      console.log("Authentication still loading, please wait...");
      return;
    }

    if (!isAuthenticated || !user) {
      console.error("User not authenticated");
      alert("Please log in to create a poll");
      router.push("/login");
      return;
    }

    if (formData.options.filter((opt) => opt.text.trim()).length < 2) {
      alert("Please provide at least 2 options");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Starting poll creation...");

      // Filter out empty options
      const validOptions = formData.options.filter((opt) => opt.text.trim());

      const pollData: CreatePollRequest = {
        ...formData,
        options: validOptions,
      };

      console.log("Poll data to submit:", pollData);

      const result = await pollsAPI.createPoll(pollData);

      console.log("Poll creation result:", result);

      if (result.success && result.data) {
        console.log("Poll created successfully, redirecting...");
        // Show success message
        alert(`🎉 Poll "${result.data.title}" created successfully!`);
        // Redirect to polls page
        router.push("/polls");
      } else {
        const errorMessage = result.error || "Failed to create poll";
        console.error("Poll creation failed:", errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error creating poll:", error);
      alert(error instanceof Error ? error.message : "Failed to create poll");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle saving as draft
  const handleSaveDraft = async () => {
    setIsLoading(true);

    try {
      const validOptions = formData.options.filter((opt) => opt.text.trim());

      if (validOptions.length < 2) {
        alert("At least 2 options are required to save as draft");
        return;
      }

      const pollData: CreatePollRequest = {
        ...formData,
        options: validOptions,
        isPublic: false, // Drafts are private
      };

      const result = await pollsAPI.createPoll(pollData);

      if (result.success && result.data) {
        alert(`📄 Poll "${result.data.title}" saved as draft!`);
        router.push("/polls");
      } else {
        throw new Error(result.error || "Failed to save draft");
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      alert(error instanceof Error ? error.message : "Failed to save draft");
    } finally {
      setIsLoading(false);
    }
  };

  // Add new option
  const addOption = () => {
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, { text: "" }],
    }));
  };

  // Remove option
  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      setFormData((prev) => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index),
      }));
    }
  };

  // Update option text
  const updateOption = (index: number, text: string) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.map((option, i) =>
        i === index ? { ...option, text } : option,
      ),
    }));
  };

  // Add tag
  const addTag = () => {
    if (currentTag.trim() && !formData.tags?.includes(currentTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), currentTag.trim()],
      }));
      setCurrentTag("");
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((tag) => tag !== tagToRemove) || [],
    }));
  };

  if (previewMode) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Poll Preview</h1>
          <Button variant="outline" onClick={() => setPreviewMode(false)}>
            Back to Edit
          </Button>
        </div>

        <Card className="max-w-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{formData.category}</Badge>
              <Badge variant={formData.isPublic ? "default" : "outline"}>
                {formData.isPublic ? "Public" : "Private"}
              </Badge>
            </div>
            <CardTitle className="text-2xl">
              {formData.title || "Untitled Poll"}
            </CardTitle>
            {formData.description && (
              <CardDescription className="text-base">
                {formData.description}
              </CardDescription>
            )}
            {formData.tags && formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-base font-medium">
                {formData.allowMultipleChoice
                  ? "Select all that apply:"
                  : "Choose one option:"}
              </Label>
              {formData.options
                .filter((opt) => opt.text.trim())
                .map((option, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type={formData.allowMultipleChoice ? "checkbox" : "radio"}
                      name="poll-option"
                      className="h-4 w-4"
                      disabled
                    />
                    <span>{option.text}</span>
                  </div>
                ))}
            </div>

            <div className="pt-4 border-t text-sm text-gray-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Authentication:</strong>{" "}
                  {formData.requireAuth ? "Required" : "Not required"}
                </div>
                <div>
                  <strong>Anonymous:</strong>{" "}
                  {formData.isAnonymous ? "Yes" : "No"}
                </div>
                <div>
                  <strong>Results visibility:</strong>{" "}
                  {
                    SHOW_RESULTS_OPTIONS.find(
                      (opt) => opt.value === formData.showResults,
                    )?.label
                  }
                </div>
                {formData.endDate && (
                  <div>
                    <strong>Ends:</strong>{" "}
                    {new Date(formData.endDate).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Create New Poll</h1>
        <p className="text-gray-600">
          Design your poll and gather insights from your audience
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="options" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Options
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Poll Information</CardTitle>
                <CardDescription>
                  Provide the basic details for your poll
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Poll Title *</Label>
                  <Input
                    id="title"
                    placeholder="What's your question?"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    className={errors.title ? "border-red-500" : ""}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500 mt-1">{errors.title}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide more context for your poll..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, category: value }))
                    }
                  >
                    <SelectTrigger
                      className={errors.category ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-100">
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.category}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="tags">Tags (Optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      placeholder="Add a tag..."
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={addTag}
                      variant="outline"
                      size="sm"
                    >
                      Add
                    </Button>
                  </div>
                  {formData.tags && formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {tag}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-red-500"
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="options" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Poll Options</CardTitle>
                <CardDescription>
                  Add the choices that people can vote on
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option.text}
                        onChange={(e) => updateOption(index, e.target.value)}
                      />
                      {formData.options.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOption(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {errors.options && (
                  <p className="text-sm text-red-500">{errors.options}</p>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addOption}
                  className="w-full"
                  disabled={formData.options.length >= 10}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option {formData.options.length >= 10 && "(Max 10)"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Poll Settings</CardTitle>
                <CardDescription>
                  Configure how your poll behaves
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Allow Multiple Choices</Label>
                    <p className="text-sm text-gray-600">
                      Let voters select more than one option
                    </p>
                  </div>
                  <Switch
                    checked={formData.allowMultipleChoice}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        allowMultipleChoice: checked,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Authentication</Label>
                    <p className="text-sm text-gray-600">
                      Only logged-in users can vote
                    </p>
                  </div>
                  <Switch
                    checked={formData.requireAuth}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, requireAuth: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Anonymous Voting</Label>
                    <p className="text-sm text-gray-600">
                      Hide voter identities in results
                    </p>
                  </div>
                  <Switch
                    checked={formData.isAnonymous}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isAnonymous: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Public Poll</Label>
                    <p className="text-sm text-gray-600">
                      Make poll visible to everyone
                    </p>
                  </div>
                  <Switch
                    checked={formData.isPublic}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isPublic: checked }))
                    }
                  />
                </div>

                <div>
                  <Label>Show Results</Label>
                  <Select
                    value={formData.showResults}
                    onValueChange={(
                      value:
                        | "immediately"
                        | "after-vote"
                        | "after-end"
                        | "never",
                    ) =>
                      setFormData((prev) => ({ ...prev, showResults: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHOW_RESULTS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                    className={errors.endDate ? "border-red-500" : ""}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  {errors.endDate && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.endDate}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    Leave empty for no end date
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPreviewMode(true)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isLoading}
            >
              Save as Draft
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Poll"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
