<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class CreateRoleImplementationCommand extends Command
{
    protected $signature = 'make:role-implementation';
    protected $description = 'Create complete role-based access implementation';

    public function handle()
    {
        // Ensure directories exist
        $this->ensureDirectories();

        // Create Migrations
        $this->createRolesMigration();
        $this->createAddRoleToUsersMigration();

        // Create/Update Models
        $this->createRoleModel();
        $this->updateUserModel();

        // Create Seeder
        $this->createRoleSeeder();

        // Create Middleware
        $this->createRoleMiddleware();

        // Update Kernel
        $this->updateKernel();

        $this->info('Role implementation created successfully!');
        $this->info('Next steps:');
        $this->info('1. Run php artisan migrate');
        $this->info('2. Run php artisan db:seed --class=RoleSeeder');
    }

    protected function ensureDirectories()
    {
        $directories = [
            app_path('Models'),
            app_path('Http/Middleware'),
            database_path('migrations'),
            database_path('seeders')
        ];

        foreach ($directories as $directory) {
            if (!File::exists($directory)) {
                File::makeDirectory($directory, 0755, true);
            }
        }
    }

    protected function createRolesMigration()
    {
        $filename = date('Y_m_d_His') . '_create_roles_table.php';
        $path = database_path('migrations/' . $filename);

        $stub = <<<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateRolesTable extends Migration
{
    public function up()
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('description')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('roles');
    }
}
PHP;

        File::put($path, $stub);
        $this->info('Created roles migration: ' . $filename);
    }

    protected function createAddRoleToUsersMigration()
    {
        $filename = date('Y_m_d_His', strtotime('+1 second')) . '_add_role_to_users_table.php';
        $path = database_path('migrations/' . $filename);

        $stub = <<<'PHP'
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddRoleToUsersTable extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('role_id')->nullable();
            $table->foreign('role_id')->references('id')->on('roles')->onDelete('set null');
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropColumn('role_id');
        });
    }
}
PHP;

        File::put($path, $stub);
        $this->info('Created add role to users migration: ' . $filename);
    }

    protected function createRoleModel()
    {
        $path = app_path('Models/Role.php');

        $stub = <<<'PHP'
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $fillable = ['name', 'description'];

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
PHP;

        File::put($path, $stub);
        $this->info('Created Role model');
    }

    protected function updateUserModel()
    {
        $path = app_path('Models/User.php');

        // Read existing content
        $content = File::get($path);

        // Check if methods already exist
        if (strpos($content, 'public function role()') === false) {
            // Find the last closing bracket
            $insertPosition = strrpos($content, '}');

            $methods = <<<'PHP'

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function hasRole($roleName)
    {
        return $this->role && $this->role->name === $roleName;
    }

    public function isAdmin()
    {
        return $this->hasRole('admin');
    }

    public function isSuperuser()
    {
        return $this->hasRole('superuser');
    }
}
PHP;

            // Insert the new methods
            $updatedContent = substr_replace($content, $methods, $insertPosition, 0);
            File::put($path, $updatedContent);
        }

        $this->info('Updated User model with role methods');
    }

    protected function createRoleSeeder()
    {
        $path = database_path('seeders/RoleSeeder.php');

        $stub = <<<'PHP'
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    public function run()
    {
        $roles = [
            ['name' => 'admin', 'description' => 'Full system access'],
            ['name' => 'superuser', 'description' => 'Advanced system access'],
            ['name' => 'user', 'description' => 'Standard user access']
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(
                ['name' => $role['name']],
                ['description' => $role['description']]
            );
        }
    }
}
PHP;

        File::put($path, $stub);
        $this->info('Created Role seeder');
    }

    protected function createRoleMiddleware()
    {
        $path = app_path('Http/Middleware/CheckRole.php');

        $stub = <<<'PHP'
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Auth;

class CheckRole
{
    public function handle($request, Closure $next, ...$roles)
    {
        if (!Auth::check()) {
            return redirect('login');
        }

        $userRole = Auth::user()->role ? Auth::user()->role->name : null;

        if ($userRole && in_array($userRole, $roles)) {
            return $next($request);
        }

        abort(403, 'Unauthorized access');
    }
}
PHP;

        File::put($path, $stub);
        $this->info('Created CheckRole middleware');
    }

    protected function updateKernel()
    {
        $path = app_path('Http/Kernel.php');
        $content = File::get($path);

        // Check if middleware already exists
        if (strpos($content, "'check.role' => \\App\\Http\\Middleware\\CheckRole::class,") === false) {
            // Find the routeMiddleware array and add our middleware
            $middlewareArray = "protected \$routeMiddleware = [\n";
            $newMiddleware = "        'check.role' => \\App\\Http\\Middleware\\CheckRole::class,\n";
            $updatedContent = str_replace(
                $middlewareArray,
                $middlewareArray . $newMiddleware,
                $content
            );

            File::put($path, $updatedContent);
            $this->info('Updated Kernel with CheckRole middleware');
        }
    }
}

