Installation & Setup Guide

Prerequisites
- **PHP** >= 8.1
- **Composer**
- **Node.js** >= 18 (LTS) & **npm** or **yarn**
- **MySQL Database**
- **XAMPP** >= 3.3.0 (for Apache & MySQL)
- **Expo Go** 
## Setup Backend
- Navigate to the backend directory
cd Backend (terminal)

- Install PHP dependencies
composer install (terminal)

- Configure Environment
cp .env.example to .env 

- Generate App Key & JWT Secret
php artisan key:generate (terminal)
php artisan jwt:secret (terminal)

- Migrate Database & Seed Fake Data
php artisan migrate --seed (terminal)

- Start the Server
Turn on XAMPP Control Panel, Start Apache and MySQL
On terminal, write php artisan serve --host=0.0.0.0 --port=8000 and enter


## Frontend Setup

cd Frontend -> npm install -> npx expo start (Run on expo go)



