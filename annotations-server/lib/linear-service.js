/**
 * Linear Service - SDK wrapper for Linear API operations
 *
 * Provides methods for validating API keys, fetching teams,
 * uploading files, and creating issues in Linear.
 */

import { LinearClient } from '@linear/sdk';
import fs from 'fs/promises';
import path from 'path';

/**
 * Linear Service class for API operations
 */
export class LinearService {
  constructor(apiKey) {
    this.client = new LinearClient({ apiKey });
  }

  /**
   * Validate the API key by making a test request
   */
  async validateApiKey() {
    try {
      const viewer = await this.client.viewer;
      return !!viewer.id;
    } catch (error) {
      console.error('[LinearService] Invalid Linear API key:', error.message);
      return false;
    }
  }

  /**
   * Get all teams accessible with this API key
   */
  async getTeams() {
    try {
      const teams = await this.client.teams();
      return teams.nodes.map(team => ({
        id: team.id,
        name: team.name,
        key: team.key,
        icon: team.icon || undefined,
      }));
    } catch (error) {
      console.error('[LinearService] Failed to fetch Linear teams:', error.message);
      throw error;
    }
  }

  /**
   * Upload a file to Linear's private cloud storage
   * @param {string} filePath - Path to the file on disk
   * @param {string} filename - Name for the file in Linear
   * @param {string} contentType - MIME type (e.g., 'image/png', 'image/webp')
   * @returns {Promise<string>} - The asset URL to use in issue descriptions
   */
  async uploadFile(filePath, filename, contentType = 'image/png') {
    try {
      // Read file from disk
      const fileBuffer = await fs.readFile(filePath);
      const fileSize = fileBuffer.length;

      // Request upload URL from Linear
      const uploadPayload = await this.client.fileUpload(contentType, filename, fileSize);

      if (!uploadPayload.uploadFile) {
        throw new Error('Failed to get upload URL from Linear');
      }

      const { uploadUrl, assetUrl, headers } = uploadPayload.uploadFile;

      // Build headers for the PUT request
      const uploadHeaders = {
        'Content-Type': contentType,
        'cache-control': 'max-age=31536000',
      };

      // Add auth headers from Linear
      if (headers && headers.length > 0) {
        for (const header of headers) {
          uploadHeaders[header.key] = header.value;
        }
      }

      // Upload file to Linear's storage
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: uploadHeaders,
        body: fileBuffer,
      });

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}: ${response.statusText}`);
      }

      return assetUrl;
    } catch (error) {
      console.error('[LinearService] Failed to upload file:', error.message);
      throw error;
    }
  }

  /**
   * Create an issue in Linear
   * @param {Object} input - Issue creation input
   * @param {string} input.teamId - Linear team ID
   * @param {string} input.title - Issue title
   * @param {string} input.description - Issue description (Markdown)
   * @returns {Promise<{id: string, identifier: string, url: string}>}
   */
  async createIssue({ teamId, title, description }) {
    try {
      const result = await this.client.createIssue({
        teamId,
        title,
        description,
      });

      if (!result.success || !result.issue) {
        throw new Error('Failed to create Linear issue');
      }

      const issue = await result.issue;
      return {
        id: issue.id,
        identifier: issue.identifier,
        url: issue.url,
      };
    } catch (error) {
      console.error('[LinearService] Failed to create Linear issue:', error.message);
      throw error;
    }
  }
}

/**
 * Create a LinearService instance
 */
export function createLinearService(apiKey) {
  return new LinearService(apiKey);
}
