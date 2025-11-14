/**
 * Screenshot Service
 * Handles screenshot capture using macOS screencapture tool
 * @class ScreenshotService
 */

const { execFile } = require('child_process');
const { clipboard, nativeImage } = require('electron');
const Logger = require('../utils/logger');

class ScreenshotService {
  constructor() {
    this.isCapturing = false;
    this.logger = new Logger('ScreenshotService');
  }

  /**
   * Check if a capture is in progress
   * @returns {boolean} True if capturing
   */
  isCaptureInProgress() {
    return this.isCapturing;
  }

  /**
   * Capture screenshot interactively using macOS screencapture
   * @returns {Promise<{success: boolean, dataUrl?: string, error?: string}>}
   */
  captureInteractive() {
    return new Promise((resolve) => {
      // Prevent multiple simultaneous captures
      if (this.isCapturing) {
        this.logger.warn('Screenshot capture already in progress, ignoring');
        resolve({ success: false, error: 'Capture already in progress' });
        return;
      }

      this.isCapturing = true;
      this.logger.info('Starting interactive screenshot capture');

      // Use macOS screencapture tool: -i for interactive, -c to copy to clipboard
      execFile('/usr/sbin/screencapture', ['-i', '-c'], (err) => {
        // Always reset the flag when done (success or error)
        this.isCapturing = false;

        if (err) {
          // Only log if it's not the "already running" error
          if (!err.message.includes('cannot run two interactive')) {
            this.logger.error('Screenshot capture error', err);
            resolve({ success: false, error: err.message });
          } else {
            this.logger.warn('Screenshot capture already in progress');
            resolve({ success: false, error: 'Capture already in progress' });
          }
          return;
        }

        // Read image from clipboard
        const img = clipboard.readImage();

        if (img.isEmpty()) {
          this.logger.info('No image captured (user may have cancelled)');
          resolve({ success: false, error: 'No image captured' });
          return;
        }

        this.logger.success('Screenshot captured successfully');

        // Convert to data URL
        const dataUrl = img.toDataURL();
        resolve({ success: true, dataUrl });
      });
    });
  }

  /**
   * Get image from clipboard
   * @returns {object|null} Native image or null if clipboard is empty
   */
  getClipboardImage() {
    const img = clipboard.readImage();
    return img.isEmpty() ? null : img;
  }

  /**
   * Convert native image to data URL
   * @param {object} nativeImg - Electron native image
   * @returns {string} Data URL
   */
  imageToDataUrl(nativeImg) {
    return nativeImg.toDataURL();
  }
}

module.exports = ScreenshotService;

