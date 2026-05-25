import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../../../services/chatbot.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Interfaz que representa un mensaje en el chat.
 * Puede ser del usuario o del bot, y opcionalmente incluir recomendaciones de miradores.
 */
interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  recommendations?: any[]; // miradores recomendados, solo presentes en mensajes del bot con resultados
}

/**
 * Componente del chatbot de recomendaciones de miradores.
 * Gestiona la conversación entre el usuario y el asistente virtual,
 * mostrando sugerencias, procesando consultas y navegando a los detalles de los miradores.
 */
@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrls: ['./chatbot.css']
})
export class ChatbotComponent implements OnInit {
  private router         = inject(Router);
  private chatbotService = inject(ChatbotService);
  readonly auth          = inject(AuthService);

  messages        = signal<Message[]>([]);
  userInput: string = '';
  isLoading       = signal(false);
  showChatbot     = signal(false);   // controla si el panel del chatbot está visible u oculto
  suggestedQueries = signal<string[]>([]);

  constructor() {
    // carga las sugerencias automáticamente cuando el usuario inicia sesión
    // y las limpia cuando cierra sesión; effect() se ejecuta cada vez que cambia isLoggedIn
    effect(() => {
      if (this.auth.isLoggedIn()) {
        this.loadSuggestions();
      } else {
        this.suggestedQueries.set([]);
      }
    });
  }

  ngOnInit(): void {
    this.initializeChatbot();
  }

  /**
   * Inicializa el chat con el mensaje de bienvenida del bot.
   */
  initializeChatbot(): void {
    const welcomeMessage: Message = {
      id: this.generateId(),
      type: 'bot',
      content: 'Hola, soy tu asistente de miradores. ¿Qué tipo de mirador buscas?',
      timestamp: new Date()
    };
    this.messages.set([welcomeMessage]);
  }

  /**
   * Carga las consultas sugeridas desde el servidor para mostrarlas como accesos rápidos.
   * Solo se ejecuta si el usuario está autenticado.
   */
  loadSuggestions(): void {
    if (!this.auth.isLoggedIn()) return;
    this.chatbotService.getSuggestions().subscribe({
      next: (suggestions) => {
        this.suggestedQueries.set(suggestions);
      },
      error: () => {
        console.error('Error cargando sugerencias');
      }
    });
  }

  /**
   * Alterna la visibilidad del panel del chatbot.
   */
  toggleChatbot(): void {
    this.showChatbot.update(value => !value); // invierte el valor actual del signal
  }

  /**
   * Envía el mensaje del usuario al servidor y gestiona la respuesta del bot.
   */
  sendMessage(): void {
    if (!this.userInput.trim()) return; // ignora mensajes vacíos o con solo espacios

    const userMessage: Message = {
      id: this.generateId(),
      type: 'user',
      content: this.userInput,
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, userMessage]);

    this.isLoading.set(true);
    const query = this.userInput;
    this.userInput = ''; // limpia el input antes de la petición para mejorar la UX

    this.chatbotService.processChatbotQuery(query).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.handleBotResponse(response);
      },
      error: () => {
        this.isLoading.set(false);
        this.addBotMessage('Error procesando la solicitud');
      }
    });
  }

  /**
   * Procesa la respuesta del bot y añade el mensaje correspondiente al chat.
   * Distingue tres casos: error/fuera de tema, sin resultados, y con resultados.
   */
  private handleBotResponse(response: any): void {
    // caso: error o consulta fuera de tema
    if (!response.success) {
      this.addBotMessage(response.message || 'No puedo responder a esa consulta.');
      return;
    }

    // caso: búsqueda válida pero sin miradores que cumplan los criterios
    if (!response.viewpoints || response.viewpoints.length === 0) {
      this.addBotMessage(response.explanation || 'No encontré miradores con esos criterios. Prueba con otros filtros.');
      return;
    }

    // caso: búsqueda con resultados, incluye las recomendaciones en el mensaje
    const botMessage: Message = {
      id: this.generateId(),
      type: 'bot',
      content: response.explanation || `Encontré ${response.viewpoints.length} mirador(es):`,
      timestamp: new Date(),
      recommendations: response.viewpoints,
    };

    this.messages.update(msgs => [...msgs, botMessage]);
    this.scrollToBottom();
  }

  /**
   * Rellena el input con una consulta sugerida y la envía automáticamente.
   * El setTimeout da tiempo al binding de ngModel a actualizarse antes de enviar.
   */
  useSuggestedQuery(query: string): void {
    this.userInput = query;
    setTimeout(() => this.sendMessage(), 100);
  }

  /**
   * Añade un mensaje de texto simple del bot al chat.
   */
  private addBotMessage(content: string): void {
    const botMessage: Message = {
      id: this.generateId(),
      type: 'bot',
      content: content,
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, botMessage]);
    this.scrollToBottom();
  }

  /**
   * Cierra el chatbot y redirige al login.
   */
  goToLogin(): void {
    this.toggleChatbot();
    this.router.navigate(['/login']);
  }

  /**
   * Cierra el chatbot y redirige al registro.
   */
  goToRegister(): void {
    this.toggleChatbot();
    this.router.navigate(['/register']);
  }

  /**
   * Navega a la página de detalles de un mirador recomendado por el bot.
   */
  viewMiradorDetails(mirador: any) {
    if (!mirador.id) {
      console.error('Mirador sin ID:', mirador);
      return;
    }
    this.router.navigate(['/miradores', mirador.id]);
  }

  /**
   * Desplaza el contenedor de mensajes hasta el final para mostrar el último mensaje.
   * El setTimeout permite que Angular actualice el DOM antes de hacer el scroll.
   */
  private scrollToBottom(): void {
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 0);
  }

  /**
   * Genera un ID único para cada mensaje combinando timestamp y cadena aleatoria.
   */
  private generateId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
