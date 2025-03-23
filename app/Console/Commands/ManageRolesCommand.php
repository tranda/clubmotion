<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Role;

class ManageRolesCommand extends Command
{
    protected $signature = 'roles:manage 
        {action : Action to perform (list|create|delete)} 
        {name? : Role name for create/delete actions}
        {--description= : Role description}';

    protected $description = 'Manage system roles';

    public function handle()
    {
        $action = $this->argument('action');

        switch ($action) {
            case 'list':
                $this->listRoles();
                break;
            case 'create':
                $this->createRole();
                break;
            case 'delete':
                $this->deleteRole();
                break;
            default:
                $this->error('Invalid action. Use list, create, or delete.');
        }
    }

    protected function listRoles()
    {
        $roles = Role::all();

        $this->table(
            ['ID', 'Name', 'Description', 'Created At'],
            $roles->map(function ($role) {
                return [
                    $role->id,
                    $role->name,
                    $role->description,
                    $role->created_at
                ];
            })
        );
    }

    protected function createRole()
    {
        $name = $this->argument('name') ??
            $this->ask('Enter role name');
        $description = $this->option('description') ??
            $this->ask('Enter role description (optional)');

        $existingRole = Role::where('name', $name)->first();
        if ($existingRole) {
            $this->error("Role '{$name}' already exists.");
            return;
        }

        $role = Role::create([
            'name' => $name,
            'description' => $description
        ]);

        $this->info("Role '{$name}' created successfully.");
    }

    protected function deleteRole()
    {
        $name = $this->argument('name') ??
            $this->ask('Enter role name to delete');

        $role = Role::where('name', $name)->first();

        if (!$role) {
            $this->error("Role '{$name}' not found.");
            return;
        }

        // Check if any users have this role
        $userCount = $role->users()->count();
        if ($userCount > 0) {
            if (!$this->confirm("This role is assigned to {$userCount} users. Do you want to continue?")) {
                return;
            }
        }

        $role->delete();
        $this->info("Role '{$name}' deleted successfully.");
    }
}
