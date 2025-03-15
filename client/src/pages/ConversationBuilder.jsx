import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  Button, 
  IconButton, 
  Drawer, 
  Tab, 
  Tabs, 
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Radio,
  RadioGroup,
  FormControlLabel,
  Switch,
  Chip
} from '@mui/material';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import SaveIcon from '@mui/icons-material/Save';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useProject } from '../contexts/ProjectContext';
import PageHeader from '../components/PageHeader';
import ChatElementsPalette from '../components/conversation/ChatElementsPalette';
import ChatPreview from '../components/conversation/ChatPreview';

// Chat Flow Node Components
import MessageNode from '../components/conversation/nodes/MessageNode';
import QuestionNode from '../components/conversation/nodes/QuestionNode';
import ConditionNode from '../components/conversation/nodes/ConditionNode';
import ButtonResponseNode from '../components/conversation/nodes/ButtonResponseNode';
import ProductRecommendationNode from '../components/conversation/nodes/ProductRecommendationNode';
import OfferNode from '../components/conversation/nodes/OfferNode';
import EndConversationNode from '../components/conversation/nodes/EndConversationNode';

// Register custom node types
const nodeTypes = {
  messageNode: MessageNode,
  questionNode: QuestionNode,
  conditionNode: ConditionNode,
  buttonResponseNode: ButtonResponseNode,
  productRecommendationNode: ProductRecommendationNode,
  offerNode: OfferNode,
  endConversationNode: EndConversationNode,
};

// Initial nodes if starting from scratch
const initialNodes = [
  {
    id: 'welcome-message',
    type: 'messageNode',
    position: { x: 250, y: 50 },
    data: { 
      label: 'Welcome Message',
      message: 'Hi there! How can I help you today?' 
    },
  },
];

function ConversationBuilder() {
  const { projectId } = useParams();
  const { showSnackbar } = useSnackbar();
  const { getProject, saveProjectData } = useProject();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  
  // Bot configuration
  const [botConfig, setBotConfig] = useState({
    name: 'Shopping Assistant',
    personality: 'friendly',
    responseLength: 1, // 0: short, 1: medium, 2: long
    technicalLevel: 1, // 0: simple, 1: balanced, 2: technical
    persuasiveLevel: 2, // 0: subtle, 1: balanced, 2: persuasive
    offerTiming: 'balanced', // early, balanced, late
    knowledgeBase: ['products', 'pricing', 'shipping', 'returns']
  });

  // Load saved conversation flow if available
  useEffect(() => {
    const loadProjectData = async () => {
      try {
        const project = await getProject(projectId);
        if (project.conversation) {
          if (project.conversation.nodes && project.conversation.nodes.length > 0) {
            setNodes(project.conversation.nodes);
            setEdges(project.conversation.edges || []);
          }
          
          if (project.conversation.botConfig) {
            setBotConfig(project.conversation.botConfig);
          }
        }
      } catch (error) {
        console.error('Error loading conversation flow:', error);
        showSnackbar('Failed to load conversation data', 'error');
      }
    };

    loadProjectData();
  }, [projectId, getProject, showSnackbar, setNodes, setEdges]);

  // Handle node selection
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setIsDrawerOpen(true);
  }, []);

  // Handle connection between nodes
  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ 
      ...params, 
      animated: true,
      type: 'smoothstep',
      style: { stroke: '#5f95ff', strokeWidth: 2 }
    }, eds));
  }, [setEdges]);

  // Handle tabs in the editor drawer
  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  // Handle drag and drop from palette
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');
      
      // Check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });
      
      const newNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { 
          label: type.replace('Node', '') 
        },
      };

      // Set specific data based on node type
      switch (type) {
        case 'messageNode':
          newNode.data.message = 'Enter your message here';
          break;
        case 'questionNode':
          newNode.data.question = 'Enter your question here';
          newNode.data.options = [];
          break;
        case 'conditionNode':
          newNode.data.condition = 'intent == "purchase"';
          newNode.data.rules = [];
          break;
        case 'buttonResponseNode':
          newNode.data.text = 'Choose an option:';
          newNode.data.buttons = [
            { label: 'Option 1', value: 'option1' },
            { label: 'Option 2', value: 'option2' },
          ];
          break;
        case 'productRecommendationNode':
          newNode.data.instructions = 'Recommend products based on user preferences';
          newNode.data.maxProducts = 3;
          break;
        case 'offerNode':
          newNode.data.offerType = 'discount';
          newNode.data.value = '10%';
          newNode.data.message = 'Special offer for you!';
          break;
        case 'endConversationNode':
          newNode.data.message = 'Thank you for chatting with us!';
          break;
        default:
          break;
      }

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  // Handle deleting a node
  const handleDeleteNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) => 
        eds.filter(
          (edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id
        )
      );
      setIsDrawerOpen(false);
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  // Update node data
  const handleUpdateNodeData = useCallback((updatedData) => {
    if (selectedNode) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === selectedNode.id) {
            return { ...node, data: { ...node.data, ...updatedData } };
          }
          return node;
        })
      );
    }
  }, [selectedNode, setNodes]);

  // Save the conversation flow
  const handleSaveConversation = async () => {
    try {
      await saveProjectData(projectId, 'conversation', { 
        nodes, 
        edges,
        botConfig 
      });
      showSnackbar('Conversation flow saved successfully', 'success');
    } catch (error) {
      console.error('Error saving conversation flow:', error);
      showSnackbar('Failed to save conversation flow', 'error');
    }
  };

  // Preview the conversation
  const handlePreviewConversation = () => {
    setIsPreviewOpen(true);
  };

  // Generate AI enhancements
  const handleGenerateAIEnhancements = async () => {
    try {
      showSnackbar('Generating AI enhancements...', 'info');
      
      // In a real implementation, this would call an API
      // For now, just simulate a delay and update the nodes with some enhancements
      setTimeout(() => {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.type === 'messageNode') {
              return {
                ...node,
                data: {
                  ...node.data,
                  message: node.data.message + ' [Enhanced with AI]',
                },
              };
            }
            return node;
          })
        );
        
        showSnackbar('AI enhancements applied!', 'success');
      }, 2000);
    } catch (error) {
      console.error('Error generating AI enhancements:', error);
      showSnackbar('Failed to generate AI enhancements', 'error');
    }
  };

  // Render node editor based on selected node type
  const renderNodeEditor = () => {
    if (!selectedNode) return null;

    const commonProps = {
      data: selectedNode.data,
      onChange: handleUpdateNodeData,
    };

    switch (selectedNode.type) {
      case 'messageNode':
        return (
          <Box p={2}>
            <TextField
              label="Message"
              value={selectedNode.data.message || ''}
              onChange={(e) => handleUpdateNodeData({ message: e.target.value })}
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              margin="normal"
            />
          </Box>
        );
      
      case 'questionNode':
        return (
          <Box p={2}>
            <TextField
              label="Question"
              value={selectedNode.data.question || ''}
              onChange={(e) => handleUpdateNodeData({ question: e.target.value })}
              multiline
              rows={3}
              fullWidth
              variant="outlined"
              margin="normal"
            />
            
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Expected answers (for AI understanding)
            </Typography>
            
            {(selectedNode.data.options || []).map((option, index) => (
              <Box key={index} sx={{ display: 'flex', mb: 1 }}>
                <TextField
                  size="small"
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...(selectedNode.data.options || [])];
                    newOptions[index] = e.target.value;
                    handleUpdateNodeData({ options: newOptions });
                  }}
                  fullWidth
                  variant="outlined"
                />
                <IconButton 
                  color="error" 
                  onClick={() => {
                    const newOptions = [...(selectedNode.data.options || [])];
                    newOptions.splice(index, 1);
                    handleUpdateNodeData({ options: newOptions });
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            
            <Button 
              variant="outlined" 
              size="small" 
              onClick={() => {
                const newOptions = [...(selectedNode.data.options || []), ''];
                handleUpdateNodeData({ options: newOptions });
              }}
              sx={{ mt: 1 }}
            >
              Add Option
            </Button>
          </Box>
        );
      
      // Add more node editors for other node types...
      
      default:
        return (
          <Box p={2}>
            <Typography>
              Properties for {selectedNode.type}
            </Typography>
            <pre>{JSON.stringify(selectedNode.data, null, 2)}</pre>
          </Box>
        );
    }
  };

  // Render the AI settings panel
  const renderAISettings = () => {
    return (
      <Box p={2}>
        <Typography variant="h6" gutterBottom>
          AI Bot Configuration
        </Typography>
        
        <TextField
          label="Bot Name"
          value={botConfig.name}
          onChange={(e) => setBotConfig({ ...botConfig, name: e.target.value })}
          fullWidth
          margin="normal"
        />
        
        <FormControl component="fieldset" sx={{ mt: 2, mb: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Bot Personality
          </Typography>
          <RadioGroup
            value={botConfig.personality}
            onChange={(e) => setBotConfig({ ...botConfig, personality: e.target.value })}
          >
            <FormControlLabel value="friendly" control={<Radio />} label="Friendly & Helpful" />
            <FormControlLabel value="professional" control={<Radio />} label="Professional & Formal" />
            <FormControlLabel value="sales" control={<Radio />} label="Sales Focused" />
            <FormControlLabel value="custom" control={<Radio />} label="Custom" />
          </RadioGroup>
        </FormControl>
        
        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          Response Style
        </Typography>
        
        <Typography variant="body2" gutterBottom>
          Length
        </Typography>
        <Slider
          value={botConfig.responseLength}
          onChange={(e, newValue) => setBotConfig({ ...botConfig, responseLength: newValue })}
          step={1}
          marks
          min={0}
          max={2}
          valueLabelDisplay="off"
          sx={{ mb: 2 }}
        />
        
        <Typography variant="body2" gutterBottom>
          Technical Level
        </Typography>
        <Slider
          value={botConfig.technicalLevel}
          onChange={(e, newValue) => setBotConfig({ ...botConfig, technicalLevel: newValue })}
          step={1}
          marks
          min={0}
          max={2}
          valueLabelDisplay="off"
          sx={{ mb: 2 }}
        />
        
        <Typography variant="body2" gutterBottom>
          Persuasiveness
        </Typography>
        <Slider
          value={botConfig.persuasiveLevel}
          onChange={(e, newValue) => setBotConfig({ ...botConfig, persuasiveLevel: newValue })}
          step={1}
          marks
          min={0}
          max={2}
          valueLabelDisplay="off"
          sx={{ mb: 2 }}
        />
        
        <FormControl fullWidth margin="normal">
          <InputLabel id="offer-timing-label">Offer Timing</InputLabel>
          <Select
            labelId="offer-timing-label"
            value={botConfig.offerTiming}
            label="Offer Timing"
            onChange={(e) => setBotConfig({ ...botConfig, offerTiming: e.target.value })}
          >
            <MenuItem value="early">Early (Aggressive)</MenuItem>
            <MenuItem value="balanced">Balanced</MenuItem>
            <MenuItem value="late">Late (Conservative)</MenuItem>
          </Select>
        </FormControl>
        
        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
          Knowledge Base
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {['products', 'pricing', 'shipping', 'returns', 'company', 'faq'].map((item) => (
            <Chip
              key={item}
              label={item.charAt(0).toUpperCase() + item.slice(1)}
              clickable
              color={botConfig.knowledgeBase.includes(item) ? 'primary' : 'default'}
              onClick={() => {
                if (botConfig.knowledgeBase.includes(item)) {
                  setBotConfig({
                    ...botConfig,
                    knowledgeBase: botConfig.knowledgeBase.filter((k) => k !== item),
                  });
                } else {
                  setBotConfig({
                    ...botConfig,
                    knowledgeBase: [...botConfig.knowledgeBase, item],
                  });
                }
              }}
            />
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader 
        title="Conversation Builder" 
        actions={
          <Box>
            <Button 
              variant="outlined" 
              startIcon={<QuestionAnswerIcon />} 
              onClick={handlePreviewConversation}
              sx={{ mr: 2 }}
            >
              Test Conversation
            </Button>
            <Button 
              variant="outlined" 
              startIcon={<AutoFixHighIcon />} 
              onClick={handleGenerateAIEnhancements}
              sx={{ mr: 2 }}
              color="secondary"
            >
              AI Enhance
            </Button>
            <Button 
              variant="contained" 
              startIcon={<SaveIcon />} 
              onClick={handleSaveConversation}
              color="primary"
            >
              Save
            </Button>
          </Box>
        }
      />
      
      <Box sx={{ display: 'flex', flexGrow: 1, height: 'calc(100vh - 180px)' }}>
        {/* Chat Elements Palette */}
        <ChatElementsPalette />
        
        {/* Main Canvas */}
        <Paper 
          ref={reactFlowWrapper}
          sx={{ flexGrow: 1, position: 'relative' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </Paper>
      </Box>
      
      {/* Editor Drawer */}
      <Drawer
        anchor="right"
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: 450 } }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {selectedNode ? `Edit ${selectedNode.data.label}` : 'Node Properties'}
            </Typography>
            <Box>
              {selectedNode && (
                <IconButton 
                  color="error" 
                  onClick={handleDeleteNode} 
                  sx={{ mr: 1 }}
                >
                  <DeleteIcon />
                </IconButton>
              )}
              <IconButton onClick={() => setIsDrawerOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          <Divider sx={{ mb: 2 }} />
          
          {selectedNode && renderNodeEditor()}
        </Box>
      </Drawer>
      
      {/* AI Settings Drawer */}
      <Drawer
        anchor="right"
        open={currentTab === 2 && !isDrawerOpen}
        onClose={() => setCurrentTab(0)}
        sx={{ '& .MuiDrawer-paper': { width: 450 } }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              AI Bot Settings
            </Typography>
            <IconButton onClick={() => setCurrentTab(0)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          
          {renderAISettings()}
        </Box>
      </Drawer>
      
      {/* Chat Preview Dialog */}
      <ChatPreview
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        botConfig={botConfig}
        conversationFlow={{ nodes, edges }}
      />
      
      {/* Bottom Tab Navigation */}
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10 }}>
        <Tabs value={currentTab} onChange={handleTabChange} centered>
          <Tab label="Flow Builder" />
          <Tab label="Test" onClick={handlePreviewConversation} />
          <Tab label="AI Settings" />
        </Tabs>
      </Paper>
    </Box>
  );
}

export default ConversationBuilder;
