import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private apiUrl = `${environment.apiUrl}/chatbot`;

  constructor(private http: HttpClient) {}

  processChatbotQuery(query: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/query`, {
      query: query
    });
  }

  getSuggestions(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/suggestions`);
  }
}
