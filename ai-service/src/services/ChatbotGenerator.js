/**
 * ChatbotGenerator.js
 * 
 * This service generates the necessary code and configuration for AI-powered
 * chatbots based on the conversation flow designed in Kickflip Studio.
 */

const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class ChatbotGenerator {
  constructor(project) {
    this.project = project;
    this.outputDir = path.join(__dirname, '../../generated', project._id.toString(), 'chatbot');
    this.promptsDir = path.join(this.outputDir, 'prompts');
    this.handlersDir = path.join(this.outputDir, 'handlers');
  }

  /**
   * Generate all files needed for the chatbot implementation
   */
  async generateAll() {
    try {
      // Create output directories
      await this.createDirectories();
      
      // Generate prompt templates
      await this.generatePromptTemplates();
      
      // Generate conversation flow handlers
      await this.generateConversationHandlers();
      
      // Generate main chatbot controller
      await this.generateChatbotController();
      
      // Generate frontend chat widget
      await this.generateChatWidget();
      
      // Generate README
      await this.generateREADME();
      
      return {
        success: true,
        outputDir: this.outputDir
      };
    } catch (error) {
      console.error('Error generating chatbot code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create output directories
   */
  async createDirectories() {
    const dirs = [
      this.outputDir,
      this.promptsDir,
      this.handlersDir
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
   * Generate prompt templates for different conversation scenarios
   */
  async generatePromptTemplates() {
    // If no conversation flow is defined, use default templates
    if (!this.project.conversation || !this.project.conversation.nodes) {
      await this.generateDefaultPromptTemplates();
      return;
    }
    
    // Extract bot configuration
    const botConfig = this.project.conversation.botConfig || {
      name: 'Shopping Assistant',
      personality: 'friendly',
      responseLength: 1,
      technicalLevel: 1,
      persuasiveLevel: 2,
      offerTiming: 'balanced',
      knowledgeBase: ['products', 'pricing', 'shipping', 'returns']
    };
    
    // Generate base system prompt
    const basePrompt = this.generateBaseSystemPrompt(botConfig);
    
    // Write base prompt to file
    await fs.writeFile(
      path.join(this.promptsDir, 'base_system_prompt.txt'),
      basePrompt
    );
    
    // Generate specialized prompts
    const specializedPrompts = {
      welcome: this.generateWelcomePrompt(botConfig),
      product_recommendation: this.generateProductRecommendationPrompt(botConfig),
      objection_handling: this.generateObjectionHandlingPrompt(botConfig),
      checkout: this.generateCheckoutPrompt(botConfig)
    };
    
    // Write specialized prompts to files
    for (const [name, prompt] of Object.entries(specializedPrompts)) {
      await fs.writeFile(
        path.join(this.promptsDir, `${name}_prompt.txt`),
        prompt
      );
    }
    
    // Generate intent classification prompt
    const intentPrompt = this.generateIntentClassificationPrompt();
    await fs.writeFile(
      path.join(this.promptsDir, 'intent_classification_prompt.txt'),
      intentPrompt
    );
  }

  /**
   * Generate default prompt templates when no conversation flow is defined
   */
  async generateDefaultPromptTemplates() {
    const defaultPrompts = {
      base_system_prompt: `You are a helpful shopping assistant for an e-commerce store. Your goal is to help customers find products, answer their questions, and guide them through the purchasing process. Be friendly, helpful, and concise in your responses.`,
      
      welcome_prompt: `Greet the customer warmly and ask how you can help them today. Keep your response brief and friendly.`,
      
      product_recommendation_prompt: `Recommend products based on the customer's stated preferences. Focus on the key benefits that match their needs. Limit your recommendations to 3 products maximum.`,
      
      objection_handling_prompt: `Address any concerns or objections the customer raises about products or the purchase process. Be empathetic and provide helpful information to overcome their concerns.`,
      
      checkout_prompt: `Guide the customer through the checkout process. Explain any available options clearly and encourage them to complete their purchase.`,
      
      intent_classification_prompt: `Analyze the customer message and identify their primary intent from the following categories:
- greeting: Customer is saying hello or starting the conversation
- product_inquiry: Customer is asking about products or product information
- price_inquiry: Customer is asking about pricing
- shipping_inquiry: Customer is asking about shipping
- return_policy: Customer is asking about returns or refunds
- checkout_help: Customer needs help with the checkout process
- complaint: Customer is expressing dissatisfaction
- general_question: Customer has a general question not covered by other categories

Respond with just the intent category name.`
    };
    
    for (const [name, content] of Object.entries(defaultPrompts)) {
      await fs.writeFile(
        path.join(this.promptsDir, `${name}.txt`),
        content
      );
    }
  }

  /**
   * Generate base system prompt from bot configuration
   */
  generateBaseSystemPrompt(botConfig) {
    // Define personality traits based on configured personality
    const personalityTraits = {
      friendly: 'warm, approachable, and conversational',
      professional: 'polite, respectful, and informative',
      sales: 'persuasive, enthusiastic, and solution-oriented',
      custom: 'tailored to the specific needs of the business'
    };
    
    // Define response length characteristics
    const responseLengths = ['concise and to-the-point', 'balanced and informative', 'detailed and comprehensive'];
    
    // Define technical level characteristics
    const technicalLevels = ['simple and easy to understand', 'moderately technical when needed', 'detailed and technical when appropriate'];
    
    // Define persuasiveness characteristics
    const persuasiveLevels = ['subtly encouraging', 'moderately persuasive', 'strongly convincing'];
    
    // Construct the prompt
    return `You are ${botConfig.name}, an AI shopping assistant for our online store.

PERSONALITY:
You are ${personalityTraits[botConfig.personality] || personalityTraits.friendly}.

RESPONSE STYLE:
- Length: ${responseLengths[botConfig.responseLength] || responseLengths[1]}
- Technical level: ${technicalLevels[botConfig.technicalLevel] || technicalLevels[1]}
- Persuasiveness: ${persuasiveLevels[botConfig.persuasiveLevel] || persuasiveLevels[1]}
- Offer timing: ${botConfig.offerTiming === 'early' ? 'Present offers early in the conversation' : botConfig.offerTiming === 'late' ? 'Present offers only after building rapport' : 'Present offers at appropriate moments'}

KNOWLEDGE BASE:
You have knowledge about: ${botConfig.knowledgeBase.join(', ')}

GOALS:
1. Help customers find the right products for their needs
2. Provide accurate information about products, pricing, and policies
3. Address concerns or objections customers may have
4. Guide customers through the purchasing process
5. Create a positive and helpful shopping experience

CONSTRAINTS:
1. If you don't know something, admit it rather than making up information
2. Keep responses focused on the customer's needs
3. Don't be pushy or overly sales-focused
4. Respect customer privacy and don't ask for personal information

Remember to be helpful, accurate, and focused on providing value to the customer.`;
  }

  /**
   * Generate welcome prompt
   */
  generateWelcomePrompt(botConfig) {
    return `Greet the customer in a ${botConfig.personality} tone. Introduce yourself as ${botConfig.name}, and ask how you can help them today. Keep your greeting concise and welcoming.`;
  }

  /**
   * Generate product recommendation prompt
   */
  generateProductRecommendationPrompt(botConfig) {
    const persuasiveLevel = ['subtly', 'moderately', 'strongly'][botConfig.persuasiveLevel] || 'moderately';
    
    return `Based on the customer's stated preferences and needs, recommend appropriate products from our catalog. Be ${persuasiveLevel} persuasive about the benefits of these products specifically for their situation. Limit recommendations to 3 products maximum.

When recommending products, include:
1. The product name
2. Key features that match their needs
3. How it specifically solves their problem or meets their requirement
4. Price information if available and appropriate

If you need more information to make a good recommendation, ask specific questions to narrow down their needs.`;
  }

  /**
   * Generate objection handling prompt
   */
  generateObjectionHandlingPrompt(botConfig) {
    return `The customer has raised a concern or objection. Address it empathetically and provide helpful information to overcome their concern.

Common objections include:
1. Price concerns
2. Uncertainty about product fit
3. Shipping or delivery concerns
4. Questions about return policy
5. Hesitation about buying online

For each type of objection:
1. Acknowledge their concern as valid
2. Provide factual information that addresses the concern
3. Offer a solution or alternative if appropriate
4. Gently reassure them and move the conversation forward`;
  }

  /**
   * Generate checkout prompt
   */
  generateCheckoutPrompt(botConfig) {
    return `Guide the customer through the checkout process. Explain options clearly and encourage them to complete their purchase. Be helpful with any questions they have about payment methods, shipping options, or other checkout-related concerns.

Remember to:
1. Reassure them about security
2. Explain any special offers or discounts they might be eligible for
3. Clarify shipping costs and estimated delivery times
4. Mention our return policy briefly if appropriate
5. Thank them for their purchase`;
  }

  /**
   * Generate intent classification prompt
   */
  generateIntentClassificationPrompt() {
    return `Analyze the customer message and identify their primary intent from the following categories:
- greeting: Customer is saying hello or starting the conversation
- product_inquiry: Customer is asking about products or product features
- price_inquiry: Customer is asking about pricing
- shipping_inquiry: Customer is asking about shipping
- return_policy: Customer is asking about returns or refunds
- checkout_help: Customer needs help with the checkout process
- objection: Customer is expressing a concern or hesitation
- complaint: Customer is expressing dissatisfaction
- general_question: Customer has a general question not covered by other categories

Respond in JSON format with the detected intent and confidence score:
{
  "intent": "the_detected_intent_category",
  "confidence": 0.95
}`;
  }

  /**
   * Generate conversation flow handlers
   */
  async generateConversationHandlers() {
    // Generate intent handler
    await this.generateIntentHandler();
    
    // Generate conversation flow handler
    await this.generateConversationFlowHandler();
    
    // Generate product recommendation handler
    await this.generateProductRecommendationHandler();
    
    // Generate user state manager
    await this.generateUserStateManager();
  }

  /**
   * Generate intent handler
   */
  async generateIntentHandler() {
    const code = `/**
 * Intent Handler
 * 
 * Analyzes user messages to determine their intent
 */
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load intent classification prompt
const intentPromptPath = path.join(__dirname, '../prompts/intent_classification_prompt.txt');
const intentPrompt = fs.readFileSync(intentPromptPath, 'utf8');

/**
 * Classify the intent of a user message
 * 
 * @param {string} message - The user's message
 * @returns {Promise<{intent: string, confidence: number}>} The detected intent and confidence score
 */
async function classifyIntent(message) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: intentPrompt },
        { role: "user", content: message }
      ],
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content;
    return JSON.parse(content);
  } catch (error) {
    console.error('Error classifying intent:', error);
    return { 
      intent: 'general_question',
      confidence: 0.5
    };
  }
}

/**
 * Map of intents to handlers
 */
const intentHandlers = {
  greeting: require('./welcome-handler'),
  product_inquiry: require('./product-inquiry-handler'),
  price_inquiry: require('./price-inquiry-handler'),
  shipping_inquiry: require('./shipping-inquiry-handler'),
  return_policy: require('./return-policy-handler'),
  checkout_help: require('./checkout-handler'),
  objection: require('./objection-handler'),
  complaint: require('./complaint-handler'),
  general_question: require('./general-question-handler')
};

/**
 * Get the appropriate handler for an intent
 * 
 * @param {string} intent - The detected intent
 * @returns {Function} The handler function for that intent
 */
function getHandlerForIntent(intent) {
  return intentHandlers[intent] || intentHandlers.general_question;
}

module.exports = {
  classifyIntent,
  getHandlerForIntent
};`;

    await fs.writeFile(path.join(this.handlersDir, 'intent-handler.js'), code);
  }

  /**
   * Generate conversation flow handler
   */
  async generateConversationFlowHandler() {
    const code = `/**
 * Conversation Flow Handler
 * 
 * Manages the flow of the conversation based on the detected intent and user state
 */
const { classifyIntent, getHandlerForIntent } = require('./intent-handler');
const { getUserState, updateUserState } = require('./user-state-manager');
const { getProductRecommendations } = require('./product-recommendation-handler');

/**
 * Process a user message and generate a response
 * 
 * @param {string} userId - The user's ID
 * @param {string} message - The user's message
 * @returns {Promise<{response: string, actions: Array}>} The bot's response and any actions
 */
async function processMessage(userId, message) {
  try {
    // Get the current user state
    const userState = await getUserState(userId);
    
    // Classify the user's intent
    const { intent, confidence } = await classifyIntent(message);
    
    // Update the user state with the new intent
    await updateUserState(userId, {
      lastIntent: intent,
      lastMessage: message,
      messageCount: (userState.messageCount || 0) + 1
    });
    
    // Get the appropriate handler for this intent
    const handler = getHandlerForIntent(intent);
    
    // Process the message with the handler
    const result = await handler(message, userState);
    
    // Check if we should offer product recommendations
    let actions = result.actions || [];
    if (shouldOfferRecommendations(intent, userState)) {
      const recommendations = await getProductRecommendations(message, userState);
      if (recommendations && recommendations.length > 0) {
        actions = [...actions, {
          type: 'product_recommendations',
          products: recommendations
        }];
      }
    }
    
    return {
      response: result.response,
      actions
    };
  } catch (error) {
    console.error('Error processing message:', error);
    return {
      response: "I'm sorry, I'm having trouble processing your request right now. Can you try again?",
      actions: []
    };
  }
}

/**
 * Determine if we should offer product recommendations
 * 
 * @param {string} intent - The detected intent
 * @param {Object} userState - The user's state
 * @returns {boolean} Whether to offer recommendations
 */
function shouldOfferRecommendations(intent, userState) {
  // If the intent is directly product related, always recommend
  if (intent === 'product_inquiry') {
    return true;
  }
  
  // Check offer timing based on conversation stage
  const offerTiming = process.env.OFFER_TIMING || 'balanced';
  const messageCount = userState.messageCount || 0;
  
  if (offerTiming === 'early') {
    return messageCount >= 2; // Recommend after 2 messages
  } else if (offerTiming === 'balanced') {
    return messageCount >= 3; // Recommend after 3 messages
  } else {
    return messageCount >= 5; // Recommend after 5 messages
  }
}

module.exports = {
  processMessage
};`;

    await fs.writeFile(path.join(this.handlersDir, 'conversation-flow-handler.js'), code);
  }

  /**
   * Generate product recommendation handler
   */
  async generateProductRecommendationHandler() {
    const code = `/**
 * Product Recommendation Handler
 * 
 * Provides product recommendations based on user preferences
 */
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load recommendation prompt
const promptPath = path.join(__dirname, '../prompts/product_recommendation_prompt.txt');
const recommendationPrompt = fs.readFileSync(promptPath, 'utf8');

/**
 * Get product recommendations based on user message and state
 * 
 * @param {string} message - The user's message
 * @param {Object} userState - The user's state
 * @returns {Promise<Array>} List of recommended products
 */
async function getProductRecommendations(message, userState) {
  try {
    // Create a prompt with context from the user state
    const conversationContext = userState.conversationHistory || [];
    const userPreferences = userState.preferences || {};
    
    const contextPrompt = \`
User message: ${message}

User preferences:
${Object.entries(userPreferences).map(([key, value]) => \`- ${key}: ${value}\`).join('\\n')}

Conversation history:
${conversationContext.slice(-5).map(msg => \`\${msg.role}: \${msg.content}\`).join('\\n')}
\`;

    // Get recommendations from OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: recommendationPrompt },
        { role: "user", content: contextPrompt }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the recommendations
    const content = response.choices[0].message.content;
    const result = JSON.parse(content);
    
    return result.recommendations || [];
  } catch (error) {
    console.error('Error getting product recommendations:', error);
    return [];
  }
}

module.exports = {
  getProductRecommendations
};`;

    await fs.writeFile(path.join(this.handlersDir, 'product-recommendation-handler.js'), code);
  }

  /**
   * Generate user state manager
   */
  async generateUserStateManager() {
    const code = `/**
 * User State Manager
 * 
 * Manages the state of users during conversations
 */

// In a production environment, this would use a database
const userStates = new Map();

/**
 * Get the current state for a user
 * 
 * @param {string} userId - The user's ID
 * @returns {Object} The user's state
 */
function getUserState(userId) {
  if (!userStates.has(userId)) {
    // Initialize with default state
    userStates.set(userId, {
      conversationHistory: [],
      preferences: {},
      lastIntent: null,
      lastMessage: null,
      messageCount: 0,
      stage: 'greeting',
      createdAt: new Date()
    });
  }
  
  return userStates.get(userId);
}

/**
 * Update a user's state
 * 
 * @param {string} userId - The user's ID
 * @param {Object} updates - The updates to apply
 * @returns {Object} The updated user state
 */
function updateUserState(userId, updates) {
  const currentState = getUserState(userId);
  
  // Apply updates
  const newState = {
    ...currentState,
    ...updates,
    updatedAt: new Date()
  };
  
  // Update conversation history if there's a new message
  if (updates.lastMessage && !currentState.conversationHistory.some(msg => 
    msg.role === 'user' && msg.content === updates.lastMessage
  )) {
    newState.conversationHistory = [
      ...currentState.conversationHistory,
      { role: 'user', content: updates.lastMessage, timestamp: new Date() }
    ];
  }
  
  // Determine conversation stage based on message count and intent
  newState.stage = determineConversationStage(newState);
  
  // Update the state
  userStates.set(userId, newState);
  
  return newState;
}

/**
 * Add a bot response to the conversation history
 * 
 * @param {string} userId - The user's ID
 * @param {string} response - The bot's response
 * @returns {Object} The updated user state
 */
function addBotResponse(userId, response) {
  const currentState = getUserState(userId);
  
  const newState = {
    ...currentState,
    conversationHistory: [
      ...currentState.conversationHistory,
      { role: 'assistant', content: response, timestamp: new Date() }
    ],
    updatedAt: new Date()
  };
  
  userStates.set(userId, newState);
  
  return newState;
}

/**
 * Determine the conversation stage based on state
 * 
 * @param {Object} state - The user's state
 * @returns {string} The conversation stage
 */
function determineConversationStage(state) {
  const { messageCount, lastIntent } = state;
  
  if (messageCount <= 1) {
    return 'greeting';
  }
  
  if (lastIntent === 'checkout_help') {
    return 'checkout';
  }
  
  if (lastIntent === 'product_inquiry' || lastIntent === 'price_inquiry') {
    return 'product_discovery';
  }
  
  if (lastIntent === 'objection') {
    return 'objection_handling';
  }
  
  if (messageCount >= 5) {
    return 'engagement';
  }
  
  return 'information';
}

module.exports = {
  getUserState,
  updateUserState,
  addBotResponse
};`;

    await fs.writeFile(path.join(this.handlersDir, 'user-state-manager.js'), code);
  }

  /**
   * Generate main chatbot controller
   */
  async generateChatbotController() {
    const code = `/**
 * Chatbot Controller
 * 
 * Main entry point for the chatbot functionality
 */
const express = require('express');
const router = express.Router();
const { processMessage } = require('./handlers/conversation-flow-handler');
const { addBotResponse } = require('./handlers/user-state-manager');
const { v4: uuidv4 } = require('uuid');

/**
 * Start a new conversation
 * 
 * @route POST /api/chatbot/conversations
 */
router.post('/conversations', (req, res) => {
  try {
    const conversationId = uuidv4();
    
    res.json({
      conversationId,
      message: 'Conversation started'
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({ error: 'Failed to start conversation' });
  }
});

/**
 * Send a message to the chatbot
 * 
 * @route POST /api/chatbot/conversations/:conversationId/messages
 */
router.post('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Process the message
    const result = await processMessage(conversationId, message);
    
    // Add the bot's response to the conversation history
    await addBotResponse(conversationId, result.response);
    
    res.json({
      response: result.response,
      actions: result.actions
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

/**
 * End a conversation
 * 
 * @route POST /api/chatbot/conversations/:conversationId/end
 */
router.post('/conversations/:conversationId/end', (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // In a real implementation, you would clean up resources here
    
    res.json({
      message: 'Conversation ended'
    });
  } catch (error) {
    console.error('Error ending conversation:', error);
    res.status(500).json({ error: 'Failed to end conversation' });
  }
});

module.exports = router;`;

    await fs.writeFile(path.join(this.outputDir, 'chatbot-controller.js'), code);
  }

  /**
   * Generate frontend chat widget
   */
  async generateChatWidget() {
    const code = `/**
 * Chat Widget Component
 * 
 * Frontend component for the chatbot interface
 */
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Chat Widget CSS
const styles = {
  chatContainer: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '350px',
    height: '500px',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #e0e0e0',
    borderRadius: '10px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    backgroundColor: '#fff',
    zIndex: 1000,
    overflow: 'hidden',
  },
  chatHeader: {
    padding: '15px',
    backgroundColor: '#4a90e2',
    color: '#fff',
    fontWeight: 'bold',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMessages: {
    flex: 1,
    overflowY: 'auto',
    padding: '15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#e2f2ff',
    padding: '8px 12px',
    borderRadius: '18px 18px 0 18px',
    maxWidth: '80%',
    wordBreak: 'break-word',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    padding: '8px 12px',
    borderRadius: '18px 18px 18px 0',
    maxWidth: '80%',
    wordBreak: 'break-word',
  },
  productCard: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '10px',
    marginTop: '5px',
    backgroundColor: '#f9f9f9',
  },
  inputContainer: {
    display: 'flex',
    padding: '10px',
    borderTop: '1px solid #e0e0e0',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #e0e0e0',
    borderRadius: '20px',
    outline: 'none',
  },
  sendButton: {
    marginLeft: '10px',
    padding: '8px 15px',
    backgroundColor: '#4a90e2',
    color: '#fff',
    border: 'none',
    borderRadius: '20px',
    cursor: 'pointer',
  },
  typingIndicator: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f0f0',
    padding: '8px 12px',
    borderRadius: '18px 18px 18px 0',
    display: 'flex',
    gap: '3px',
  },
  dot: {
    width: '6px',
    height: '6px',
    backgroundColor: '#888',
    borderRadius: '50%',
    display: 'inline-block',
    margin: '0 1px',
    animation: 'dotAnimation 1.4s infinite ease-in-out',
  },
};

const ChatWidget = ({ botName = 'Shopping Assistant' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize conversation when component mounts
  useEffect(() => {
    if (isOpen && !conversationId) {
      startConversation();
    }
  }, [isOpen, conversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startConversation = async () => {
    try {
      const response = await axios.post('/api/chatbot/conversations');
      setConversationId(response.data.conversationId);
      
      // Add welcome message
      setMessages([{
        id: Date.now(),
        text: `Hi there! I'm ${botName}. How can I help you today?`,
        sender: 'bot',
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setMessages([{
        id: Date.now(),
        text: 'Sorry, I'm having trouble connecting. Please try again later.',
        sender: 'bot',
        timestamp: new Date()
      }]);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !conversationId) return;
    
    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message to chat
    setMessages(prev => [...prev, {
      id: Date.now(),
      text: userMessage,
      sender: 'user',
      timestamp: new Date()
    }]);
    
    setIsLoading(true);
    
    try {
      const response = await axios.post(`/api/chatbot/conversations/${conversationId}/messages`, {
        message: userMessage
      });
      
      // Add bot response to chat
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: response.data.response,
        sender: 'bot',
        timestamp: new Date(),
        actions: response.data.actions
      }]);
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Add error message to chat
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        sender: 'bot',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  // Render product recommendations if available
  const renderProductRecommendations = (actions) => {
    if (!actions) return null;
    
    const productRecommendations = actions.find(action => action.type === 'product_recommendations');
    
    if (!productRecommendations || !productRecommendations.products) return null;
    
    return (
      <div>
        <p><strong>Recommended Products:</strong></p>
        {productRecommendations.products.map((product, index) => (
          <div key={index} style={styles.productCard}>
            <h4>{product.name}</h4>
            <p>{product.description}</p>
            <p><strong>${product.price}</strong></p>
            <button 
              onClick={() => window.location.href = product.url || '/product/' + product.id}
              style={{
                backgroundColor: '#4a90e2',
                color: '#fff',
                border: 'none',
                padding: '5px 10px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              View Product
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Chat toggle button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          backgroundColor: '#4a90e2',
          color: '#fff',
          border: 'none',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
          cursor: 'pointer',
          fontSize: '24px',
          display: isOpen ? 'none' : 'block',
          zIndex: 1000
        }}
      >
        💬
      </button>
      
      {/* Chat container */}
      {isOpen && (
        <div style={styles.chatContainer}>
          <div style={styles.chatHeader}>
            <span>{botName}</span>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                backgroundColor: 'transparent',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
          
          <div style={styles.chatMessages}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={message.sender === 'user' ? styles.userMessage : styles.botMessage}
              >
                <div>{message.text}</div>
                {message.actions && renderProductRecommendations(message.actions)}
              </div>
            ))}
            
            {isLoading && (
              <div style={styles.typingIndicator}>
                <span style={styles.dot}></span>
                <span style={{...styles.dot, animationDelay: '0.2s'}}></span>
                <span style={{...styles.dot, animationDelay: '0.4s'}}></span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <div style={styles.inputContainer}>
            <input
              type="text"
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              style={styles.input}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              style={styles.sendButton}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;`;

    await fs.writeFile(path.join(this.outputDir, 'ChatWidget.jsx'), code);
  }

  /**
   * Generate README
   */
  async generateREADME() {
    const readmeContent = `# ${this.project.name} - Chatbot

This AI-powered chatbot was automatically generated by Kickflip Studio.

## Setup

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Create a \`.env\` file with the following variables:
   \`\`\`
   OPENAI_API_KEY=your_openai_api_key
   OFFER_TIMING=balanced
   \`\`\`

3. Add the chatbot routes to your Express app:
   \`\`\`javascript
   const chatbotController = require('./chatbot/chatbot-controller');
   app.use('/api/chatbot', chatbotController);
   \`\`\`

4. Integrate the chat widget into your frontend:
   \`\`\`javascript
   import ChatWidget from './chatbot/ChatWidget';

   function App() {
     return (
       <div>
         {/* Your app content */}
         <ChatWidget botName="${this.project.conversation?.botConfig?.name || 'Shopping Assistant'}" />
       </div>
     );
   }
   \`\`\`

## Customization

### Prompts

Customize the chatbot's behavior by editing the prompt files in the \`prompts\` directory:

- \`base_system_prompt.txt\`: Sets the overall personality and behavior
- \`welcome_prompt.txt\`: Controls the greeting message
- \`product_recommendation_prompt.txt\`: Guides product recommendations
- \`objection_handling_prompt.txt\`: Manages responses to customer objections
- \`checkout_prompt.txt\`: Guides the checkout process

### Handlers

The chatbot uses several handler modules that can be customized:

- \`intent-handler.js\`: Classifies user intents
- \`conversation-flow-handler.js\`: Manages the overall conversation flow
- \`product-recommendation-handler.js\`: Generates product recommendations
- \`user-state-manager.js\`: Manages user state during conversations

## API Endpoints

- \`POST /api/chatbot/conversations\`: Start a new conversation
- \`POST /api/chatbot/conversations/:conversationId/messages\`: Send a message
- \`POST /api/chatbot/conversations/:conversationId/end\`: End a conversation

## AI Capabilities

This chatbot uses the OpenAI API for:

1. Intent classification
2. Response generation
3. Product recommendations
4. Objection handling

## Performance Optimization

For production use:

1. Consider caching common responses
2. Implement a rate limiting strategy
3. Add monitoring and error tracking
4. Use a database for user state management instead of in-memory storage

## Extending

Add new capabilities by:

1. Creating new prompt templates in the \`prompts\` directory
2. Implementing new handlers in the \`handlers\` directory
3. Extending the controller with new endpoints
4. Customizing the chat widget with additional features
`;

    // Write to file
    const filePath = path.join(this.outputDir, 'README.md');
    await fs.writeFile(filePath, readmeContent);
  }
}

module.exports = ChatbotGenerator;/**
 * ChatbotGenerator.js
 * 
 * This service generates the necessary code and configuration for AI-powered
 * chatbots based on the conversation flow designed in Kickflip Studio.
 */

const fs = require('fs').promises;
const path = require('path');
const { OpenAI } = require('openai');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class ChatbotGenerator {
  constructor(project) {
    this.project = project;
    this.outputDir = path.join(__dirname, '../../generated', project._id.toString(), 'chatbot');
    this.promptsDir = path.join(this.outputDir, 'prompts');
    this.handlersDir = path.join(this.outputDir, 'handlers');
  }

  /**
   * Generate all files needed for the chatbot implementation
   */
  async generateAll() {
    try {
      // Create output directories
      await this.createDirectories();
      
      // Generate prompt templates
      await this.generatePromptTemplates();
      
      // Generate conversation flow handlers
      await this.generateConversationHandlers();
      
      // Generate main chatbot controller
      await this.generateChatbotController();
      
      // Generate frontend chat widget
      await this.generateChatWidget();
      
      // Generate README
      await this.generateREADME();
      
      return {
        success: true,
        outputDir: this.outputDir
      };
    } catch (error) {
      console.error('Error generating chatbot code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create output directories
   */
  async createDirectories() {
    const dirs = [
      this.outputDir,
      this.promptsDir,
      this.handlersDir
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
   * Generate prompt templates for different conversation scenarios
   */
  async generatePromptTemplates() {
    // If no conversation flow is defined, use default templates
    if (!this.project.conversation || !this.project.conversation.nodes) {
      await this.generateDefaultPromptTemplates();
      return;
    }
    
    // Extract bot configuration
    const botConfig = this.project.conversation.botConfig || {
      name: 'Shopping Assistant',
      personality: 'friendly',
      responseLength: 1,
      technicalLevel: 1,
      persuasiveLevel: 2,
      offerTiming: 'balanced',
      knowledgeBase: ['products', 'pricing', 'shipping', 'returns']
    };
    
    // Generate base system prompt
    const basePrompt = this.generateBaseSystemPrompt(botConfig);
    
    // Write base prompt to file
    await fs.writeFile(
      path.join(this.promptsDir, 'base_system_prompt.txt'),
      basePrompt
    );
    
    // Generate specialized prompts
    const specializedPrompts = {
      welcome: this.generateWelcomePrompt(botConfig),
      product_recommendation: this.generateProductRecommendationPrompt(botConfig),
      objection_handling: this.generateObjectionHandlingPrompt(botConfig),
      checkout: this.generateCheckoutPrompt(botConfig)
    };
    
    // Write specialized prompts to files
    for (const [name, prompt] of Object.entries(specializedPrompts)) {
      await fs.writeFile(
        path.join(this.promptsDir, `${name}_prompt.txt`),
        prompt
      );
    }
    
    // Generate intent classification prompt
    const intentPrompt = this.generateIntentClassificationPrompt();
    await fs.writeFile(
      path.join(this.promptsDir, 'intent_classification_prompt.txt'),
      intentPrompt
    );
  }

  /**
   * Generate default prompt templates when no conversation flow is defined
   */
  async generateDefaultPromptTemplates() {
    const defaultPrompts = {
      base_system_prompt: `You are a helpful shopping assistant for an e-commerce store. Your goal is to help customers find products, answer their questions, and guide them through the purchasing process. Be friendly, helpful, and concise in your responses.`,
      
      welcome_prompt: `Greet the customer warmly and ask how you can help them today. Keep your response brief and friendly.`,
      
      product_recommendation_prompt: `Recommend products based on the customer's stated preferences. Focus on the key benefits that match their needs. Limit your recommendations to 3 products maximum.`,
      
      objection_handling_prompt: `Address any concerns or objections the customer raises about products or the purchase process. Be empathetic and provide helpful information to overcome their concerns.`,
      
      checkout_prompt: `Guide the customer through the checkout process. Explain any available options clearly and encourage them to complete their purchase.`,
      
      intent_classification_prompt: `Analyze the customer message and identify their primary intent from the following categories:
- greeting: Customer is saying hello or starting the conversation
- product_inquiry: Customer is
