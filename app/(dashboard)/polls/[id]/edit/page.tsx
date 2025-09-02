"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  X,
  Loader2,
  Calendar,
  Globe,
  Lock,
  Users,
  Eye,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { supabase } from "@/lib/supabase";
import { Poll } from "@/types";

interface EditPollPageProps {
  params: {
    id: string;
  };
}

const CATEGORIES = [
  "Technology",
  "Entertainment",
  "Sports",
  "Politics",
  "Business",
  "Education",
  "Health",
  "Lifestyle",
  "Science",
  "Other",
];

export default function EditPollPage({ params }: EditPollPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    status: "draft" as "active" | "closed" | "draft",
    allowMultipleChoice: false,
    requireAuth: true,
    isAnonymous: false,
    showResults: "after-vote" as
      | "immediately"
      | "after-vote"
      | "after-end"
      | "never",
    endDate: "",
    isPublic: true,
    tags: [] as string[],
    options: [{ id: "", text: "" }],
  });

  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    fetchPoll();
  }, [isAuthenticated, resolvedParams.id]);

  const fetchPoll = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getAuthToken();
      const response = await fetch(`/api/polls/${resolvedParams.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Poll not found");
        } else if (response.status === 403) {
          throw new Error("You do not have permission to edit this poll");
        }
        throw new Error("Failed to fetch poll");
      }

      const result = await response.json();
      const pollData = result.data;

      setPoll(pollData);
      setFormData({
        title: pollData.title,
        description: pollData.description || "",
        category: pollData.category,
        status: pollData.status,
        allowMultipleChoice: pollData.allowMultipleChoice,
        requireAuth: pollData.requireAuth,
        isAnonymous: pollData.isAnonymous,
        showResults: pollData.showResults,
        endDate: pollData.endDate ? pollData.endDate.split("T")[0] : "",
        isPublic: pollData.isPublic,
        tags: pollData.tags || [],
        options: pollData.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
        })),
      });
    } catch (err) {
      console.error("Error fetching poll:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch poll");
    } finally {
      setLoading(false);
    }
  };

  const getAuthToken = async () => {
    // This should match your auth implementation
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setError("Poll title is required");
      return;
    }

    if (formData.options.filter((opt) => opt.text.trim()).length < 2) {
      setError("At least 2 poll options are required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const token = await getAuthToken();
      const response = await fetch(`/api/polls/${resolvedParams.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          category: formData.category,
          status: formData.status,
          allowMultipleChoice: formData.allowMultipleChoice,
          requireAuth: formData.requireAuth,
          isAnonymous: formData.isAnonymous,
          showResults: formData.showResults,
          endDate: formData.endDate || undefined,
          isPublic: formData.isPublic,
          tags: formData.tags.length > 0 ? formData.tags : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update poll");
      }

      // Redirect back to dashboard or poll view
      router.push(`/polls/${resolvedParams.id}`);
    } catch (err) {
      console.error("Error saving poll:", err);
      setError(err instanceof Error ? err.message : "Failed to save poll");
    } finally {
      setSaving(false);
    }
  };

  const handleAddOption = () => {
    setFormData((prev) => ({
      ...prev,
      options: [...prev.options, { id: "", text: "" }],
    }));
  };

  const handleRemoveOption = (index: number) => {
    if (formData.options.length > 2) {
      setFormData((prev) => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index),
      }));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) =>
        i === index ? { ...opt, text: value } : opt,
      ),
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading poll...</span>
        </div>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Error Loading Poll</h2>
              <p className="text-muted-foreground mb-4">{error}</p>
              <div className="space-x-2">
                <Button onClick={() => router.back()}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
                <Button variant="outline" onClick={fetchPoll}>
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Poll</h1>
            <p className="text-muted-foreground">
              Modify your poll settings and content
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/polls/${resolvedParams.id}`}>
              <Eye className="w-4 h-4 mr-2" />
              View Poll
            </Link>
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-destructive">{error}</div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Edit your poll's title and description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Poll Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter your poll question"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Optional description or context"
                  className="mt-1"
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
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Poll Options */}
          <Card>
            <CardHeader>
              <CardTitle>Poll Options</CardTitle>
              <CardDescription>
                Edit the choices available to voters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor={`option-${index}`}>
                      Option {index + 1}
                    </Label>
                    <Input
                      id={`option-${index}`}
                      value={option.text}
                      onChange={(e) =>
                        handleOptionChange(index, e.target.value)
                      }
                      placeholder={`Enter option ${index + 1}`}
                      className="mt-1"
                    />
                  </div>
                  {formData.options.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-6"
                      onClick={() => handleRemoveOption(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={handleAddOption}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
              <CardDescription>
                Add tags to help organize and categorize your poll
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag"
                  onKeyPress={(e) =>
                    e.key === "Enter" && (e.preventDefault(), handleAddTag())
                  }
                />
                <Button type="button" variant="outline" onClick={handleAddTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="pr-1">
                      {tag}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1 ml-1"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Settings Sidebar */}
        <div className="space-y-6">
          {/* Status & Visibility */}
          <Card>
            <CardHeader>
              <CardTitle>Status & Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Poll Status</Label>
                <RadioGroup
                  value={formData.status}
                  onValueChange={(value: "active" | "closed" | "draft") =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="draft" id="draft" />
                    <Label htmlFor="draft">Draft</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="active" id="active" />
                    <Label htmlFor="active">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="closed" id="closed" />
                    <Label htmlFor="closed">Closed</Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublic"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isPublic: !!checked }))
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="isPublic" className="flex items-center gap-2">
                    {formData.isPublic ? (
                      <Globe className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    Public Poll
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Make this poll visible to everyone
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Poll Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Poll Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowMultiple"
                  checked={formData.allowMultipleChoice}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      allowMultipleChoice: !!checked,
                    }))
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="allowMultiple">Allow Multiple Choice</Label>
                  <p className="text-xs text-muted-foreground">
                    Let users select multiple options
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="requireAuth"
                  checked={formData.requireAuth}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, requireAuth: !!checked }))
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="requireAuth"
                    className="flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Require Authentication
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Only logged-in users can vote
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isAnonymous"
                  checked={formData.isAnonymous}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isAnonymous: !!checked }))
                  }
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="isAnonymous">Anonymous Voting</Label>
                  <p className="text-xs text-muted-foreground">
                    Hide voter identities
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <Label>Show Results</Label>
                <Select
                  value={formData.showResults}
                  onValueChange={(
                    value: "immediately" | "after-vote" | "after-end" | "never",
                  ) => setFormData((prev) => ({ ...prev, showResults: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediately">Immediately</SelectItem>
                    <SelectItem value="after-vote">After Voting</SelectItem>
                    <SelectItem value="after-end">After Poll Ends</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.endDate && (
                <>
                  <Separator />
                  <div>
                    <Label
                      htmlFor="endDate"
                      className="flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      End Date
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          endDate: e.target.value,
                        }))
                      }
                      className="mt-1"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
