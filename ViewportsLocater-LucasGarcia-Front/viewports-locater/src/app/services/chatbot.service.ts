import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Servicio del chatbot de recomendaciones.
 * Gestiona las peticiones HTTP al backend para procesar consultas
 * en lenguaje natural y obtener sugerencias predefinidas.
 */
@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private apiUrl = `${environment.apiUrl}/chatbot`;

  constructor(private http: HttpClient) {}

  /**
   * Envía una consulta en lenguaje natural al backend y devuelve
   * los miradores recomendados según los criterios detectados.
   */
  processChatbotQuery(query: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/query`, {
      query: query
    });
  }

  /**
   * Obtiene la lista de consultas sugeridas para mostrar como accesos rápidos
   * en la interfaz del chatbot.
   */
  getSuggestions(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/suggestions`);
  }
}
