<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\ChatbotService;

class ChatbotController extends Controller
{
    protected $chatbotService;

    public function __construct(ChatbotService $chatbotService)
    {
        $this->chatbotService = $chatbotService;
    }

    public function processQuery(Request $request)
    {
        $query = $request->input('query');

        if (!$query || trim($query) === '') {
            return response()->json([
                'success' => false,
                'message' => 'La consulta no puede estar vacía'
            ], 400);
        }

        $result = $this->chatbotService->processQuery($query);
        return response()->json($result);
    }

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
