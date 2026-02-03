// src/core/services/empty-receipt.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment/environment';

/**
 * Empty Receipt Generate Response Interface
 */
export interface EmptyReceiptResponse {
  success: boolean;
  message: string;
  data: {
    filename: string;
    language: string;
    downloadUrl: string;
  };
}

/**
 * Empty Receipt Service
 */
@Injectable({
  providedIn: 'root'
})
export class EmptyReceiptService {
  private readonly API_URL = `${environment.apiUrl}/empty-receipts`;

  constructor(private http: HttpClient) {}

  /**
   * Generate empty receipt PDF
   */
  generateEmptyReceipt(language: 'ar' | 'en' = 'ar'): Observable<EmptyReceiptResponse> {
    return this.http.post<EmptyReceiptResponse>(`${this.API_URL}/generate`, { language });
  }

  /**
   * Get all empty receipts with pagination
   */
  getAllEmptyReceipts(params?: any): Observable<any> {
    return this.http.get<any>(`${this.API_URL}`, { params });
  }

  /**
   * Delete empty receipt
   */
  deleteEmptyReceipt(id: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/${id}`);
  }

  /**
   * View PDF in new tab
   */
  viewPDFInNewTab(filename: string): void {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    const url = `${this.API_URL}/download/${filename}`;
    
    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch PDF');
      }
      return response.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      
      // Clean up after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    })
    .catch(error => {
      console.error('Error viewing PDF:', error);
    });
  }

  /**
   * Open print dialog for PDF
   */
  openPrintDialog(filename: string): void {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    const url = `${this.API_URL}/download/${filename}`;
    
    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch PDF');
      }
      return response.blob();
    })
    .then((blob) => {
      // Create blob URL with proper PDF mime type
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      // Create hidden iframe with proper size for PDF rendering
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      iframe.style.opacity = '0';
      
      // Set src before appending to DOM
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      
      // Wait for PDF to load completely
      iframe.onload = () => {
        // Give extra time for PDF to render in the iframe
        setTimeout(() => {
          try {
            // Focus and print
            if (iframe.contentWindow) {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }
            
            // Clean up after print dialog closes (estimated time)
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
              URL.revokeObjectURL(blobUrl);
            }, 3000);
          } catch (e) {
            console.error('Print error:', e);
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            URL.revokeObjectURL(blobUrl);
          }
        }, 1000);
      };
      
      iframe.onerror = () => {
        console.error('Failed to load PDF for printing');
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
        URL.revokeObjectURL(blobUrl);
      };
    })
    .catch(error => {
      console.error('Error printing PDF:', error);
    });
  }

  /**
   * Download PDF
   */
  downloadPDF(filename: string): void {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      return;
    }

    const url = `${this.API_URL}/download/${filename}`;
    
    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      return response.blob();
    })
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    })
    .catch(error => {
      console.error('Error downloading PDF:', error);
    });
  }
}