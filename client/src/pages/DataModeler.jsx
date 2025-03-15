import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, Divider, Button, IconButton, Drawer, TextField } from '@mui/material';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useProject } from '../contexts/ProjectContext';
import PageHeader from '../components/PageHeader';
import DataTypeNode from '../components/modeler/DataTypeNode';
import DataFieldNode from '../components/modeler/DataFieldNode';
import DataTypePanel from '../components/modeler/DataTypePanel';
import DataTypeForm from '../components/modeler/DataTypeForm';
import FieldForm from '../components/modeler/FieldForm';

// Register custom node types
const nodeTypes = {
  dataType: DataTypeNode,
  dataField: DataFieldNode,
};

function DataModeler() {
  const { projectId } = useParams();
  const { showSnackbar } = useSnackbar();
  const { getProject, saveProjectData } = useProject();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState('type'); // 'type' or 'field'
  const [formData, setFormData] = useState({});

  // Load saved model if available
  useEffect(() => {
    const loadProjectData = async () => {
      try {
        const project = await getProject(projectId);
        if (project.dataModel) {
          setNodes(project.dataModel.nodes || []);
          setEdges(project.dataModel.edges || []);
        }
      } catch (error) {
        console.error('Error loading project data:', error);
        showSnackbar('Failed to load project data', 'error');
      }
    };

    loadProjectData();
  }, [projectId, getProject, showSnackbar]);

  // Handle node selection
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setFormData(node.data);
    setDrawerMode(node.type === 'dataType' ? 'type' : 'field');
    setIsDrawerOpen(true);
  }, []);

  // Handle connection between nodes
  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({ 
      ...params, 
      animated: true,
      style: { stroke: '#5f95ff', strokeWidth: 2 }
    }, eds));
  }, [setEdges]);

  // Create a new data type
  const handleAddDataType = useCallback(() => {
    setDrawerMode('type');
    setFormData({
      name: '',
      description: '',
      fields: []
    });
    setIsDrawerOpen(true);
    setSelectedNode(null);
  }, []);

  // Save a data type (create or update)
  const handleSaveDataType = useCallback((data) => {
    if (selectedNode) {
      // Update existing node
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === selectedNode.id) {
            return {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            };
          }
          return node;
        })
      );
    } else {
      // Create new node
      const newNodeId = `dataType-${Date.now()}`;
      const newNode = {
        id: newNodeId,
        type: 'dataType',
        position: { x: 100, y: 100 },
        data: {
          ...data,
          id: newNodeId,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    }
    setIsDrawerOpen(false);
  }, [selectedNode, setNodes]);

  // Add a field to a data type
  const handleAddField = useCallback((dataTypeId, fieldData) => {
    const fieldId = `field-${Date.now()}`;
    const fieldNode = {
      id: fieldId,
      type: 'dataField',
      position: { x: 400, y: 100 },
      data: {
        ...fieldData,
        id: fieldId,
      },
    };
    
    setNodes((nds) => [...nds, fieldNode]);
    
    // Connect the field to its data type
    const newEdge = {
      id: `edge-${dataTypeId}-${fieldId}`,
      source: dataTypeId,
      target: fieldId,
      animated: true,
      style: { stroke: '#5f95ff', strokeWidth: 2 }
    };
    
    setEdges((eds) => [...eds, newEdge]);
    setIsDrawerOpen(false);
  }, [setNodes, setEdges]);

  // Handle saving the entire model
  const handleSaveModel = async () => {
    try {
      await saveProjectData(projectId, 'dataModel', { nodes, edges });
      showSnackbar('Data model saved successfully', 'success');
    } catch (error) {
      console.error('Error saving data model:', error);
      showSnackbar('Failed to save data model', 'error');
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader 
        title="Data Modeler" 
        actions={
          <Button 
            variant="contained" 
            startIcon={<SaveIcon />} 
            onClick={handleSaveModel}
            color="primary"
          >
            Save Model
          </Button>
        }
      />
      
      <Box sx={{ display: 'flex', flexGrow: 1, height: 'calc(100vh - 180px)' }}>
        {/* Data Types Panel */}
        <DataTypePanel onAddDataType={handleAddDataType} />
        
        {/* Main Canvas */}
        <Paper sx={{ flexGrow: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </Paper>
      </Box>
      
      {/* Drawer for editing */}
      <Drawer
        anchor="right"
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        sx={{ '& .MuiDrawer-paper': { width: 400 } }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {drawerMode === 'type' 
                ? (selectedNode ? 'Edit Data Type' : 'Create Data Type') 
                : (selectedNode ? 'Edit Field' : 'Add Field')}
            </Typography>
            <IconButton onClick={() => setIsDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 3 }} />
          
          {drawerMode === 'type' ? (
            <DataTypeForm 
              initialData={formData} 
              onSave={handleSaveDataType} 
              onCancel={() => setIsDrawerOpen(false)}
            />
          ) : (
            <FieldForm 
              initialData={formData} 
              onSave={(fieldData) => handleAddField(selectedNode?.id, fieldData)} 
              onCancel={() => setIsDrawerOpen(false)}
            />
          )}
        </Box>
      </Drawer>
    </Box>
  );
}

export default DataModeler;
