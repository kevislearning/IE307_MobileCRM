<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\UserDevice;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DeviceController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'fcm_token' => 'required|string',
            'platform' => 'nullable|string',
        ]);

        $device = UserDevice::updateOrCreate(
            ['fcm_token' => $data['fcm_token']],
            [
                'user_id' => Auth::id(),
                'platform' => $data['platform'] ?? null,
                'last_seen' => now(),
            ]
        );

        return $device;
    }

    public function destroy(Request $request)
    {
        $data = $request->validate([
            'fcm_token' => 'required|string',
        ]);

        UserDevice::where('fcm_token', $data['fcm_token'])->delete();

        return response()->noContent();
    }
}
