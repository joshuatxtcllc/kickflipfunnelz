import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, Divider, Button, IconButton, Drawer, Tab, Tabs } from '@mui/material';
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
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useProject } from '../contexts/ProjectContext';
import PageHeader from '../components/PageHeader';

// Workflow Node Components
import StartNode from '../components/workflow/StartNode';
import PageNode from '../components/workflow/PageNode';
import FormNode from '../components/workflow/FormNode';
import DecisionNode from '../components/workflow/DecisionNode';
import ProductNode from '../components/workflow/ProductNode';
import ChatNode from '../components/workflow/ChatNode';
import EndNode from '../components/workflow/EndNode';

// Node Editors
import PageNodeEditor from '../components/workflow/editors/PageNodeEditor';
import FormNodeEditor from '../components/workflow/editors/FormNodeEditor';
import DecisionNodeEditor from '../components/workflow/editors/DecisionNodeEditor';
import ProductNodeEditor from '../components/workflow/editors/ProductNodeEditor';
import ChatNodeEditor from '../components/workflow/editors/ChatNodeEditor';

// Node Palette
import NodePalette from '../components/workflow/NodePalette';

// Register custom node types
const nodeTypes = {
  startNode: StartNode,
  pageNode: PageNode,
  formNode: FormNode,
  decisionNode: DecisionNode,
  productNode: ProductNode,
  chatNode: ChatNode,
  endNode: EndNode,
};

// Initial workflow if starting from scratch
const initialNodes = [
  {
    id: 'start-1',
    type: 'startNode',
    position: { x: 250, y: 50 },
    data: { label: 'Start' },
  },
];

function WorkflowBuilder() {
  const { projectId } = useParams();
  const { showSnackbar } = useSnackbar();
  const { getProject, saveProjectData } = useProject();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const reactFlowWrapper = useRef(null);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // Load saved workflow if available
  useEffect(() => {
    const loadProjectData = async () => {
      try {
        const project = await getProject(projectId);
        if (project.workflow && project.workflow.nodes && project.workflow.nodes.length > 0) {
          setNodes(project.workflow.nodes);
          setEdges(project.workflow.edges || []);
        }
      } catch (error) {
        console.error('Error loading project workflow:', error);
        showSnackbar('Failed to load workflow data', 'error');
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
      style: { stroke: '#555', strokeWidth: 2 }
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
          label: type.charAt(0).toUpperCase() + type.slice(1, -4),
        },
      };

      // Add specific data based on node type
      if (type === 'pageNode') {
        newNode.data.content = [];
      } else if (type === 'formNode') {
        newNode.data.fields = [];
      } else if (type === 'decisionNode') {
        newNode.data.conditions = [];
      } else if (type === 'productNode') {
        newNode.data.products = [];
      } else if (type === 'chatNode') {
        newNode.data.trigger = 'manual';
      }

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  // Handle deleting a node
  const handleDeleteNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      // Also remove any connected edges
      setEdges((eds) => 
        eds.filter(
          (edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id
        )
      );
      setIsDrawerOpen(false);
      setSelectedNode(null);
    }
  }, [selectedNode, setNodes, setEdges]);

  // Save the workflow
  const handleSaveWorkflow = async () => {
    try {
      await saveProjectData(projectId, 'workflow', { nodes, edges });
      showSnackbar('Workflow saved successfully', 'success');
    } catch (error) {
      console.error('Error saving workflow:', error);
      showSnackbar('Failed to save workflow', 'error');
    }
  };

  // Preview the workflow
  const handlePreviewWorkflow = () => {
    const previewUrl = `/preview/${projectId}/workflow`;
    window.open(previewUrl, '_blank');
  };

  // Render appropriate editor based on node type
  const renderNodeEditor = () => {
    if (!selectedNode) return null;

    switch (selectedNode.type) {
      case 'pageNode':
        return (
          <PageNodeEditor 
            node={selectedNode} 
            onChange={(updatedData) => {
              setNodes((nds) =>
                nds.map((node) => {
                  if (node.id === selectedNode.id) {
                    return { ...node, data: { ...node.data, ...updatedData } };
                  }
                  return node;
                })
              );
            }} 
          />
        );
      case 'formNode':
        return (
          <FormNodeEditor 
            node={selectedNode} 
            onChange={(updatedData) => {
              setNodes((nds) =>
                nds.map((node) => {
                  if (node.id === selectedNode.id) {
                    return { ...node, data: { ...node.data, ...updatedData } };
                  }
                  return node;
                })
              );
            }} 
          />
        );
      case 'decisionNode':
        return (
          <DecisionNodeEditor 
            node={selectedNode} 
            onChange={(updatedData) => {
              setNodes((nds) =>
                nds.map((node) => {
                  if (node.id === selectedNode.id) {
                    return { ...node, data: { ...node.data, ...updatedData } };
                  }
                  return node;
                })
              );
            }} 
          />
        );
      case 'productNode':
        return (
          <ProductNodeEditor 
            node={selectedNode} 
            onChange={(updatedData) => {
              setNodes((nds) =>
                nds.map((node) => {
                  if (node.id === selectedNode.id) {
                    return { ...node, data: { ...node.data, ...updatedData } };
                  }
                  return node;
                })
              );
            }} 
          />
        );
      case 'chatNode':
        return (
          <ChatNodeEditor 
            node={selectedNode} 
            onChange={(updatedData) => {
              setNodes((nds) =>
                nds.map((node) => {
                  if (node.id === selectedNode.id) {
                    return { ...node, data: { ...node.data, ...updatedData } };
                  }
                  return node;
                })
              );
            }} 
          />
        );
      default:
        return (
          <Box p={3}>
            <Typography>Basic properties for {selectedNode.type}</Typography>
          </Box>
        );
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader 
        title="Workflow Builder" 
        actions={
          <Box>
            <Button 
              variant="outlined" 
              startIcon={<PlayArrowIcon />} 
              onClick={handlePreviewWorkflow}
              sx={{ mr: 2 }}
            >
              Preview
            </Button>
            <Button 
              variant="contained" 
              startIcon={<SaveIcon />} 
              onClick={handleSaveWorkflow}
              color="primary"
            >
              Save Workflow
            </Button>
          </Box>
        }
      />
      
      <Box sx={{ display: 'flex', flexGrow: 1, height: 'calc(100vh - 180px)' }}>
        {/* Node Palette */}
        <NodePalette />
        
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
              {selectedNode && selectedNode.type !== 'startNode' && (
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
          
          {selectedNode && selectedNode.type !== 'startNode' && selectedNode.type !== 'endNode' && (
            <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 2 }}>
              <Tab label="Properties" />
              <Tab label="Style" />
              <Tab label="Advanced" />
            </Tabs>
          )}
          
          {selectedNode && (
            <Box sx={{ p: 1 }}>
              {currentTab === 0 && renderNodeEditor()}
              {currentTab === 1 && (
                <Box p={2}>
                  <Typography variant="subtitle1">Style Options</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Style options will be available in a future update.
                  </Typography>
                </Box>
              )}
              {currentTab === 2 && (
                <Box p={2}>
                  <Typography variant="subtitle1">Advanced Options</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Advanced settings will be available in a future update.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Drawer>
    </Box>
  );
}

export default WorkflowBuilder;
