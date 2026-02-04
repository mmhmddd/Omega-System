// src/core/services/empty-receipt.service.ts - UPDATED WITH EMAIL SENDING (MATCHING RECEIPTS PATTERN)
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
    id: string;
    receiptNumber: string;
    filename: string;
    language: string;
    downloadUrl: string;
  };
}

/**
 * Empty Receipt Interface
 */
export interface EmptyReceipt {
  id: string;
  receiptNumber: string;
  filename: string;
  pdfFilename: string;
  language: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByName?: string;
  createdByRole: string;
  pdfGenerated: boolean;
}

/**
 * Email Send Response Interface
 */
export interface EmailSendResponse {
  success: boolean;
  message: string;
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
   * ✅ Send empty receipt PDF by email (MATCHING RECEIPTS PATTERN)
   */
  sendReceiptByEmail(receiptId: string, email: string): Observable<EmailSendResponse> {
    return this.http.post<EmailSendResponse>(`${this.API_URL}/${receiptId}/send-email`, { email });
  }

  /**
   * Get all empty receipts with pagination
   */
  getAllEmptyReceipts(params?: any): Observable<any> {
    return this.http.get<any>(`${this.API_URL}`, { params });
  }

  /**
   * Get empty receipt by ID
   */
  getEmptyReceiptById(id: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/${id}`);
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
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);
      
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      iframe.style.opacity = '0';
      
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          try {
            if (iframe.contentWindow) {
              iframe.contentWindow.focus();
              iframe.contentWindow.print();
            }
            
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