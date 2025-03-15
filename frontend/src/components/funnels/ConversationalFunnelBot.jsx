import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  IconButton, 
  Avatar, 
  List, 
  ListItem, 
  Collapse, 
  Fade, 
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  ButtonGroup
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import axios from 'axios';
import { useRouter } from 'next/router';

const ConversationalFunnelBot = ({ funnelId, visitorId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [currentOffer, setCurrentOffer] = useState(null);
  const [availableActions, setAvailableActions] = useState([]);
  const messagesEndRef = useRef(null);
  const router = useRouter();

  // Initialize conversation when component mounts
  useEffect(() => {
    if (funnelId && visitorId) {
      initializeConversation();
    }
  }, [funnelId, visitorId]);

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeConversation = async () => {
    try {
      const response = await axios.post('/api/funnel-bot/conversations', {
        funnelId,
        visitorId
      });
      
      setConversationId(response.data.conversationId);
      
      // Add welcome message
      setMessages([{
        sender: 'bot',
        content: `Hi there! I'm here to help you find exactly what you're looking for. How can I assist you today?`,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !conversationId) return;
    
    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message to chat
    setMessages(prev => [...prev, {
      sender: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(`/api/funnel-bot/conversations/${conversationId}/messages`, {
        message: userMessage
      });
      
      // Add bot response to chat
      setMessages(prev => [...prev, {
        sender: 'bot',
        content: response.data.message,
        timestamp: new Date()
      }]);
      
      // Handle next step navigation if provided
      if (response.data.nextStep) {
        // We could automatically navigate here, but instead we'll provide a button
        // to give the user control
      }
      
      // Handle offer if provided
      if (response.data.offer) {
        setCurrentOffer(response.data.offer);
      } else {
        setCurrentOffer(null);
      }
      
      // Set available actions
      if (response.data.actions && response.data.actions.length > 0) {
        setAvailableActions(response.data.actions);
      } else {
        setAvailableActions([]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        sender: 'bot',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action) => {
    switch (action.type) {
      case 'navigate':
        router.push(action.path);
        break;
        
      case 'viewOffer':
        // Navigate to offer page
        router.push(`/offers/${action.offerId}`);
        break;
        
      case 'addToCart':
        // Add to cart and record acceptance
        try {
          // Add to cart logic would go here
          
          // Record that the offer was accepted
          await axios.post(`/api/funnel-bot/conversations/${conversationId}/offers/${action.offerId}/accept`);
          
          // Add confirmation message
          setMessages(prev => [...prev, {
            sender: 'bot',
            content: "Great choice! I've added that to your cart.",
            timestamp: new Date()
          }]);
          
          // Clear current offer since it was accepted
          setCurrentOffer(null);
        } catch (error) {
          console.error('Failed to process action:', error);
          
          setMessages(prev => [...prev, {
            sender: 'bot',
            content: "I'm sorry, I couldn't add that to your cart. Please try again.",
            timestamp: new Date()
          }]);
        }
        break;
        
      case 'askQuestion':
        // Just focus the input field
        document.getElementById('chat-input').focus();
        break;
        
      default:
        console.warn('Unknown action type:', action.type);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const endConversation = async () => {
    if (!conversationId) return;
    
    try {
      await axios.post(`/api/funnel-bot/conversations/${conversationId}/end`);
    } catch (error) {
      console.error('Failed to end conversation:', error);
    }
    
    setIsOpen(false);
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
      {/* Chat Button */}
      <Fade in={!isOpen}>
        <IconButton 
          onClick={toggleChat}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            width: 56,
            height: 56,
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            boxShadow: 3
          }}
        >
          <ChatIcon />
        </IconButton>
      </Fade>
      
      {/* Chat Window */}
      <Collapse in={isOpen} timeout={300}>
        <Paper 
          elevation={3}
          sx={{
            width: 350,
            height: 500,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: 2
          }}
        >
          {/* Header */}
          <Box 
            sx={{ 
              p: 2, 
              bgcolor: 'primary.main', 
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <Typography variant="h6">
              Chat Assistant
            </Typography>
            <IconButton 
              size="small" 
              onClick={toggleChat}
              sx={{ color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
          
          {/* Messages Area */}
          <Box 
            sx={{ 
              p: 2, 
              flexGrow: 1, 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            {messages.map((message, index) => (
              <Box 
                key={index}
                sx={{
                  display: 'flex',
                  flexDirection: message.sender === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: 1
                }}
              >
                <Avatar 
                  sx={{ 
                    bgcolor: message.sender === 'user' ? 'secondary.main' : 'primary.main',
                    width: 32,
                    height: 32
                  }}
                >
                  {message.sender === 'user' ? 'U' : 'A'}
                </Avatar>
                <Paper 
                  sx={{
                    p: 1.5,
                    maxWidth: '70%',
                    bgcolor: message.sender === 'user' ? 'secondary.light' : 'grey.100',
                    borderRadius: 2
                  }}
                >
                  <Typography variant="body2">
                    {message.content}
                  </Typography>
                </Paper>
              </Box>
            ))}
            
            {isLoading && (
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  my: 2
                }}
              >
                <CircularProgress size={24} />
              </Box>
            )}
            
            {/* Current Offer Card */}
            {currentOffer && (
              <Card 
                sx={{ 
                  my: 1, 
                  borderLeft: '4px solid',
                  borderColor: 'primary.main'
                }}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {currentOffer.name}
                  </Typography>
                  {currentOffer.hook && (
                    <Typography variant="body2" color="primary" fontStyle="italic" gutterBottom>
                      "{currentOffer.hook}"
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {currentOffer.description}
                  </Typography>
                  <Typography variant="h6" color="primary.dark" sx={{ mt: 1 }}>
                    ${currentOffer.price}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    startIcon={<ShoppingCartIcon />}
                    onClick={() => handleAction({
                      type: 'addToCart',
                      offerId: currentOffer.id
                    })}
                  >
                    Add to Cart
                  </Button>
                  <Button 
                    size="small"
                    onClick={() => handleAction({
                      type: 'viewOffer',
                      offerId: currentOffer.id
                    })}
                  >
                    Learn More
                  </Button>
                </CardActions>
              </Card>
            )}
            
            {/* Available Actions */}
            {availableActions.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                {availableActions.map((action, index) => (
                  <Button 
                    key={index}
                    variant={action.type === 'navigate' ? 'contained' : 'outlined'}
                    size="small"
                    endIcon={action.type === 'navigate' ? <NavigateNextIcon /> : undefined}
                    onClick={() => handleAction(action)}
                  >
                    {action.label}
                  </Button>
                ))}
              </Box>
            )}
            
            <div ref={messagesEndRef} />
          </Box>
          
          {/* Input Area */}
          <Box 
            sx={{ 
              p: 2, 
              borderTop: '1px solid',
              borderColor: 'grey.200',
              display: 'flex',
              gap: 1
            }}
          >
            <TextField
              id="chat-input"
              placeholder="Type your message..."
              fullWidth
              size="small"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <IconButton 
              color="primary" 
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default ConversationalFunnelBot;

// Helper function to generate a visitor ID if none exists
export function generateVisitorId() {
  // Check if a visitor ID already exists in localStorage
  let visitorId = localStorage.getItem('kickflip_visitor_id');
  
  // If not, create one
  if (!visitorId) {
    visitorId = 'visitor_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('kickflip_visitor_id', visitorId);
  }
  
  return visitorId;
}
