<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AttachmentRequest;
use App\Models\Lead;
use App\Models\Task;
use App\Models\Attachment;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;

class AttachmentController extends Controller
{
    use AuthorizesRequests;

    public function store(AttachmentRequest $request)
    {
        if ($request->lead_id) {
            $lead = Lead::findOrFail($request->lead_id);
            // Cho phép bất kỳ user nào upload vào bất kỳ lead nào
            // $this->authorize('view', $lead);
        }

        if ($request->task_id) {
            $task = Task::findOrFail($request->task_id);
            // Cho phép bất kỳ user nào upload vào bất kỳ task nào
            // $this->authorize('view', $task);
        }

        $file = $request->file('file');
        $path = $file->store('attachments', 'public');

        $attachment = Attachment::create([
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_type' => $file->getClientMimeType(),
            'uploaded_by' => Auth::id(),
            'lead_id' => $request->lead_id,
            'task_id' => $request->task_id
        ]);

        return response()->json($attachment, 201);
    }

    public function destroy(Attachment $attachment)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();

        if (!$user->isAdmin() && $attachment->uploaded_by !== $user->id) {
            abort(403, 'Unauthorized to delete this attachment.');
        }

        // Xóa file từ storage
        \Illuminate\Support\Facades\Storage::disk('public')->delete($attachment->file_path);

        $attachment->delete();
        return response()->noContent();
    }

    public function preview(Attachment $attachment)
    {
        return $this->serveFile($attachment);
    }

    public function signedPreview(Request $request, Attachment $attachment)
    {
        $token = $request->query('token');
        $expires = $request->query('expires');
        if (!$this->verifySignature($attachment->id, $expires, $token)) {
            abort(403, 'Invalid or expired signature.');
        }
        return $this->serveFile($attachment);
    }

    public function sign(Request $request, Attachment $attachment)
    {
        $this->authorizeOwner($attachment);
        $expires = now()->addMinutes(15)->timestamp;
        $signature = $this->makeSignature($attachment->id, $expires);
        return [
            'url' => url("/api/attachments/{$attachment->id}/signed?expires={$expires}&token={$signature}"),
            'expires' => $expires,
        ];
    }

    private function serveFile(Attachment $attachment)
    {
        $path = storage_path('app/public/'.$attachment->file_path);
        if (!file_exists($path)) {
            abort(404, 'File not found.');
        }

        $mime = mime_content_type($path) ?: 'application/octet-stream';
        return response()->file($path, ['Content-Type' => $mime]);
    }

    private function authorizeOwner(Attachment $attachment): void
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        if (!$user->isAdmin() && $attachment->uploaded_by !== $user->id) {
            abort(403, 'Unauthorized to sign this attachment.');
        }
    }

    private function makeSignature(int $id, int $expires): string
    {
        $secret = config('app.key');
        return hash_hmac('sha256', $id.'|'.$expires, $secret);
    }

    private function verifySignature(int $id, ?string $expires, ?string $token): bool
    {
        if (!$expires || !$token) {
            return false;
        }
        if ((int)$expires < now()->timestamp) {
            return false;
        }
        return hash_equals($this->makeSignature($id, (int)$expires), $token);
    }
}
