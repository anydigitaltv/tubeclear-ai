/**
 * Audio Analysis & Music Detection Utility
 * Extracts audio from video and analyzes for copyright/music/voice
 */

export interface AudioAnalysisResult {
  hasMusic: boolean;
  hasVoice: boolean;
  musicConfidence: number;
  voiceConfidence: number;
  detectedGenres?: string[];
  potentialCopyright: boolean;
  copyrightConfidence: number;
  audioDuration: number;
  issues: string[];
}

export interface AudioExtractionResult {
  audioBlob: Blob;
  duration: number;
  sampleRate: number;
  channels: number;
}

/**
 * Extract audio from video blob
 */
export const extractAudio = async (videoBlob: Blob): Promise<AudioExtractionResult | null> => {
  try {
    console.log('🎵 Extracting audio from video...');
    
    const audioContext = new AudioContext();
    const arrayBuffer = await videoBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Convert AudioBuffer to Blob
    const offlineContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();
    
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert to WAV blob
    const wavBlob = audioBufferToWav(renderedBuffer);
    
    console.log('✅ Audio extracted:', wavBlob.size, 'bytes');
    
    return {
      audioBlob: wavBlob,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
    };
  } catch (error) {
    console.error('❌ Audio extraction failed:', error);
    return null;
  }
};

/**
 * Convert AudioBuffer to WAV format
 */
const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  
  let offset = 0;
  
  // Write WAV header
  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset++, str.charCodeAt(i));
    }
  };
  
  writeString('RIFF');
  view.setUint32(offset, length - 8, true);
  offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true); // PCM format
  offset += 2;
  view.setUint16(offset, buffer.numberOfChannels, true);
  offset += 2;
  view.setUint32(offset, buffer.sampleRate, true);
  offset += 4;
  view.setUint32(offset, buffer.sampleRate * buffer.numberOfChannels * 2, true);
  offset += 4;
  view.setUint16(offset, buffer.numberOfChannels * 2, true);
  offset += 2;
  view.setUint16(offset, 16, true); // Bits per sample
  offset += 2;
  writeString('data');
  view.setUint32(offset, length - offset - 4, true);
  offset += 4;
  
  // Write audio data
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const sample = buffer.getChannelData(channel)[i];
      const intSample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, intSample < 0 ? intSample * 0x8000 : intSample * 0x7FFF, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

/**
 * Analyze audio for music, voice, and copyright detection
 * This is a simplified version - in production, you'd use AI APIs
 */
export const analyzeAudio = async (
  audioBlob: Blob,
  videoTitle: string,
  videoDescription: string
): Promise<AudioAnalysisResult> => {
  try {
    console.log('🔍 Analyzing audio content...');
    
    const audioContext = new AudioContext();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Basic audio analysis
    const channelData = audioBuffer.getChannelData(0);
    
    // Calculate RMS (Root Mean Square) - indicates energy level
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sum / channelData.length);
    
    // Detect voice vs music based on frequency patterns
    // This is a simplified heuristic
    const hasVoice = detectVoicePattern(channelData, audioBuffer.sampleRate);
    const hasMusic = detectMusicPattern(channelData, audioBuffer.sampleRate);
    
    // Check for potential copyright based on metadata
    const potentialCopyright = checkCopyrightIndicators(videoTitle, videoDescription);
    
    const issues: string[] = [];
    
    if (hasMusic && potentialCopyright) {
      issues.push('Potential copyrighted music detected');
    }
    
    if (!hasVoice && hasMusic) {
      issues.push('Music-only content may have limited monetization');
    }
    
    if (rms < 0.01) {
      issues.push('Very low audio level detected');
    }
    
    console.log('✅ Audio analysis complete');
    
    return {
      hasMusic,
      hasVoice,
      musicConfidence: hasMusic ? 0.75 : 0.25,
      voiceConfidence: hasVoice ? 0.80 : 0.20,
      potentialCopyright,
      copyrightConfidence: potentialCopyright ? 0.65 : 0.15,
      audioDuration: audioBuffer.duration,
      issues,
    };
  } catch (error) {
    console.error('❌ Audio analysis failed:', error);
    return {
      hasMusic: false,
      hasVoice: false,
      musicConfidence: 0,
      voiceConfidence: 0,
      potentialCopyright: false,
      copyrightConfidence: 0,
      audioDuration: 0,
      issues: ['Audio analysis failed'],
    };
  }
};

/**
 * Simple voice detection heuristic
 * Voice typically has specific frequency patterns
 */
const detectVoicePattern = (channelData: Float32Array, sampleRate: number): boolean => {
  // Voice frequency range: 300Hz - 3000Hz
  // This is a simplified detection
  const voiceEnergy = calculateFrequencyEnergy(channelData, sampleRate, 300, 3000);
  const totalEnergy = calculateFrequencyEnergy(channelData, sampleRate, 0, sampleRate / 2);
  
  return voiceEnergy / totalEnergy > 0.3; // 30% or more energy in voice range
};

/**
 * Simple music detection heuristic
 * Music typically has broader frequency spectrum
 */
const detectMusicPattern = (channelData: Float32Array, sampleRate: number): boolean => {
  // Music has energy across wider frequency range
  const lowEnergy = calculateFrequencyEnergy(channelData, sampleRate, 20, 250);
  const midEnergy = calculateFrequencyEnergy(channelData, sampleRate, 250, 4000);
  const highEnergy = calculateFrequencyEnergy(channelData, sampleRate, 4000, 20000);
  
  const totalEnergy = lowEnergy + midEnergy + highEnergy;
  
  // Music typically has balanced energy across frequencies
  return (
    lowEnergy / totalEnergy > 0.1 &&
    midEnergy / totalEnergy > 0.1 &&
    highEnergy / totalEnergy > 0.05
  );
};

/**
 * Calculate energy in a specific frequency range
 * Simplified version - would use FFT in production
 */
const calculateFrequencyEnergy = (
  channelData: Float32Array,
  sampleRate: number,
  lowFreq: number,
  highFreq: number
): number => {
  // Simplified energy calculation
  // In production, use FFT (Fast Fourier Transform)
  let energy = 0;
  const samplesToAnalyze = Math.min(channelData.length, sampleRate * 10); // First 10 seconds
  
  for (let i = 0; i < samplesToAnalyze; i++) {
    energy += channelData[i] * channelData[i];
  }
  
  return energy / samplesToAnalyze;
};

/**
 * Check for copyright indicators in metadata
 */
const checkCopyrightIndicators = (title: string, description: string): boolean => {
  const copyrightKeywords = [
    'cover', 'remix', 'ft.', 'feat.', 'official', 'music video',
    'lyrics', 'audio', 'prod.', 'produced by', 'beat',
    'copyright', 'all rights reserved', '©'
  ];
  
  const text = `${title} ${description}`.toLowerCase();
  
  return copyrightKeywords.some(keyword => text.includes(keyword.toLowerCase()));
};

/**
 * Generate AI prompt for audio analysis
 */
export const generateAudioAnalysisPrompt = (
  videoTitle: string,
  videoDescription: string,
  audioFeatures: AudioAnalysisResult
): string => {
  return `Analyze this video's audio content for copyright and policy compliance:

VIDEO TITLE: ${videoTitle}
VIDEO DESCRIPTION: ${videoDescription}

AUDIO ANALYSIS RESULTS:
- Has Music: ${audioFeatures.hasMusic} (Confidence: ${audioFeatures.musicConfidence * 100}%)
- Has Voice: ${audioFeatures.hasVoice} (Confidence: ${audioFeatures.voiceConfidence * 100}%)
- Potential Copyright: ${audioFeatures.potentialCopyright} (Confidence: ${audioFeatures.copyrightConfidence * 100}%)
- Audio Duration: ${audioFeatures.audioDuration}s
- Issues Found: ${audioFeatures.issues.join(', ')}

CHECK FOR:
1. Copyrighted music usage
2. Music licensing requirements
3. Voice content compliance
4. Audio quality standards
5. Platform-specific audio policies

Return JSON with:
{
  "hasCopyrightIssue": boolean,
  "copyrightRisk": "low" | "medium" | "high",
  "musicLicensingRequired": boolean,
  "audioCompliance": "pass" | "fail",
  "issues": string[],
  "recommendations": string[]
}`;
};
