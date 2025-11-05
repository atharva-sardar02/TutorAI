import React, { useState } from 'react';
import { Box, Typography, TextField, InputAdornment } from '@mui/material';
import { Search } from '@mui/icons-material';
import { SummaryCard } from '@/components/Cards/SummaryCard';
import { LoadingState } from '@/components/Common/LoadingState';
import { ErrorState } from '@/components/Common/ErrorState';
import { EmptyState } from '@/components/Common/EmptyState';
import { useDailySummaries } from '@/hooks/useSISummaries';

export function DailySummaries() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: summaries, isLoading, error, refetch } = useDailySummaries();

  if (isLoading) {
    return <LoadingState message="Loading daily summaries..." />;
  }

  if (error) {
    return <ErrorState message="Failed to load daily summaries" onRetry={() => refetch()} />;
  }

  if (!summaries || summaries.length === 0) {
    return <EmptyState message="No daily summaries found" />;
  }

  // Filter summaries by search query
  const filteredSummaries = summaries.filter((summary) => {
    const query = searchQuery.toLowerCase();
    return (
      summary.conversationId.toLowerCase().includes(query) ||
      summary.summary?.toLowerCase().includes(query) ||
      summary.transcriptText?.toLowerCase().includes(query)
    );
  });

  return (
    <Box>
      {/* Header */}
      <Typography variant="h4" fontWeight={700} sx={{ mb: 3 }}>
        Daily Summaries
      </Typography>

      {/* Search */}
      <TextField
        fullWidth
        placeholder="Search summaries by conversation ID, content..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 3 }}
      />

      {/* Summary Feed */}
      <Box>
        {filteredSummaries.length > 0 ? (
          filteredSummaries.map((summary) => (
            <SummaryCard key={summary.id} summary={summary} />
          ))
        ) : (
          <EmptyState message="No summaries match your search" />
        )}
      </Box>

      {/* Pagination could go here */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
        Showing {filteredSummaries.length} of {summaries.length} summaries
      </Typography>
    </Box>
  );
}

