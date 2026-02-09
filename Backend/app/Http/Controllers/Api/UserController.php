<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index()
    {
        $this->authorizeAdmin();
        return UserResource::collection(User::paginate(15));
    }

    /**
     * Lấy danh sách thành viên team cho manager/owner hiện tại
     * Trả về tất cả staff mà manager có thể giao leads
     */
    public function teamMembers()
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();

        if (!$user) {
            abort(401, 'Unauthorized');
        }

        // Admin có thể xem tất cả staff
        if ($user->isAdmin()) {
            $members = User::where('role', 'staff')->get();
        } elseif ($user->isOwner()) {
            // Manager/Owner xem staff trong team của họ
            $members = User::where('team_id', $user->team_id)
                ->where('role', 'staff')
                ->get();
        } else {
            // Staff chỉ xem chính mình
            $members = collect([$user]);
        }

        return response()->json(['data' => UserResource::collection($members)]);
    }

    public function store(UserRequest $request)
    {
        $this->authorizeAdmin();
        $data = $request->validated();
        $data['password'] = Hash::make($data['password']);

        $user = User::create($data);
        return new UserResource($user);
    }

    public function update(UserRequest $request, User $user)
    {
        $this->authorizeAdmin();
        $data = $request->validated();
        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }
        $user->update($data);
        return new UserResource($user);
    }

    public function destroy(User $user)
    {
        $this->authorizeAdmin();
        $user->delete();
        return response()->noContent();
    }

    private function authorizeAdmin(): void
    {
        if (!auth()->user() || !auth()->user()->isAdmin()) {
            abort(403, 'Admin only');
        }
    }
}
