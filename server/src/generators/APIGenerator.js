/**
 * APIGenerator.js
 * 
 * This module is responsible for generating API code based on visual models
 * created in the Kickflip Studio.
 */

const fs = require('fs').promises;
const path = require('path');
const { format } = require('prettier');
const { v4: uuidv4 } = require('uuid');

class APIGenerator {
  constructor(project) {
    this.project = project;
    this.outputDir = path.join(__dirname, '../../generated', project._id.toString());
    this.modelOutputDir = path.join(this.outputDir, 'models');
    this.routeOutputDir = path.join(this.outputDir, 'routes');
    this.controllerOutputDir = path.join(this.outputDir, 'controllers');
  }

  /**
   * Generate all API code based on the project models and workflows
   */
  async generateAll() {
    try {
      // Create output directories if they don't exist
      await this.createDirectories();
      
      // Generate code for each model
      await this.generateModels();
      
      // Generate routes
      await this.generateRoutes();
      
      // Generate controllers
      await this.generateControllers();
      
      // Generate API index file
      await this.generateAPIIndex();
      
      // Generate README
      await this.generateREADME();
      
      return {
        success: true,
        outputDir: this.outputDir
      };
    } catch (error) {
      console.error('Error generating API code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create output directories for generated code
   */
  async createDirectories() {
    const dirs = [
      this.outputDir,
      this.modelOutputDir,
      this.routeOutputDir,
      this.controllerOutputDir
    ];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }
    }
  }

  /**
   * Generate Mongoose models from data model definition
   */
  async generateModels() {
    if (!this.project.dataModel || !this.project.dataModel.nodes) {
      console.log('No data model found, skipping model generation');
      return;
    }

    const dataTypeNodes = this.project.dataModel.nodes.filter(
      node => node.type === 'dataType'
    );

    for (const node of dataTypeNodes) {
      const modelName = this.formatModelName(node.data.name);
      const fields = this.getFieldsForModel(node, this.project.dataModel);
      
      const modelCode = this.generateModelCode(modelName, fields, node.data.description);
      
      // Format the code using prettier
      const formattedCode = await this.formatCode(modelCode, 'babel');
      
      // Write to file
      const filePath = path.join(this.modelOutputDir, `${modelName}.js`);
      await fs.writeFile(filePath, formattedCode);
    }
  }

  /**
   * Get all fields for a specific model from the data model
   */
  getFieldsForModel(modelNode, dataModel) {
    const fields = [];
    
    // Find edges that connect from this model to field nodes
    const fieldEdges = dataModel.edges.filter(edge => edge.source === modelNode.id);
    
    for (const edge of fieldEdges) {
      const fieldNode = dataModel.nodes.find(node => node.id === edge.target);
      
      if (fieldNode && fieldNode.type === 'dataField') {
        fields.push(fieldNode.data);
      }
    }
    
    return fields;
  }

  /**
   * Generate code for a Mongoose model
   */
  generateModelCode(modelName, fields, description) {
    const schemaFields = fields.map(field => {
      let fieldDef = '';
      
      switch (field.type) {
        case 'String':
          fieldDef = `  ${field.name}: {
    type: String${field.required ? ',\n    required: true' : ''}${field.unique ? ',\n    unique: true' : ''}${field.default ? `,\n    default: "${field.default}"` : ''}
  }`;
          break;
        case 'Number':
          fieldDef = `  ${field.name}: {
    type: Number${field.required ? ',\n    required: true' : ''}${field.default ? `,\n    default: ${field.default}` : ''}
  }`;
          break;
        case 'Boolean':
          fieldDef = `  ${field.name}: {
    type: Boolean${field.default ? `,\n    default: ${field.default}` : ',\n    default: false'}
  }`;
          break;
        case 'Date':
          fieldDef = `  ${field.name}: {
    type: Date${field.default === 'now' ? ',\n    default: Date.now' : field.default ? `,\n    default: ${field.default}` : ''}
  }`;
          break;
        case 'ObjectId':
          fieldDef = `  ${field.name}: {
    type: mongoose.Schema.Types.ObjectId,
    ref: '${field.ref}'${field.required ? ',\n    required: true' : ''}
  }`;
          break;
        case 'Array':
          if (field.of === 'ObjectId') {
            fieldDef = `  ${field.name}: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: '${field.ref}'
  }]`;
          } else {
            fieldDef = `  ${field.name}: [${field.of || 'String'}]`;
          }
          break;
        default:
          fieldDef = `  ${field.name}: ${field.type || 'String'}`;
      }
      
      return fieldDef;
    });

    return `/**
 * ${modelName} model
 * ${description || ''}
 */
const mongoose = require('mongoose');

const ${modelName}Schema = new mongoose.Schema({
${schemaFields.join(',\n')}
}, {
  timestamps: true
});

module.exports = mongoose.model('${modelName}', ${modelName}Schema);
`;
  }

  /**
   * Generate routes for all models
   */
  async generateRoutes() {
    if (!this.project.dataModel || !this.project.dataModel.nodes) {
      console.log('No data model found, skipping route generation');
      return;
    }

    const dataTypeNodes = this.project.dataModel.nodes.filter(
      node => node.type === 'dataType'
    );

    // Generate individual route files
    for (const node of dataTypeNodes) {
      const modelName = this.formatModelName(node.data.name);
      const routeName = this.formatRouteName(node.data.name);
      
      const routeCode = this.generateRouteCode(modelName, routeName);
      
      // Format the code using prettier
      const formattedCode = await this.formatCode(routeCode, 'babel');
      
      // Write to file
      const filePath = path.join(this.routeOutputDir, `${routeName}.js`);
      await fs.writeFile(filePath, formattedCode);
    }

    // Generate index file for all routes
    const indexCode = this.generateRouteIndexCode(dataTypeNodes);
    const formattedIndexCode = await this.formatCode(indexCode, 'babel');
    
    // Write to file
    const indexFilePath = path.join(this.routeOutputDir, 'index.js');
    await fs.writeFile(indexFilePath, formattedIndexCode);
  }

  /**
   * Generate code for a route file
   */
  generateRouteCode(modelName, routeName) {
    return `/**
 * Routes for ${modelName}
 */
const express = require('express');
const router = express.Router();
const ${modelName}Controller = require('../controllers/${modelName}Controller');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/${routeName}
 * @desc    Get all ${routeName}
 * @access  Public
 */
router.get('/', ${modelName}Controller.getAll);

/**
 * @route   GET /api/${routeName}/:id
 * @desc    Get ${modelName} by ID
 * @access  Public
 */
router.get('/:id', ${modelName}Controller.getById);

/**
 * @route   POST /api/${routeName}
 * @desc    Create a new ${modelName}
 * @access  Private
 */
router.post('/', authenticate, ${modelName}Controller.create);

/**
 * @route   PUT /api/${routeName}/:id
 * @desc    Update ${modelName} by ID
 * @access  Private
 */
router.put('/:id', authenticate, ${modelName}Controller.update);

/**
 * @route   DELETE /api/${routeName}/:id
 * @desc    Delete ${modelName} by ID
 * @access  Private
 */
router.delete('/:id', authenticate, ${modelName}Controller.delete);

module.exports = router;
`;
  }

  /**
   * Generate index file for all routes
   */
  generateRouteIndexCode(dataTypeNodes) {
    const imports = dataTypeNodes.map(node => {
      const routeName = this.formatRouteName(node.data.name);
      return `const ${routeName}Routes = require('./${routeName}');`;
    });

    const routeRegistration = dataTypeNodes.map(node => {
      const routeName = this.formatRouteName(node.data.name);
      return `  app.use('/api/${routeName}', ${routeName}Routes);`;
    });

    return `/**
 * API Routes Index
 */
${imports.join('\n')}

module.exports = (app) => {
${routeRegistration.join('\n')}
};
`;
  }

  /**
   * Generate controllers for all models
   */
  async generateControllers() {
    if (!this.project.dataModel || !this.project.dataModel.nodes) {
      console.log('No data model found, skipping controller generation');
      return;
    }

    const dataTypeNodes = this.project.dataModel.nodes.filter(
      node => node.type === 'dataType'
    );

    for (const node of dataTypeNodes) {
      const modelName = this.formatModelName(node.data.name);
      
      const controllerCode = this.generateControllerCode(modelName);
      
      // Format the code using prettier
      const formattedCode = await this.formatCode(controllerCode, 'babel');
      
      // Write to file
      const filePath = path.join(this.controllerOutputDir, `${modelName}Controller.js`);
      await fs.writeFile(filePath, formattedCode);
    }
  }

  /**
   * Generate code for a controller file
   */
  generateControllerCode(modelName) {
    return `/**
 * Controller for ${modelName}
 */
const ${modelName} = require('../models/${modelName}');

// Get all ${modelName}s
exports.getAll = async (req, res) => {
  try {
    const items = await ${modelName}.find();
    res.json(items);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Get ${modelName} by ID
exports.getById = async (req, res) => {
  try {
    const item = await ${modelName}.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: '${modelName} not found' });
    }
    
    res.json(item);
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: '${modelName} not found' });
    }
    
    res.status(500).send('Server Error');
  }
};

// Create a new ${modelName}
exports.create = async (req, res) => {
  try {
    const newItem = new ${modelName}(req.body);
    
    // Set creator if applicable
    if (req.user && req.user.id) {
      newItem.createdBy = req.user.id;
    }
    
    const item = await newItem.save();
    res.json(item);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// Update ${modelName} by ID
exports.update = async (req, res) => {
  try {
    let item = await ${modelName}.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: '${modelName} not found' });
    }
    
    // Update the item with request body
    item = await ${modelName}.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    
    res.json(item);
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: '${modelName} not found' });
    }
    
    res.status(500).send('Server Error');
  }
};

// Delete ${modelName} by ID
exports.delete = async (req, res) => {
  try {
    const item = await ${modelName}.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({ message: '${modelName} not found' });
    }
    
    await item.remove();
    
    res.json({ message: '${modelName} removed' });
  } catch (err) {
    console.error(err.message);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ message: '${modelName} not found' });
    }
    
    res.status(500).send('Server Error');
  }
};
`;
  }

  /**
   * Generate API index file
   */
  async generateAPIIndex() {
    const indexCode = `/**
 * API Entry Point
 */
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
require('dotenv').config();

// Initialize Express
const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(express.json());

// Routes
routes(app);

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
`;

    const formattedCode = await this.formatCode(indexCode, 'babel');
    
    // Write to file
    const filePath = path.join(this.outputDir, 'app.js');
    await fs.writeFile(filePath, formattedCode);
  }

  /**
   * Generate README file with instructions
   */
  async generateREADME() {
    const readmeContent = `# ${this.project.name} - API

This API was automatically generated by Kickflip Studio.

## Setup

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Create a \`.env\` file with the following variables:
   \`\`\`
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   PORT=5000
   \`\`\`

3. Start the server:
   \`\`\`
   npm start
   \`\`\`

## API Endpoints

${this.generateEndpointDocs()}

## Models

${this.generateModelDocs()}

## Authentication

This API uses JWT for authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer your_token_here
\`\`\`

## Error Handling

All errors follow a standard format:
\`\`\`json
{
  "message": "Error message here"
}
\`\`\`
`;

    // Write to file
    const filePath = path.join(this.outputDir, 'README.md');
    await fs.writeFile(filePath, readmeContent);
  }

  /**
   * Generate documentation for endpoints
   */
  generateEndpointDocs() {
    if (!this.project.dataModel || !this.project.dataModel.nodes) {
      return 'No endpoints available';
    }

    const dataTypeNodes = this.project.dataModel.nodes.filter(
      node => node.type === 'dataType'
    );

    let docs = '';

    for (const node of dataTypeNodes) {
      const routeName = this.formatRouteName(node.data.name);
      
      docs += `### ${this.formatModelName(node.data.name)}\n\n`;
      docs += `- \`GET /api/${routeName}\` - Get all ${routeName}\n`;
      docs += `- \`GET /api/${routeName}/:id\` - Get ${routeName} by ID\n`;
      docs += `- \`POST /api/${routeName}\` - Create a new ${routeName} (requires authentication)\n`;
      docs += `- \`PUT /api/${routeName}/:id\` - Update ${routeName} by ID (requires authentication)\n`;
      docs += `- \`DELETE /api/${routeName}/:id\` - Delete ${routeName} by ID (requires authentication)\n\n`;
    }

    return docs;
  }

  /**
   * Generate documentation for models
   */
  generateModelDocs() {
    if (!this.project.dataModel || !this.project.dataModel.nodes) {
      return 'No models available';
    }

    const dataTypeNodes = this.project.dataModel.nodes.filter(
      node => node.type === 'dataType'
    );

    let docs = '';

    for (const node of dataTypeNodes) {
      const modelName = this.formatModelName(node.data.name);
      const fields = this.getFieldsForModel(node, this.project.dataModel);
      
      docs += `### ${modelName}\n\n`;
      docs += `${node.data.description || ''}\n\n`;
      docs += `| Field | Type | Required | Description |\n`;
      docs += `|-------|------|----------|-------------|\n`;
      
      for (const field of fields) {
        docs += `| ${field.name} | ${field.type} | ${field.required ? 'Yes' : 'No'} | ${field.description || ''} |\n`;
      }
      
      docs += '\n';
    }

    return docs;
  }

  /**
   * Format a model name (e.g., "user" -> "User")
   */
  formatModelName(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Format a route name (e.g., "userProfile" -> "user-profiles")
   */
  formatRouteName(name) {
    // Convert camelCase to kebab-case
    const kebabCase = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    
    // Pluralize
    if (kebabCase.endsWith('y')) {
      return kebabCase.slice(0, -1) + 'ies';
    } else if (kebabCase.endsWith('s') || kebabCase.endsWith('x') || kebabCase.endsWith('z')) {
      return kebabCase + 'es';
    } else {
      return kebabCase + 's';
    }
  }

  /**
   * Format code using prettier
   */
  async formatCode(code, parser = 'babel') {
    try {
      return format(code, {
        parser,
        singleQuote: true,
        trailingComma: 'es5',
        bracketSpacing: true,
        printWidth: 80,
      });
    } catch (error) {
      console.warn('Error formatting code:', error);
      return code; // Return unformatted code if there's an error
    }
  }
}

module.exports = APIGenerator;
