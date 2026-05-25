<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Controlador de autenticación.
 * Gestiona el registro, login, logout y consulta del usuario autenticado.
 */
class AuthController extends Controller
{
    // POST /api/auth/register
    /**
     * Registra un nuevo usuario en el sistema.
     * Valida los datos, crea el usuario, le asigna el rol 'user' por defecto
     * y devuelve un token de acceso junto con los datos del usuario.
     */
    public function register(Request $request)
    {
        // Valida los campos requeridos con mensajes de error personalizados en español
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed', // 'confirmed' exige que exista el campo password_confirmation con el mismo valor
        ], [
            'name.required' => 'El nombre es requerido',
            'name.string' => 'El nombre debe ser texto',
            'name.max' => 'El nombre no puede exceder 255 caracteres',

            'email.required' => 'El email es requerido',
            'email.email' => 'El email no es válido',
            'email.unique' => 'Este email ya está registrado',

            'password.required' => 'La contraseña es requerida',
            'password.string' => 'La contraseña debe ser texto',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres',
            'password.confirmed' => 'Las contraseñas no coinciden',
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']), // hashea la contraseña antes de guardarla en la BD
        ]);

        $user->assignRole('user'); // asigna el rol por defecto con el paquete Spatie Laravel Permission

        $token = $user->createToken('auth_token')->plainTextToken; // genera un token de acceso personal (Sanctum)

        return response()->json([
            'user'  => $user,
            'token' => $token,
        ], 201); // 201 Created
    }

    // POST /api/auth/login
    /**
     * Autentica a un usuario existente.
     * Verifica las credenciales y devuelve un token de acceso junto con los roles del usuario.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        // Intenta autenticar con email y contraseña; si falla lanza un error de validación
        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['Credenciales incorrectas.'],
            ]);
        }

        $user  = Auth::user();
        $token = $user->createToken('auth_token')->plainTextToken; // genera un nuevo token en cada login

        return response()->json([
            'user'  => $user,
            'token' => $token,
            'roles' => $user->getRoleNames(), // devuelve los roles para que Angular pueda gestionar el acceso
        ]);
    }

    // POST /api/auth/logout
    /**
     * Cierra la sesión del usuario autenticado.
     * Elimina únicamente el token con el que se hizo la petición, no todos los tokens del usuario.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete(); // invalida solo el token actual

        return response()->json(['message' => 'Sesión cerrada correctamente.']);
    }

    // GET /api/auth/me
    /**
     * Devuelve los datos del usuario autenticado junto con sus roles.
     * Útil para que el frontend recupere el estado de sesión al recargar la página.
     */
    public function me(Request $request)
    {
        $user = $request->user(); // obtiene el usuario a partir del token Bearer de la cabecera

        return response()->json([
            'user'  => $user,
            'roles' => $user->getRoleNames(),
        ]);
    }
}
