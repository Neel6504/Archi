import { useState, useRef, useEffect } from 'react'
import Groq from 'groq-sdk'
import ReactMarkdown from 'react-markdown'
import './App.css'

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
})

// Allowed topic categories - MODIFY THIS ARRAY TO RESTRICT DOMAINS
const ALLOWED_TOPICS = [
  'programming', 'software development', 'web development', 'mobile development',
  'data science', 'machine learning', 'artificial intelligence', 'cybersecurity',
  'cloud computing', 'devops', 'blockchain', 'game development',
  'ui/ux design', 'graphic design', '3d modeling', 'digital art',
  'business analysis', 'project management', 'digital marketing', 'seo',
  'data analysis', 'database management', 'networking', 'system administration'
]

// Restricted topics - explicitly blocked
const RESTRICTED_TOPICS = [
  'medical', 'health', 'diagnosis', 'treatment', 'medicine', 'healthcare',
  'legal advice', 'financial advice', 'investment', 'trading', 'gambling',
  'weapons', 'explosives', 'drugs', 'illegal activities'
]

const SYSTEM_PROMPT = `You are an expert Learning Strategist and Curriculum Designer. Your goal is to create hyper-personalized, step-by-step roadmaps for users to achieve specific skill or career goals.

**TOPIC RESTRICTIONS:**
You can ONLY help with goals related to: ${ALLOWED_TOPICS.join(', ')}.

You CANNOT help with: ${RESTRICTED_TOPICS.join(', ')}.

If a user's goal is outside your allowed topics, politely decline and suggest they focus on professional/technical skills within your domain.

**YOUR PROCESS:**

### STEP 1: DATA COLLECTION
Ask these three questions ONE BY ONE:

1. **The Dream Goal:** What exactly do you want to achieve? (e.g., "Become a Senior Python Developer," "Master React.js," "Learn Cloud Architecture").
2. **Time Commitment:** How much time can you realistically dedicate to this per day (in hours)?
3. **Current Proficiency:** What is your current level? (Absolute Beginner, Intermediate, or Advanced). Please briefly describe what you already know.

**STOP after asking these questions and wait for responses.**

### STEP 2: THE STRATEGIC ROADMAP
Once you have all three answers, generate a comprehensive roadmap with this exact structure:

**1. Executive Summary:**
* Estimated timeline to achieve the goal based on their daily availability.
* Key milestones.

**2. The Curriculum (Broken down by Phase):**
* *Phase 1: Foundation*
* *Phase 2: Skill Application*
* *Phase 3: Mastery & Portfolio*
* *Adjust phases based on goal complexity.*

**3. Weekly Routine:**
* A specific day-by-day study schedule that fits their time commitment (e.g., "Hour 1: Theory, Hour 2: Practice").

**4. High-Quality Resources:**
* List specific, top-tier websites, courses (free and paid), documentation, or YouTube channels relevant to each phase.
* Only recommend reputable and up-to-date sources.

**5. Capstone Projects:**
* List 2-3 real-world projects they should build to prove they've reached the goal.

Be thorough, actionable, and personalized based on their current level and time availability.`

// Topic validation function
const validateTopic = (userInput) => {
  const lowerInput = userInput.toLowerCase()
  
  // Check for restricted topics first
  const hasRestrictedTopic = RESTRICTED_TOPICS.some(topic => 
    lowerInput.includes(topic.toLowerCase())
  )
  
  if (hasRestrictedTopic) {
    return {
      isValid: false,
      message: '🚫 **Topic Restriction**\n\nI cannot assist with this topic as it falls outside my allowed domains. I can only help with professional and technical skills such as:\n\n' + 
        ALLOWED_TOPICS.slice(0, 10).join(', ') + ', and more.\n\n' +
        'Please share a career or skill goal related to technology, design, or business.'
    }
  }
  
  // Check if it's in allowed topics (more lenient matching)
  const hasAllowedTopic = ALLOWED_TOPICS.some(topic => 
    lowerInput.includes(topic.toLowerCase()) || 
    topic.toLowerCase().includes(lowerInput.split(' ')[0])
  )
  
  // Keywords that suggest technical/professional learning
  const professionalKeywords = [
    'learn', 'become', 'master', 'developer', 'engineer', 'designer',
    'programming', 'coding', 'software', 'app', 'web', 'data',
    'career', 'skill', 'certification', 'course', 'training'
  ]
  
  const hasProfessionalIntent = professionalKeywords.some(keyword => 
    lowerInput.includes(keyword)
  )
  
  if (!hasAllowedTopic && !hasProfessionalIntent) {
    return {
      isValid: false,
      message: '⚠️ **Unclear Goal or Outside Scope**\n\nI specialize in creating learning roadmaps for:\n\n' +
        '• **Technology:** ' + ALLOWED_TOPICS.filter(t => t.includes('development') || t.includes('programming')).join(', ') + '\n' +
        '• **Design:** UI/UX design, graphic design, 3D modeling\n' +
        '• **Business Skills:** Project management, data analysis, digital marketing\n\n' +
        'Please describe your goal in one of these areas. For example:\n' +
        '- "I want to become a Full-Stack Web Developer"\n' +
        '- "I want to learn Machine Learning from scratch"\n' +
        '- "I want to master UI/UX Design"'
    }
  }
  
  return { isValid: true }
}

function App() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 **Welcome to Your Personal Learning Strategist!**\n\nI create hyper-personalized, step-by-step roadmaps to help you achieve your career and skill goals.\n\n**I can help with:**\n• Programming & Software Development\n• Data Science & AI/ML\n• UI/UX & Graphic Design\n• Cloud Computing & DevOps\n• Digital Marketing & Business Skills\n• And many more technical/professional areas!\n\n---\n\nLet\'s begin! Please answer this first question:\n\n**1. What is your Dream Goal?**\n\nBe specific! (e.g., "Become a Senior Python Developer," "Master React.js and Build Production Apps," "Learn Cloud Architecture on AWS")'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [isLoading])

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: '👋 **Welcome to Your Personal Learning Strategist!**\n\nI create hyper-personalized, step-by-step roadmaps to help you achieve your career and skill goals.\n\n**I can help with:**\n• Programming & Software Development\n• Data Science & AI/ML\n• UI/UX & Graphic Design\n• Cloud Computing & DevOps\n• Digital Marketing & Business Skills\n• And many more technical/professional areas!\n\n---\n\nLet\'s begin! Please answer this first question:\n\n**1. What is your Dream Goal?**\n\nBe specific! (e.g., "Become a Senior Python Developer," "Master React.js and Build Production Apps," "Learn Cloud Architecture on AWS")'
      }
    ])
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = { role: 'user', content: input }
    
    // Validate topic on first user message (the goal)
    if (messages.length === 1) {  // Only initial assistant message exists
      const validation = validateTopic(input)
      if (!validation.isValid) {
        setMessages(prev => [...prev, userMessage, {
          role: 'assistant',
          content: validation.message
        }])
        setInput('')
        return
      }
    }
    
    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setIsLoading(true)

    try {
      // Build messages for Groq API with system prompt
      const chatMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: userMessage.content }
      ]

      const completion = await groq.chat.completions.create({
        messages: chatMessages,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 1024
      })

      const assistantMessage = {
        role: 'assistant',
        content: completion.choices[0].message.content
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      
      let errorMessage = 'Sorry, I encountered an error. Please try again.'
      
      // Check for rate limit or overload errors
      if (error.message?.includes('overloaded') || error.message?.includes('503')) {
        errorMessage = '⚠️ The AI model is currently overloaded. Please wait a minute and try again. (Free tier has limited requests per minute)'
      } else if (error.message?.includes('429') || error.message?.includes('quota')) {
        errorMessage = '⚠️ Rate limit reached. You can only make 5 requests per minute and 20 per day on the free tier. Please wait before trying again.'
      }
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessage
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <div className="header-text">
            <h1>🤖 AI Scheduler</h1>
            <p className="header-subtitle">
              Personalized roadmaps for tech, design, and business skills
            </p>
          </div>
          <button 
            className="clear-chat-btn"
            onClick={clearChat}
            title="Reset conversation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
            </svg>
          </button>
        </div>
        <div className="header-animation"></div>
      </div>
      
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.role}`}
          >
            <div className="message-bubble">
              <div className="message-content">
                {message.role === 'assistant' ? (
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                ) : (
                  message.content
                )}
              </div>
              {message.role === 'assistant' && (
                <button 
                  className="copy-btn"
                  onClick={() => copyToClipboard(message.content, index)}
                  title="Copy to clipboard"
                >
                  {copiedIndex === index ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message assistant">
            <div className="message-content typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input-form">
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your answer here..."
            disabled={isLoading}
            className="chat-input"
            maxLength={500}
          />
          <span className="char-counter">{input.length}/500</span>
        </div>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="send-button"
        >
          {isLoading ? (
            <div className="button-spinner"></div>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          )}
        </button>
      </form>
    </div>
  )
}

export default App
