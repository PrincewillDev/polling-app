'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePolls } from '@/hooks/usePolls';
import { CreatePollData } from '@/lib/types';

interface PollFormProps {
  onSuccess?: (pollId: string) => void;
  redirectTo?: string;
}

export default function PollForm({ onSuccess, redirectTo }: PollFormProps) {
  const router = useRouter();
  const { createNewPoll } = usePolls();

  const [pollData, setPollData] = useState<CreatePollData>({
    title: '',
    description: '',
    options: ['', ''],
    allowMultipleVotes: false,
    expiresAt: undefined,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Title validation
    if (!pollData.title.trim()) {
      newErrors.title = 'Poll title is required';
    } else if (pollData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters long';
    } else if (pollData.title.trim().length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }

    // Description validation
    if (pollData.description && pollData.description.trim().length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    // Options validation
    const validOptions = pollData.options.filter(option => option.trim());

    if (validOptions.length < 2) {
      newErrors.options = 'Poll must have at least 2 options';
    } else if (validOptions.length > 10) {
      newErrors.options = 'Poll cannot have more than 10 options';
    }

    // Check for duplicate options
    const uniqueOptions = new Set(validOptions.map(opt => opt.toLowerCase()));
    if (uniqueOptions.size !== validOptions.length) {
      newErrors.options = 'All options must be unique';
    }

    // Check individual option length
    const longOptions = validOptions.filter(opt => opt.length > 100);
    if (longOptions.length > 0) {
      newErrors.options = 'Each option must be less than 100 characters';
    }

    // Expiry date validation
    if (pollData.expiresAt && pollData.expiresAt < new Date()) {
      newErrors.expiresAt = 'Expiry date must be in the future';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSubmitError('');

    try {
      // Filter out empty options
      const validOptions = pollData.options.filter(option => option.trim());

      const result = await createNewPoll({
        ...pollData,
        options: validOptions,
        title: pollData.title.trim(),
        description: pollData.description?.trim(),
      });

      if (result.success && result.poll) {
        if (onSuccess) {
          onSuccess(result.poll.id);
        } else if (redirectTo) {
          router.push(redirectTo);
        } else {
          router.push(`/polls/${result.poll.id}`);
        }
      } else {
        setSubmitError(result.error || 'Failed to create poll');
      }
    } catch (error) {
      console.error('Poll creation error:', error);
      setSubmitError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreatePollData, value: any) => {
    setPollData(prev => ({ ...prev, [field]: value }));

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Clear submit error
    if (submitError) {
      setSubmitError('');
    }
  };

  const addOption = () => {
    if (pollData.options.length < 10) {
      setPollData(prev => ({
        ...prev,
        options: [...prev.options, '']
      }));
    }
  };

  const removeOption = (index: number) => {
    if (pollData.options.length > 2) {
      setPollData(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const updateOption = (index: number, value: string) => {
    setPollData(prev => ({
      ...prev,
      options: prev.options.map((option, i) => i === index ? value : option)
    }));

    // Clear options error when user updates an option
    if (errors.options) {
      setErrors(prev => ({ ...prev, options: '' }));
    }
  };

  const formatDateForInput = (date?: Date) => {
    if (!date) return '';
    return date.toISOString().slice(0, 16);
  };

  const parseDateFromInput = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    return new Date(dateString);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Create New Poll</CardTitle>
        <CardDescription>
          Create an engaging poll to gather opinions from your community
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {submitError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {submitError}
            </div>
          )}

          {/* Poll Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Poll Title *</Label>
            <Input
              id="title"
              type="text"
              placeholder="What would you like to ask?"
              value={pollData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className={errors.title ? 'border-red-500' : ''}
              disabled={isLoading}
              maxLength={200}
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title}</p>
            )}
            <p className="text-xs text-gray-500">
              {pollData.title.length}/200 characters
            </p>
          </div>

          {/* Poll Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add more context to your poll..."
              value={pollData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={errors.description ? 'border-red-500' : ''}
              disabled={isLoading}
              maxLength={500}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
            <p className="text-xs text-gray-500">
              {(pollData.description || '').length}/500 characters
            </p>
          </div>

          {/* Poll Options */}
          <div className="space-y-2">
            <Label>Poll Options *</Label>
            <div className="space-y-3">
              {pollData.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      disabled={isLoading}
                      maxLength={100}
                    />
                  </div>
                  {pollData.options.length > 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {pollData.options.length < 10 && (
              <Button
                type="button"
                variant="outline"
                onClick={addOption}
                disabled={isLoading}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            )}

            {errors.options && (
              <p className="text-sm text-red-600">{errors.options}</p>
            )}
            <p className="text-xs text-gray-500">
              {pollData.options.filter(opt => opt.trim()).length} options (minimum 2, maximum 10)
            </p>
          </div>

          {/* Poll Settings */}
          <div className="space-y-4 p-4 border rounded-md bg-gray-50">
            <h3 className="font-medium text-gray-900">Poll Settings</h3>

            {/* Multiple votes option */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="allowMultipleVotes"
                checked={pollData.allowMultipleVotes}
                onChange={(e) => handleInputChange('allowMultipleVotes', e.target.checked)}
                disabled={isLoading}
                className="rounded"
              />
              <Label htmlFor="allowMultipleVotes" className="text-sm">
                Allow users to select multiple options
              </Label>
            </div>

            {/* Expiry date */}
            <div className="space-y-2">
              <Label htmlFor="expiresAt" className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>Expiry Date (Optional)</span>
              </Label>
              <Input
                id="expiresAt"
                type="datetime-local"
                value={formatDateForInput(pollData.expiresAt)}
                onChange={(e) => handleInputChange('expiresAt', parseDateFromInput(e.target.value))}
                className={errors.expiresAt ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.expiresAt && (
                <p className="text-sm text-red-600">{errors.expiresAt}</p>
              )}
              <p className="text-xs text-gray-500">
                Leave empty if you don't want the poll to expire
              </p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <div className="flex justify-end space-x-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Poll...
                </>
              ) : (
                'Create Poll'
              )}
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Your poll will be publicly visible once created. You can manage it from your dashboard.
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
