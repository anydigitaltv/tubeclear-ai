/**
 * Video Download & Processing Utility
 * Handles video downloading, 360p conversion, and frame extraction
 */

export interface VideoDownloadResult {
  videoUrl: string;
  blob: Blob;
  duration: number;
  width: number;
  height: number;
  fileSize: number;
}

export interface FrameExtractionResult {
  frameNumber: number;
  timestamp: number;
  imageData: string; // Base64 encoded image
  width: number;
  height: number;
}

/**
 * Download video from URL
 * Note: This works for publicly accessible videos
 * For YouTube/TikTok, you'd need a backend proxy due to CORS
 */
export const downloadVideo = async (
  videoUrl: string,
  onProgress?: (progress: number) => void
): Promise<VideoDownloadResult | null> => {
  try {
    console.log('📥 Downloading video:', videoUrl);
    
    const response = await fetch(videoUrl, {
      method: 'GET',
      headers: {
        'Accept': 'video/*',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    const reader = response.body?.getReader();
    
    if (!reader) {
      throw new Error('No reader available');
    }

    let received = 0;
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      received += value.length;
      
      if (onProgress && total > 0) {
        const progress = (received / total) * 100;
        onProgress(progress);
      }
    }

    const blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });
    const videoElement = document.createElement('video');
    videoElement.src = URL.createObjectURL(blob);
    
    return new Promise((resolve, reject) => {
      videoElement.onloadedmetadata = () => {
        resolve({
          videoUrl,
          blob,
          duration: videoElement.duration,
          width: videoElement.videoWidth,
          height: videoElement.videoHeight,
          fileSize: blob.size,
        });
      };
      
      videoElement.onerror = () => {
        reject(new Error('Failed to load video metadata'));
      };
    });
  } catch (error) {
    console.error('❌ Video download failed:', error);
    return null;
  }
};

/**
 * Convert video to 360p for optimized scanning
 * Reduces bandwidth and processing time
 */
export const convertTo360p = async (videoBlob: Blob): Promise<Blob | null> => {
  try {
    console.log('🎬 Converting to 360p...');
    
    const videoElement = document.createElement('video');
    videoElement.src = URL.createObjectURL(videoBlob);
    
    return new Promise((resolve, reject) => {
      videoElement.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Calculate 360p dimensions (maintain aspect ratio)
        const targetHeight = 360;
        const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
        const targetWidth = Math.round(targetHeight * aspectRatio);
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Create a MediaRecorder to capture the video at 360p
        const stream = canvas.captureStream(30); // 30 FPS
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 500000, // 500 kbps for 360p
        });

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const outputBlob = new Blob(chunks, { type: 'video/webm' });
          console.log('✅ 360p conversion complete:', outputBlob.size, 'bytes');
          resolve(outputBlob);
        };

        // Play video and record at 360p
        videoElement.play();
        mediaRecorder.start();

        const drawFrame = () => {
          if (videoElement.ended) {
            mediaRecorder.stop();
            return;
          }
          
          ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);
          requestAnimationFrame(drawFrame);
        };

        drawFrame();

        videoElement.onended = () => {
          mediaRecorder.stop();
        };
      };

      videoElement.onerror = () => {
        reject(new Error('Failed to load video for conversion'));
      };
    });
  } catch (error) {
    console.error('❌ 360p conversion failed:', error);
    return null;
  }
};

/**
 * Extract frames from video at specified intervals
 * Returns base64 encoded images for AI analysis
 */
export const extractFrames = async (
  videoBlob: Blob,
  frameInterval: number = 1, // seconds between frames
  maxFrames: number = 30 // limit to prevent overload
): Promise<FrameExtractionResult[]> => {
  try {
    console.log('🖼️ Extracting frames...');
    
    const videoElement = document.createElement('video');
    videoElement.src = URL.createObjectURL(videoBlob);
    
    return new Promise((resolve, reject) => {
      videoElement.onloadedmetadata = () => {
        const duration = videoElement.duration;
        const totalFrames = Math.min(
          Math.floor(duration / frameInterval),
          maxFrames
        );
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;

        const frames: FrameExtractionResult[] = [];
        let currentFrame = 0;

        const extractFrame = () => {
          if (currentFrame >= totalFrames) {
            console.log(`✅ Extracted ${frames.length} frames`);
            resolve(frames);
            return;
          }

          const timestamp = currentFrame * frameInterval;
          videoElement.currentTime = timestamp;
        };

        videoElement.onseeked = () => {
          ctx.drawImage(videoElement, 0, 0);
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          
          frames.push({
            frameNumber: currentFrame,
            timestamp: currentFrame * frameInterval,
            imageData,
            width: canvas.width,
            height: canvas.height,
          });

          currentFrame++;
          extractFrame();
        };

        videoElement.onerror = () => {
          reject(new Error('Failed to seek in video'));
        };

        extractFrame();
      };

      videoElement.onerror = () => {
        reject(new Error('Failed to load video for frame extraction'));
      };
    });
  } catch (error) {
    console.error('❌ Frame extraction failed:', error);
    return [];
  }
};

/**
 * Get video thumbnail at specific timestamp
 */
export const getVideoThumbnail = async (
  videoBlob: Blob,
  timestamp: number = 0
): Promise<string | null> => {
  try {
    const videoElement = document.createElement('video');
    videoElement.src = URL.createObjectURL(videoBlob);
    
    return new Promise((resolve, reject) => {
      videoElement.onloadedmetadata = () => {
        videoElement.currentTime = timestamp;
      };

      videoElement.onseeked = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        ctx.drawImage(videoElement, 0, 0);
        
        const thumbnail = canvas.toDataURL('image/jpeg', 0.9);
        resolve(thumbnail);
      };

      videoElement.onerror = () => {
        reject(new Error('Failed to load video'));
      };
    });
  } catch (error) {
    console.error('❌ Thumbnail extraction failed:', error);
    return null;
  }
};

/**
 * Calculate optimal frame interval based on video duration
 */
export const calculateFrameInterval = (duration: number): number => {
  if (duration <= 60) return 2; // Short videos: every 2 seconds
  if (duration <= 300) return 5; // Medium videos: every 5 seconds
  if (duration <= 600) return 10; // Long videos: every 10 seconds
  return 15; // Very long videos: every 15 seconds
};
