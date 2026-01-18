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
     * Get team members for the current manager/owner
     * Returns all staff members that the manager can assign leads to
     */
    public function teamMembers()
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();

        if (!$user) {
            abort(401, 'Unauthorized');
        }

        // Admin can see all staff
        if ($user->isAdmin()) {
            $members = User::where('role', 'staff')->get();
        } elseif ($user->isOwner()) {
            // Manager/Owner sees staff in their team
            $members = User::where('team_id', $user->team_id)
                ->where('role', 'staff')
                ->get();
        } else {
            // Staff only sees themselves
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
