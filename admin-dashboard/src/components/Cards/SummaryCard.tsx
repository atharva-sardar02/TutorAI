import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Collapse,
  Divider,
} from '@mui/material';
import { ExpandMore, ExpandLess, Message, People } from '@mui/icons-material';
import { formatDate, formatRelativeTime } from '@/utils/formatters';
import type { DailySummary } from '@/types/sessionIntel';

interface SummaryCardProps {
  summary: DailySummary;
}

export function SummaryCard({ summary }: SummaryCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card sx={{ mb: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" fontWeight={600}>
              {formatDate(new Date(summary.date))}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Conversation ID: {summary.conversationId}
            </Typography>
          </Box>
          <IconButton onClick={() => setExpanded(!expanded)} size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        {/* Summary Preview */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {summary.summary || 'No summary available'}
        </Typography>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            icon={<Message fontSize="small" />}
            label={`${summary.messageCount} messages`}
            size="small"
            variant="outlined"
          />
          <Chip
            icon={<People fontSize="small" />}
            label={`${summary.participants.length} participants`}
            size="small"
            variant="outlined"
          />
          <Chip
            label={formatRelativeTime(summary.createdAt.toDate())}
            size="small"
            color="primary"
          />
        </Box>

        {/* Expanded Content */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Transcript Excerpt
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {summary.transcriptText || 'No transcript available'}
            </Typography>

            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Participants
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {summary.participants.map((participantId) => (
                <Chip key={participantId} label={participantId} size="small" />
              ))}
            </Box>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}

