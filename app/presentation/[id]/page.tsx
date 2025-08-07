'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Button,
  TextField,
  Paper,
  Stack,
  AppBar,
  Toolbar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Rnd } from 'react-rnd';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HomeIcon from '@mui/icons-material/Home';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import TitleIcon from '@mui/icons-material/Title';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CloseIcon from '@mui/icons-material/Close';
import Image from 'next/image';

interface Presentation {
  id: string;
  title: string;
  creator_nickname: string;
}
interface Slide {
  id: string;
  slide_index: number;
}
interface User {
  nickname: string;
  role: string;
  last_seen?: string;
}
type BlockType = "text" | "image";
interface Block {
  id: string;
  type: BlockType;
  data: {
    text?: string;
    level?: number;
    src?: string;
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export default function PresentationRoom() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [selectedSlide, setSelectedSlide] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [editingLevel, setEditingLevel] = useState<number>(0);
  const [editingImageSrc, setEditingImageSrc] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  const [presentMode, setPresentMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const editRef = useRef<HTMLDivElement | null>(null);

  const saveEditBlock = useCallback(async () => {
    if (!editingBlockId) return;
    const block = blocks.find((b) => b.id === editingBlockId);
    if (!block) return;
    let newData;
    if (block.type === "text") {
      newData = { ...block.data, text: editingText, level: editingLevel };
    } else if (block.type === "image") {
      newData = { ...block.data, src: editingImageSrc };
    } else {
      newData = { ...block.data };
    }
    setBlocks(blocks =>
      blocks.map((b) =>
        b.id === block.id ? { ...b, data: newData } : b
      )
    );
    await supabase
      .from('slide_elements')
      .update({ data: newData })
      .eq('id', block.id);
    setEditingBlockId(null);
    setEditingText('');
    setEditingLevel(0);
    setEditingImageSrc('');
    setSelectedBlockId(null);
  }, [editingBlockId, blocks, editingText, editingLevel, editingImageSrc]);

  const fetchSlides = useCallback(async () => {
    const { data } = await supabase
      .from('slides')
      .select('id, slide_index')
      .eq('presentation_id', id)
      .order('slide_index', { ascending: true });
    if (data) setSlides(data);
  }, [id]);

  const refetchUsers = useCallback(async () => {
    const cutoff = new Date(Date.now() - 2000).toISOString();
    const { data } = await supabase
      .from('presentation_users')
      .select('nickname, role, last_seen')
      .eq('presentation_id', id)
      .gte('last_seen', cutoff);
    let processedUsers = data ? [...data] : [];
    if (presentation?.creator_nickname) {
      processedUsers = processedUsers.map(user =>
        user.nickname === presentation.creator_nickname
          ? { ...user, role: 'creator' }
          : user
      );
    }
    setUsers(processedUsers.sort((a, b) => a.nickname.localeCompare(b.nickname)));
  }, [id, presentation]);

  const fetchBlocks = useCallback(async () => {
    if (!selectedSlide) return;
    const { data } = await supabase
      .from('slide_elements')
      .select('id, type, data')
      .eq('slide_id', selectedSlide);
    if (data) setBlocks(data);
  }, [selectedSlide]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingBlockId && editRef.current && !editRef.current.contains(event.target as Node)) {
        saveEditBlock();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingBlockId, editingText, editingImageSrc, saveEditBlock]);

  const goToPrevSlide = useCallback(() => {
    const currentSlideIndex = slides.findIndex(s => s.id === selectedSlide);
    if (slides.length > 0 && currentSlideIndex > 0) {
      setSelectedSlide(slides[currentSlideIndex - 1].id);
    }
  }, [slides, selectedSlide]);

  const goToNextSlide = useCallback(() => {
    const currentSlideIndex = slides.findIndex(s => s.id === selectedSlide);
    if (slides.length > 0 && currentSlideIndex < slides.length - 1) {
      setSelectedSlide(slides[currentSlideIndex + 1].id);
    }
  }, [slides, selectedSlide]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (presentMode || document.activeElement?.tagName === 'BODY') {
        if (event.key === 'ArrowLeft') {
          goToPrevSlide();
          event.preventDefault();
        } else if (event.key === 'ArrowRight') {
          goToNextSlide();
          event.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presentMode, slides, selectedSlide, goToPrevSlide, goToNextSlide]);

  useEffect(() => {
    const broadcastChannel = supabase
      .channel('slides_updates')
      .on('broadcast', { event: 'slides-changed' }, (payload) => {
        if (payload?.payload?.presentation_id === id) {
          fetchSlides();
        }
      }).subscribe();
    return () => {
      supabase.removeChannel(broadcastChannel);
    };
  }, [id, fetchSlides]);

  useEffect(() => {
    const controlChannel = supabase
      .channel('presentation_control')
      .on('broadcast', { event: 'presentation-deleted' }, (payload) => {
        if (payload?.payload?.presentation_id === id) {
          alert("This presentation was deleted by the creator.");
          router.push('/');
        }
      }).subscribe();
    return () => {
      supabase.removeChannel(controlChannel);
    };
  }, [id, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('nickname');
      if (stored) setNickname(stored);
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetchPresentation = async () => {
      const { data } = await supabase
        .from('presentations')
        .select('*')
        .eq('id', id)
        .single();
      if (data) setPresentation(data);
    };
    fetchPresentation();
  }, [id]);

  useEffect(() => {
    if (!id || !nickname) return;
    const upsertUser = async () => {
      let currentRole = 'viewer';
      if (presentation && nickname === presentation.creator_nickname) {
        currentRole = 'creator';
      } else {
        const { data } = await supabase
          .from('presentation_users')
          .select('role')
          .eq('presentation_id', id)
          .eq('nickname', nickname)
          .single();
        if (data?.role) currentRole = data.role;
      }
      await supabase
        .from('presentation_users')
        .upsert(
          [{
            presentation_id: id,
            nickname,
            role: currentRole,
            last_seen: new Date().toISOString()
          }],
          { onConflict: 'presentation_id,nickname' }
        );
    };
    upsertUser();
    heartbeatInterval.current = setInterval(upsertUser, 1000);
    return () => {
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
    };
  }, [id, nickname, presentation]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`users_presence_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presentation_users',
          filter: `presentation_id=eq.${id}`
        },
        () => { refetchUsers(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, refetchUsers]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`slides_realtime_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slides',
          filter: `presentation_id=eq.${id}`
        },
        () => { fetchSlides(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, fetchSlides]);

  useEffect(() => {
    if (!selectedSlide) return;
    const channel = supabase
      .channel(`blocks_realtime_${selectedSlide}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slide_elements',
          filter: `slide_id=eq.${selectedSlide}`
        },
        () => { fetchBlocks(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedSlide, fetchBlocks]);

  useEffect(() => { refetchUsers(); }, [id, presentation, refetchUsers]);
  useEffect(() => { fetchSlides(); }, [id, selectedSlide, fetchSlides]);
  useEffect(() => { fetchBlocks(); }, [selectedSlide, fetchBlocks]);

  const myRole =
    nickname && nickname === presentation?.creator_nickname
      ? 'creator'
      : nickname && users.find((u) => u.nickname === nickname)?.role || 'viewer';

  const isCreator = nickname && presentation && nickname === presentation.creator_nickname;
  const canEdit = myRole === 'editor' || myRole === 'creator';

  const handleChangeRole = async (nicknameToChange: string, newRole: string) => {
    if (presentation && nicknameToChange === presentation.creator_nickname) return;
    await supabase
      .from('presentation_users')
      .update({ role: newRole })
      .eq('presentation_id', id)
      .eq('nickname', nicknameToChange);
  };

  const handleAddSlide = async () => {
    if (!id) return;
    const slideIndex = slides.length;
    const { data } = await supabase
      .from('slides')
      .insert([{ presentation_id: id, slide_index: slideIndex }])
      .select();
    if (data) {
      setSlides([...slides, data[0]]);
      setSelectedSlide(data[0].id);
      supabase
        .channel('slides_updates')
        .send({
          type: 'broadcast',
          event: 'slides-changed',
          payload: { presentation_id: id }
        });
    }
  };

  const handleRemoveSlide = async () => {
    if (!selectedSlide) return;
    await supabase.from('slides').delete().eq('id', selectedSlide);
    setSlides(slides.filter((slide) => slide.id !== selectedSlide));
    supabase
      .channel('slides_updates')
      .send({
        type: 'broadcast',
        event: 'slides-changed',
        payload: { presentation_id: id }
      });
    if (slides.length > 1) {
      const idx = slides.findIndex((slide) => slide.id === selectedSlide);
      const nextSlide = slides[idx === 0 ? 1 : idx - 1];
      setSelectedSlide(nextSlide.id);
    } else {
      setSelectedSlide(null);
    }
  };

  const handleAddTextBlock = async (level: number) => {
    if (!selectedSlide) return;
    await supabase
      .from('slide_elements')
      .insert([
        {
          slide_id: selectedSlide,
          type: 'text',
          data: {
            text: level === 0 ? 'New Text' : `Heading ${level}`,
            level,
            x: 120 + Math.random() * 200,
            y: 100 + Math.random() * 200,
            width: 300,
            height: 80
          }
        }
      ]);
  };

  const handleAddImageBlock = async () => {
    if (!selectedSlide) return;
    const src = window.prompt('Enter image URL:');
    if (!src) return;
    await supabase
      .from('slide_elements')
      .insert([
        {
          slide_id: selectedSlide,
          type: 'image',
          data: {
            src,
            x: 150 + Math.random() * 200,
            y: 150 + Math.random() * 200,
            width: 320,
            height: 180
          }
        }
      ]);
  };

  const handleBlockChange = async (blockId: string, newData: Block['data']) => {
    setBlocks(blocks =>
      blocks.map((block) =>
        block.id === blockId ? { ...block, data: newData } : block
      )
    );
    await supabase
      .from('slide_elements')
      .update({ data: newData })
      .eq('id', blockId);
  };

  const handleBlockClick = (block: Block) => {
    if (!canEdit) return;
    setEditingBlockId(block.id);
    setSelectedBlockId(block.id);
    if (block.type === "text") {
      setEditingText(block.data.text ?? "");
      setEditingLevel(block.data.level ?? 0);
    } else if (block.type === "image") {
      setEditingImageSrc(block.data.src ?? "");
    }
  };

  const handleRemoveBlock = async (blockId: string) => {
    setBlocks(blocks.filter((b) => b.id !== blockId));
    setSelectedBlockId(null);
    setEditingBlockId(null);
    await supabase
      .from('slide_elements')
      .delete()
      .eq('id', blockId);
  };

  const handleSlideAreaClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedBlockId(null);
      setEditingBlockId(null);
    }
  };

  const handleDeletePresentation = async () => {
    setDeleting(true);
    setDeleteError(null);
    const { error } = await supabase
      .from('presentations')
      .delete()
      .eq('id', id);
    setDeleting(false);
    if (error) {
      setDeleteError(error.message || "Failed to delete presentation");
    } else {
      supabase
        .channel('presentation_control')
        .send({
          type: 'broadcast',
          event: 'presentation-deleted',
          payload: { presentation_id: id }
        });
      setDeleteDialogOpen(false);
      router.push('/');
    }
  };

  const SlideToolbar = () => (
    <Box display="flex" gap={1} ml={2}>
      <Tooltip title="Add Heading 1">
        <span>
          <Button
            variant="outlined"
            startIcon={<TitleIcon />}
            onClick={() => handleAddTextBlock(1)}
            size="small"
            disabled={!canEdit}
          >
            H1
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Add Heading 2">
        <span>
          <Button
            variant="outlined"
            startIcon={<FormatSizeIcon />}
            onClick={() => handleAddTextBlock(2)}
            size="small"
            disabled={!canEdit}
          >
            H2
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Add Heading 3">
        <span>
          <Button
            variant="outlined"
            startIcon={<TextFieldsIcon />}
            onClick={() => handleAddTextBlock(3)}
            size="small"
            disabled={!canEdit}
          >
            H3
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Add Paragraph Text">
        <span>
          <Button
            variant="outlined"
            startIcon={<TextFieldsIcon />}
            onClick={() => handleAddTextBlock(0)}
            size="small"
            disabled={!canEdit}
          >
            Text
          </Button>
        </span>
      </Tooltip>
      <Tooltip title="Add Image">
        <span>
          <Button
            variant="outlined"
            startIcon={<ImageIcon />}
            onClick={handleAddImageBlock}
            size="small"
            disabled={!canEdit}
          >
            Image
          </Button>
        </span>
      </Tooltip>
    </Box>
  );

  if (presentMode) {
    return (
      <Box height="100vh" width="100vw" bgcolor="#222" display="flex" flexDirection="column">
        <AppBar position="static" color="default" sx={{ boxShadow: 0, bgcolor: "#222" }}>
          <Toolbar>
            <Tooltip title="Back to Dashboard">
              <IconButton color="primary" edge="start" onClick={() => router.push('/')}
                sx={{ bgcolor: "#fff", color: "#222", mr: 2, '&:hover': { bgcolor: "#eee" } }}>
                <HomeIcon />
              </IconButton>
            </Tooltip>
            <Typography variant="h6" color="white" sx={{ flexGrow: 1 }}>
              {presentation ? presentation.title : 'Presentation'}
            </Typography>
            <Tooltip title="Previous Slide">
              <span>
                <IconButton color="primary" onClick={goToPrevSlide}
                  disabled={slides.findIndex(s => s.id === selectedSlide) <= 0}
                  sx={{ bgcolor: "#fff", color: "#222", mx: 1, '&:hover': { bgcolor: "#eee" } }}>
                  <ArrowBackIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Next Slide">
              <span>
                <IconButton color="primary" onClick={goToNextSlide}
                  disabled={slides.findIndex(s => s.id === selectedSlide) >= slides.length - 1}
                  sx={{ bgcolor: "#fff", color: "#222", mx: 1, '&:hover': { bgcolor: "#eee" } }}>
                  <ArrowForwardIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Exit Present Mode">
              <IconButton color="error" onClick={() => setPresentMode(false)}
                sx={{ bgcolor: "#fff", color: "#c62828", mx: 1, '&:hover': { bgcolor: "#f8d7da" } }}>
                <FullscreenExitIcon />
              </IconButton>
            </Tooltip>
            {isCreator && (
              <Tooltip title="Delete Presentation">
                <span>
                  <IconButton color="error" onClick={() => setDeleteDialogOpen(true)}
                    sx={{ bgcolor: "#fff", color: "#c62828", mx: 1, '&:hover': { bgcolor: "#f8d7da" } }}>
                    <DeleteIcon />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Toolbar>
        </AppBar>
        <Box flex={1} display="flex" alignItems="center" justifyContent="center"
          bgcolor="#222" sx={{ overflow: 'auto', width: '100vw', height: '100vh' }}>
          <Paper className="slide-area" elevation={3}
            sx={{
              p: 3,
              minWidth: 400,
              minHeight: 250,
              maxWidth: "90vw",
              maxHeight: "80vh",
              bgcolor: "#fff",
              overflow: "auto",
              position: "relative",
              width: "80vw",
              height: "65vh"
            }}>
            {blocks.map((block) => (
              <Rnd
                key={block.id}
                bounds=".slide-area"
                size={{
                  width: block.data.width,
                  height: block.data.height
                }}
                position={{
                  x: block.data.x,
                  y: block.data.y
                }}
                minWidth={150}
                minHeight={60}
                disableDragging={!canEdit}
                enableResizing={canEdit ? undefined : false}
                onDragStop={(e, d) => {
                  if (!canEdit) return;
                  handleBlockChange(block.id, {
                    ...block.data,
                    x: d.x,
                    y: d.y
                  });
                }}
                onResizeStop={(
                  e,
                  direction,
                  ref,
                  delta,
                  position
                ) => {
                  if (!canEdit) return;
                  handleBlockChange(block.id, {
                    ...block.data,
                    width: ref.offsetWidth,
                    height: ref.offsetHeight,
                    x: position.x,
                    y: position.y
                  });
                }}
              >
                <Box
                  sx={{
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                    bgcolor: block.type === "text" ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,1)',
                    p: 1,
                    borderRadius: 2,
                    boxShadow: 0,
                    display: 'flex',
                    alignItems: block.type === "image" ? 'center' : undefined,
                    justifyContent: block.type === "image" ? 'center' : undefined,
                  }}
                >
                  {block.type === "text" ? (
                    <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
                      {block.data.level === 1 ? (
                        <Typography variant="h1" fontSize="2.6rem">{block.data.text}</Typography>
                      ) : block.data.level === 2 ? (
                        <Typography variant="h2" fontSize="2.2rem">{block.data.text}</Typography>
                      ) : block.data.level === 3 ? (
                        <Typography variant="h3" fontSize="1.7rem">{block.data.text}</Typography>
                      ) : (
                        <Typography variant="body1">{block.data.text}</Typography>
                      )}
                    </Box>
                  ) : block.type === "image" ? (
                    <Box sx={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative"
                    }}>
                      <Image
                        src={block.data.src || ''}
                        alt=""
                        width={block.data.width || 320}
                        height={block.data.height || 180}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "contain"
                        }}
                      />
                    </Box>
                  ) : null}
                </Box>
              </Rnd>
            ))}
          </Paper>
        </Box>
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>Delete Presentation</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this presentation? This action cannot be undone.
            </DialogContentText>
            {deleteError && (
              <Typography color="error" mt={1}>
                {deleteError}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={handleDeletePresentation}
              color="error"
              variant="contained"
              disabled={deleting}
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }

  return (
    <Box display="flex" height="100vh">
      <Box width={200} bgcolor="#f5f5f5" p={2} overflow="auto">
        <Typography variant="h6">Slides</Typography>
        <List>
          {slides.map((slide) => (
            <ListItem key={slide.id} disablePadding>
              <ListItemButton
                selected={slide.id === selectedSlide}
                onClick={() => setSelectedSlide(slide.id)}
              >
                <ListItemText primary={`Slide ${slide.slide_index + 1}`} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        {canEdit && (
          <>
            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 2 }}
              onClick={handleAddSlide}
            >
              Add Slide
            </Button>
            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 1 }}
              onClick={handleRemoveSlide}
              disabled={!selectedSlide}
            >
              Remove Slide
            </Button>
          </>
        )}
      </Box>
      <Box
        flex={1}
        bgcolor="#fff"
        position="relative"
        sx={{
          overflow: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh'
        }}
      >
        <Box
          className="slide-area"
          sx={{
            width: "80vw",
            height: "65vh",
            minWidth: 400,
            minHeight: 250,
            maxWidth: "90vw",
            maxHeight: "80vh",
            bgcolor: "#fff",
            boxShadow: 3,
            borderRadius: 2,
            p: 3,
            position: 'relative'
          }}
          onClick={handleSlideAreaClick}
        >
          <AppBar position="static" color="default" sx={{ boxShadow: 0, bgcolor: "#f5f5f5", position: 'absolute', width: "100%", top: 0, left: 0, zIndex: 10 }}>
            <Toolbar>
              <Tooltip title="Back to Dashboard">
                <IconButton
                  color="primary"
                  edge="start"
                  onClick={() => router.push('/')}
                  sx={{ bgcolor: "#fff", color: "#222", mr: 2, '&:hover': { bgcolor: "#eee" } }}
                >
                  <HomeIcon />
                </IconButton>
              </Tooltip>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                {presentation ? presentation.title : 'Presentation'}
              </Typography>
              <SlideToolbar />
              <Tooltip title="Present Mode">
                <IconButton color="primary" onClick={() => setPresentMode(true)}>
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>
              {isCreator && (
                <Tooltip title="Delete Presentation">
                  <span>
                    <IconButton
                      color="error"
                      onClick={() => setDeleteDialogOpen(true)}
                      sx={{
                        bgcolor: "#fff",
                        color: "#c62828",
                        mx: 1,
                        '&:hover': { bgcolor: "#f8d7da" }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </Toolbar>
          </AppBar>
          <Box sx={{ pt: 8 }}>
            {selectedSlide ? (
              blocks.map((block) => (
                <Rnd
                  key={block.id}
                  bounds=".slide-area"
                  size={{
                    width: block.data.width,
                    height: block.data.height
                  }}
                  position={{
                    x: block.data.x,
                    y: block.data.y
                  }}
                  minWidth={150}
                  minHeight={60}
                  disableDragging={!canEdit}
                  enableResizing={canEdit ? undefined : false}
                  onDragStop={(e, d) => {
                    if (!canEdit) return;
                    handleBlockChange(block.id, {
                      ...block.data,
                      x: d.x,
                      y: d.y
                    });
                  }}
                  onResizeStop={(
                    e,
                    direction,
                    ref,
                    delta,
                    position
                  ) => {
                    if (!canEdit) return;
                    handleBlockChange(block.id, {
                      ...block.data,
                      width: ref.offsetWidth,
                      height: ref.offsetHeight,
                      x: position.x,
                      y: position.y
                    });
                  }}
                >
                  <Box
                    ref={editRef}
                    sx={{
                      width: '100%',
                      height: '100%',
                      position: 'relative',
                      bgcolor: block.type === "text" ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,1)',
                      p: 1,
                      borderRadius: 2,
                      boxShadow: 0,
                      border: selectedBlockId === block.id ? '2px solid #1976d2' : '2px solid transparent',
                      transition: 'border 0.2s',
                      display: 'flex',
                      alignItems: block.type === "image" ? 'center' : undefined,
                      justifyContent: block.type === "image" ? 'center' : undefined
                    }}
                  >
                    {editingBlockId === block.id && canEdit ? (
                      block.type === "text" ? (
                        <TextField
                          multiline
                          minRows={2}
                          maxRows={10}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          fullWidth
                          sx={{
                            mb: 1,
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': { border: 'none' },
                            },
                          }}
                        />
                      ) : block.type === "image" ? (
                        <TextField
                          value={editingImageSrc}
                          onChange={(e) => setEditingImageSrc(e.target.value)}
                          fullWidth
                          sx={{
                            mb: 1,
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': { border: 'none' },
                            },
                          }}
                        />
                      ) : null
                    ) : (
                      <>
                        {block.type === "text" ? (
                          <Box
                            sx={{
                              width: "100%",
                              height: "100%",
                              position: "relative"
                            }}
                            onClick={() => handleBlockClick(block)}
                          >
                            {block.data.level === 1 ? (
                              <Typography variant="h1" fontSize="2.6rem" sx={{ cursor: canEdit ? "pointer" : "default" }}>{block.data.text}</Typography>
                            ) : block.data.level === 2 ? (
                              <Typography variant="h2" fontSize="2.2rem" sx={{ cursor: canEdit ? "pointer" : "default" }}>{block.data.text}</Typography>
                            ) : block.data.level === 3 ? (
                              <Typography variant="h3" fontSize="1.7rem" sx={{ cursor: canEdit ? "pointer" : "default" }}>{block.data.text}</Typography>
                            ) : (
                              <Typography variant="body1" sx={{ cursor: canEdit ? "pointer" : "default" }}>{block.data.text}</Typography>
                            )}
                            {canEdit && selectedBlockId === block.id && (
                              <IconButton
                                size="small"
                                color="error"
                                sx={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  zIndex: 2,
                                  bgcolor: "#fff",
                                  p: 0.25,
                                  boxShadow: 2
                                }}
                                onClick={(e) => { e.stopPropagation(); handleRemoveBlock(block.id); }}
                              >
                                <CloseIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            )}
                          </Box>
                        ) : block.type === "image" ? (
                          <Box
                            sx={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              position: "relative"
                            }}
                            onClick={() => handleBlockClick(block)}
                          >
                            <Image
                              src={block.data.src || ''}
                              alt=""
                              width={block.data.width || 320}
                              height={block.data.height || 180}
                              style={{
                                maxWidth: "100%",
                                maxHeight: "100%",
                                objectFit: "contain",
                                cursor: canEdit ? "pointer" : "default"
                              }}
                            />
                            {canEdit && selectedBlockId === block.id && (
                              <IconButton
                                size="small"
                                color="error"
                                sx={{
                                  position: 'absolute',
                                  top: 4,
                                  right: 4,
                                  zIndex: 2,
                                  bgcolor: "#fff",
                                  p: 0.25,
                                  boxShadow: 2
                                }}
                                onClick={(e) => { e.stopPropagation(); handleRemoveBlock(block.id); }}
                              >
                                <CloseIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            )}
                          </Box>
                        ) : null}
                      </>
                    )}
                  </Box>
                </Rnd>
              ))
            ) : (
              <Typography variant="h6" color="text.secondary">
                No slide selected
              </Typography>
            )}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
              <DialogTitle>Delete Presentation</DialogTitle>
              <DialogContent>
                <DialogContentText>
                  Are you sure you want to delete this presentation? This action cannot be undone.
                </DialogContentText>
                {deleteError && (
                  <Typography color="error" mt={1}>
                    {deleteError}
                  </Typography>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  onClick={handleDeletePresentation}
                  color="error"
                  variant="contained"
                  disabled={deleting}
                >
                  Delete
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        </Box>
      </Box>
      <Box width={250} bgcolor="#f5f5f5" p={2}>
        <Typography variant="h6">Users</Typography>
        <List>
          {users.map((user) => (
            <ListItem key={user.nickname} disablePadding sx={{ display: 'flex', alignItems: 'center' }}>
              <ListItemText
                primary={user.nickname}
                secondary={user.role}
              />
              {isCreator &&
                user.nickname !== nickname &&
                user.role !== 'creator' && (
                  <Stack direction="row" gap={1}>
                    {user.role !== 'editor' && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          handleChangeRole(
                            user.nickname,
                            'editor'
                          )
                        }
                      >
                        Make Editor
                      </Button>
                    )}
                    {user.role !== 'viewer' && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          handleChangeRole(
                            user.nickname,
                            'viewer'
                          )
                        }
                      >
                        Make Viewer
                      </Button>
                    )}
                  </Stack>
                )}
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
}
