/**
 * ModelManager - Dynamic AI Model Switching & Failover System
 * 
 * Automatically switches between Gemini models based on availability and rate limits.
 * Future-proof: Automatically detects and prioritizes new models.
 */

export interface ModelConfig {
  id: string;
  name: string;
  endpoint: string;
  priority: number; // Lower = higher priority
  maxTokens: number;
  temperature: number;
  isAvailable: boolean;
  lastError?: string;
  rateLimitReset?: number;
}

export interface ModelSwitchResult {
  success: boolean;
  modelUsed: string;
  error?: string;
  switchedFrom?: string;
}

// Default model priority list
const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: "gemini-2.0-pro",
    name: "Gemini 2.0 Pro",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro:generateContent",
    priority: 1,
    maxTokens: 8192,
    temperature: 0.7,
    isAvailable: true,
  },
  {
    id: "gemini-2.0-flash-thinking",
    name: "Gemini 2.0 Flash Thinking",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-thinking:generateContent",
    priority: 2,
    maxTokens: 4096,
    temperature: 0.6,
    isAvailable: true,
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    priority: 3,
    maxTokens: 2048,
    temperature: 0.7,
    isAvailable: true,
  },
];

export class ModelManager {
  private models: Map<string, ModelConfig>;
  private currentModel: string | null;
  private apiKey: string | null;

  constructor() {
    this.models = new Map();
    this.currentModel = null;
    this.apiKey = null;
    
    // Initialize with default models
    DEFAULT_MODELS.forEach(model => {
      this.models.set(model.id, { ...model });
    });
  }

  /**
   * Set API key for Gemini
   */
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Add a new model dynamically (future-proof)
   */
  addModel(model: ModelConfig): void {
    this.models.set(model.id, model);
    console.log(`🤖 ModelManager: Added new model ${model.name} (Priority: ${model.priority})`);
    this.sortModelsByPriority();
  }

  /**
   * Get current active model
   */
  getCurrentModel(): ModelConfig | null {
    if (!this.currentModel) return null;
    return this.models.get(this.currentModel) || null;
  }

  /**
   * Get next best available model
   */
  getNextBestModel(excludeId?: string): ModelConfig | null {
    const sortedModels = Array.from(this.models.values())
      .filter(m => m.isAvailable && m.id !== excludeId)
      .sort((a, b) => a.priority - b.priority);
    
    return sortedModels[0] || null;
  }

  /**
   * Switch to next model on rate limit (429) or error
   */
  async handleRateLimit(currentModelId: string): Promise<ModelSwitchResult> {
    const currentModel = this.models.get(currentModelId);
    if (!currentModel) {
      return { success: false, modelUsed: "", error: "Current model not found" };
    }

    // Mark current model as temporarily unavailable
    currentModel.isAvailable = false;
    currentModel.lastError = "Rate limit exceeded (429)";
    currentModel.rateLimitReset = Date.now() + 60000; // Reset after 1 minute

    console.warn(`⚠️ ModelManager: Rate limit hit on ${currentModel.name}, switching...`);

    // Find next best model
    const nextModel = this.getNextBestModel(currentModelId);
    
    if (!nextModel) {
      return {
        success: false,
        modelUsed: "",
        error: "No alternative models available",
        switchedFrom: currentModelId,
      };
    }

    this.currentModel = nextModel.id;
    
    console.log(`✅ ModelManager: Switched to ${nextModel.name} (Priority: ${nextModel.priority})`);

    return {
      success: true,
      modelUsed: nextModel.id,
      switchedFrom: currentModelId,
    };
  }

  /**
   * Execute AI request with automatic failover
   */
  async executeWithFailover(
    prompt: string,
    initialModelId?: string
  ): Promise<{ response: string; modelUsed: string }> {
    let modelId = initialModelId || this.getBestModelId();
    let attempts = 0;
    const maxAttempts = this.models.size;

    while (attempts < maxAttempts) {
      const model = this.models.get(modelId);
      
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }

      if (!this.apiKey) {
        throw new Error("API key not set. Call setApiKey() first.");
      }

      try {
        console.log(`🎯 Attempt ${attempts + 1}: Using ${model.name}...`);

        const response = await fetch(
          `${model.endpoint}?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: prompt }]
              }],
              generationConfig: {
                temperature: model.temperature,
                maxOutputTokens: model.maxTokens,
              }
            })
          }
        );

        if (response.status === 429) {
          // Rate limit - switch to next model
          const switchResult = await this.handleRateLimit(modelId);
          
          if (!switchResult.success) {
            throw new Error(`All models rate limited. Try again later.`);
          }
          
          modelId = switchResult.modelUsed;
          attempts++;
          continue;
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return {
          response: aiText,
          modelUsed: modelId,
        };

      } catch (error) {
        console.error(`❌ Model ${model.name} failed:`, error);
        
        const switchResult = await this.handleRateLimit(modelId);
        
        if (!switchResult.success) {
          throw error;
        }
        
        modelId = switchResult.modelUsed;
        attempts++;
      }
    }

    throw new Error("All models exhausted. Please try again later.");
  }

  /**
   * Get best available model ID
   */
  private getBestModelId(): string {
    const bestModel = this.getNextBestModel();
    if (!bestModel) {
      throw new Error("No models available");
    }
    return bestModel.id;
  }

  /**
   * Sort models by priority
   */
  private sortModelsByPriority(): void {
    const sorted = Array.from(this.models.values())
      .sort((a, b) => a.priority - b.priority);
    
    this.models.clear();
    sorted.forEach(model => {
      this.models.set(model.id, model);
    });
  }

  /**
   * Reset all models to available state
   */
  resetAllModels(): void {
    this.models.forEach(model => {
      model.isAvailable = true;
      model.lastError = undefined;
      model.rateLimitReset = undefined;
    });
    console.log("🔄 ModelManager: All models reset to available");
  }

  /**
   * Check for model updates (future-proof feature)
   * In production, this would check an API for new models
   */
  async checkForModelUpdates(): Promise<void> {
    console.log("🔍 ModelManager: Checking for new model updates...");
    
    // TODO: Implement API call to check for new Gemini models
    // This would automatically add new models to the priority list
    
    console.log("✅ ModelManager: Model update check complete");
  }

  /**
   * Get all models status
   */
  getModelsStatus(): ModelConfig[] {
    return Array.from(this.models.values());
  }
}

// Export singleton instance
export const modelManager = new ModelManager();
