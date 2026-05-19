import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../../../services/chatbot.service';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  recommendations?: any[];
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrls: ['./chatbot.css']
})
export class ChatbotComponent implements OnInit {
  private router = inject(Router);
  private chatbotService = inject(ChatbotService);
  readonly auth = inject(AuthService);

  messages = signal<Message[]>([]);
  userInput: string = '';
  isLoading = signal(false);
  showChatbot = signal(false);
  suggestedQueries = signal<string[]>([]);

  constructor() {
    // Cargar sugerencias automáticamente cuando el usuario inicia sesión
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

  initializeChatbot(): void {
    const welcomeMessage: Message = {
      id: this.generateId(),
      type: 'bot',
      content: 'Hola, soy tu asistente de miradores. ¿Qué tipo de mirador buscas?',
      timestamp: new Date()
    };
    this.messages.set([welcomeMessage]);
  }

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

  toggleChatbot(): void {
    this.showChatbot.update(value => !value);
  }

  sendMessage(): void {
    if (!this.userInput.trim()) return;

    const userMessage: Message = {
      id: this.generateId(),
      type: 'user',
      content: this.userInput,
      timestamp: new Date()
    };
    this.messages.update(msgs => [...msgs, userMessage]);

    this.isLoading.set(true);
    const query = this.userInput;
    this.userInput = '';

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

  private handleBotResponse(response: any): void {
    // Caso: error o fuera de tema
    if (!response.success) {
      this.addBotMessage(response.message || 'No puedo responder a esa consulta.');
      return;
    }

    // Caso: sin resultados
    if (!response.viewpoints || response.viewpoints.length === 0) {
      this.addBotMessage(response.explanation || 'No encontré miradores con esos criterios. Prueba con otros filtros.');
      return;
    }

    // Caso: con resultados
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

  useSuggestedQuery(query: string): void {
    this.userInput = query;
    setTimeout(() => this.sendMessage(), 100);
  }

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

  goToLogin(): void {
    this.toggleChatbot();
    this.router.navigate(['/login']);
  }

  goToRegister(): void {
    this.toggleChatbot();
    this.router.navigate(['/register']);
  }

  viewMiradorDetails(mirador: any) {
    if (!mirador.id) {
      console.error('Mirador sin ID:', mirador);
      return;
    }
    this.router.navigate(['/miradores', mirador.id]);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 0);
  }

  private generateId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
