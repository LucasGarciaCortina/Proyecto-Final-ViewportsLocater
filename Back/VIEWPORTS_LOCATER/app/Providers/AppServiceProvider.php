<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        set_error_handler(function ($errno, $errstr) {
            if (str_contains($errstr, 'Unable to merge')) {
                return true;
            }
            return false;
        }, E_USER_WARNING);
    }
}
