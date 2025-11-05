import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
} from '@mui/material';
import { VideoLibrary, Article, Check, Close } from '@mui/icons-material';
import { LoadingState } from '@/components/Common/LoadingState';
import { ErrorState } from '@/components/Common/ErrorState';
import { EmptyState } from '@/components/Common/EmptyState';
import { useWeeklySummaries } from '@/hooks/useSISummaries';
import { formatDate } from '@/utils/formatters';

export function WeeklySummaries() {
  const { data: summaries, isLoading, error, refetch } = useWeeklySummaries();

  if (isLoading) {
    return <LoadingState message="Loading weekly summaries..." />;
  }

  if (error) {
    return <ErrorState message="Failed to load weekly summaries" onRetry={() => refetch()} />;
  }

  if (!summaries || summaries.length === 0) {
    return <EmptyState message="No weekly summaries found" />;
  }

  return (
    <Box>
      {/* Header */}
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Weekly Summaries
      </Typography>

      {/* Summary Cards */}
      <Grid container spacing={3}>
        {summaries.map((summary) => (
          <Grid item xs={12} md={6} key={summary.id}>
            <Card sx={{ height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <CardContent>
                {/* Week Info */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      Week {summary.weekId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(summary.weekStart.toDate())} - {formatDate(summary.weekEnd.toDate())}
                    </Typography>
                  </Box>
                  <Chip
                    icon={summary.reelGenerated ? <Check fontSize="small" /> : <Close fontSize="small" />}
                    label={summary.reelGenerated ? 'Reel Generated' : 'No Reel'}
                    color={summary.reelGenerated ? 'success' : 'default'}
                    size="small"
                  />
                </Box>

                {/* Summary Text */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {summary.summary}
                </Typography>

                {/* Stats */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Chip
                    icon={<Article fontSize="small" />}
                    label={`${summary.totalMessages} messages`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    icon={<VideoLibrary fontSize="small" />}
                    label={`${summary.totalRecordings} recordings`}
                    size="small"
                    variant="outlined"
                  />
                </Box>

                {/* Key Topics */}
                {summary.keyTopics && summary.keyTopics.length > 0 && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      Key Topics:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {summary.keyTopics.map((topic, index) => (
                        <Chip key={index} label={topic} size="small" color="primary" variant="outlined" />
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Conversation ID */}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  Conversation: {summary.conversationId}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

