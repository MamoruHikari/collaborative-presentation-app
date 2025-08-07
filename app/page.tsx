'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Avatar,
  Fade,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import { useRouter } from 'next/navigation';

interface Presentation {
  id: string;
  title: string;
  creator_nickname: string;
}

export default function PresentationsPage() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const router = useRouter();

  // Load nickname from localStorage
  useEffect(() => {
    const stored = window.localStorage.getItem('nickname');
    if (stored) setNickname(stored);
    else setOpenModal(true);
  }, []);

  // Fetch presentations from Supabase
  useEffect(() => {
    const fetchPresentations = async () => {
      const { data, error } = await supabase
        .from('presentations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        console.error("Error fetching presentations:", error);
      }
      if (data) setPresentations(data);
    };
    fetchPresentations();
  }, []);

  const handleNicknameSave = () => {
    window.localStorage.setItem('nickname', nicknameInput.trim());
    setNickname(nicknameInput.trim());
    setOpenModal(false);
  };

  const handleCreatePresentation = async () => {
    if (!newTitle.trim() || !nickname) return;
    const { data, error } = await supabase
      .from('presentations')
      .insert([{ title: newTitle.trim(), creator_nickname: nickname }])
      .select();
    if (error) {
      console.error("Error creating presentation:", error);
      return;
    }
    if (data && data[0]?.id) {
      router.push(`/presentation/${data[0].id}`);
    }
  };

  const handleJoinPresentation = (id: string) => {
    router.push(`/presentation/${id}`);
  };

  return (
    <Fade in>
      <Container maxWidth="md" sx={{
        mt: 8,
        p: { xs: 2, sm: 4 },
        boxShadow: '0 4px 32px 0 rgba(46, 58, 89, 0.10)',
        borderRadius: 4,
        background: '#fff',
        minHeight: { xs: '90vh', sm: '70vh' },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h4" component="h1" color="primary" fontWeight={700} letterSpacing={1}>
            Collaborative Presentations
          </Typography>
          {nickname && (
            <Box display="flex" alignItems="center">
              <Avatar sx={{ bgcolor: 'primary.main', mr: 1, width: 32, height: 32 }}>
                <PersonIcon />
              </Avatar>
              <Typography variant="subtitle1">
                {nickname}
              </Typography>
            </Box>
          )}
        </Box>

        <Box
          component="form"
          autoComplete="off"
          display="flex"
          alignItems="center"
          gap={2}
          mb={5}
          onSubmit={e => { e.preventDefault(); handleCreatePresentation(); }}
        >
          <TextField
            label="New Presentation Title"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            sx={{ flex: 1 }}
            size="medium"
            variant="outlined"
          />
          <Tooltip title="Create Presentation" arrow>
            <span>
              <IconButton
                color="primary"
                sx={{ bgcolor: 'primary.main', color: '#fff', '&:hover': { bgcolor: 'primary.dark' } }}
                size="large"
                disabled={!newTitle.trim() || !nickname}
                onClick={handleCreatePresentation}
                aria-label="create presentation"
              >
                <AddIcon fontSize="inherit" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom color="secondary" fontWeight={600}>
            Existing Presentations
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {presentations.length === 0 ? (
            <Typography color="text.secondary" fontStyle="italic">
              No presentations yet. Create one above!
            </Typography>
          ) : (
            <List>
              {presentations.map(pres => (
                <ListItem
                  key={pres.id}
                  disablePadding
                  sx={{
                    mb: 1, borderRadius: 2,
                    boxShadow: '0 1px 6px 0 rgba(46, 58, 89, 0.07)',
                    background: '#f9fafb',
                    '&:hover': { background: '#e7ebf2' },
                  }}
                >
                  <ListItemButton
                    onClick={() => handleJoinPresentation(pres.id)}
                    sx={{ py: 2, px: 3, borderRadius: 2 }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight={600} color="primary">
                          {pres.title}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          Creator: {pres.creator_nickname}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        <Dialog open={openModal} PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ fontWeight: 700, color: 'primary.main' }}>
            Enter your Nickname
          </DialogTitle>
          <DialogContent>
            <TextField
              label="Nickname"
              value={nicknameInput}
              onChange={e => setNicknameInput(e.target.value)}
              fullWidth
              autoFocus
              size="medium"
              variant="outlined"
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions sx={{ pr: 3, pb: 2 }}>
            <Button
              variant="contained"
              onClick={handleNicknameSave}
              disabled={!nicknameInput.trim()}
              color="primary"
              sx={{ borderRadius: 2, fontWeight: 600 }}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Fade>
  );
}