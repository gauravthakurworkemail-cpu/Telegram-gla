/**
 * Media compression and voice recording utilities
 */

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Compresses an image file to a base64 data URL within 500KB limits
 */
export async function compressImage(file: File, maxWidth = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
}

/**
 * Convert any file to base64 Data URL (with 1.5MB safety guard for Firestore documents)
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 800 * 1024) {
      reject(new Error('File is too large for chat upload. Maximum size is 800 KB for optimal speed.'));
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Audio voice recording manager using MediaRecorder
 */
export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    this.audioChunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Choose mime type supported by browser
    let options: MediaRecorderOptions = {};
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      options = { mimeType: 'audio/webm;codecs=opus' };
    } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
      options = { mimeType: 'audio/ogg;codecs=opus' };
    }

    this.mediaRecorder = new MediaRecorder(this.stream, options);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);
  }

  async stop(): Promise<{ audioUrl: string; durationSec: number; blob: Blob }> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Recorder not initialized'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        
        // Stop audio tracks
        this.stream?.getTracks().forEach((track) => track.stop());

        // Convert blob to base64 data URL
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => {
          resolve({
            audioUrl: reader.result as string,
            durationSec: Math.round(this.audioChunks.length * 0.1),
            blob,
          });
        };
        reader.onerror = (e) => reject(e);
      };

      this.mediaRecorder.stop();
    });
  }

  cancel(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.audioChunks = [];
  }
}
