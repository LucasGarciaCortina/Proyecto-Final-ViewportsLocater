<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\ChatbotService;

/**
 * Controlador del chatbot de recomendaciones.
 * Gestiona las consultas en lenguaje natural del usuario y devuelve
 * sugerencias de miradores y rutas basadas en los datos del sistema.
 */
class ChatbotController extends Controller
{
    /**
     * Instancia del servicio que contiene la lógica del chatbot.
     */
    protected $chatbotService;

    /**
     * Inyecta el ChatbotService a través del constructor.
     * Laravel resuelve automáticamente la dependencia.
     */
    public function __construct(ChatbotService $chatbotService)
    {
        $this->chatbotService = $chatbotService;
    }

    /**
     * Procesa una consulta en lenguaje natural enviada por el usuario
     * y devuelve las recomendaciones generadas por el chatbot.
     */
    public function processQuery(Request $request)
    {
        $query = $request->input('query');

        // valida que la consulta no esté vacía ni contenga solo espacios
        if (!$query || trim($query) === '') {
            return response()->json([
                'success' => false,
                'message' => 'La consulta no puede estar vacía'
            ], 400); // 400 Bad Request
        }

        $result = $this->chatbotService->processQuery($query);
        return response()->json($result);
    }

    /**
     * Devuelve una lista de consultas de ejemplo para mostrar al usuario
     * como sugerencias en la interfaz del chatbot.
     */
    public function getSuggestions()
    {
        return response()->json([
            'Miradores accesibles cerca de Oviedo',
            'Recomiéndame una ruta fácil',
            'Miradores con buenas valoraciones',
            'Miradores en la montaña',
            'Miradores en la costa',
            'Rutas moderadas con vistas al mar'
        ]);
    }
}
