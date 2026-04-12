import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchPublishChannels,
  createPublishChannel,
  updatePublishChannel,
  deletePublishChannel,
  type CreateChannelBody,
  type UpdateChannelBody,
} from '../api/publish-channels.api';

export const channelKeys = {
  all: ['publish-channels'] as const,
  detail: (id: string) => ['publish-channels', id] as const,
};

export function usePublishChannels() {
  return useQuery({
    queryKey: channelKeys.all,
    queryFn: fetchPublishChannels,
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateChannelBody) => createPublishChannel(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: channelKeys.all });
    },
  });
}

export function useUpdateChannel(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateChannelBody) => updatePublishChannel(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: channelKeys.all });
    },
  });
}

export function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePublishChannel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: channelKeys.all });
    },
  });
}
