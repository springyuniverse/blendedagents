'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function AvailabilityToggle() {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.getProfile(),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: (isAvailable: boolean) => api.toggleAvailability(isAvailable),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  if (isLoading || !profile) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <div className="w-8 h-4 bg-gray-200 rounded-full" />
        Loading...
      </div>
    );
  }

  const isAvailable = profile.is_available;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex w-2 h-2 rounded-full ${
            isAvailable ? 'bg-green-500' : 'bg-gray-300'
          }`}
        />
        <span className="text-xs text-gray-600">
          {isAvailable ? 'Available' : 'Unavailable'}
        </span>
      </div>
      <button
        onClick={() => mutation.mutate(!isAvailable)}
        disabled={mutation.isPending}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
          isAvailable ? 'bg-green-500' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={isAvailable}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            isAvailable ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
