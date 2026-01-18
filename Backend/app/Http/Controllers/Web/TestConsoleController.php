<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;

class TestConsoleController extends Controller
{
    public function index()
    {
        return view('test-console');
    }
}
