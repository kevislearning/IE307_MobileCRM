Installation & Setup Guide

Prerequisites
- **PHP** >= 8.1
- **Composer**
- **Node.js** >= 18 (LTS) & **npm** or **yarn**
- **MySQL Database**
- **XAMPP** >= 3.3.0 (for Apache & MySQL)
- **Expo Go** 
## Setup Backend
- Navigate to the backend directory <br>
cd Backend (terminal)

- Install PHP dependencies <br>
composer install (terminal)

- Configure Environment <br>
cp .env.example to .env 

- Generate App Key & JWT Secret <br>
php artisan key:generate (terminal) <br>
php artisan jwt:secret (terminal)

- Migrate Database & Seed Fake Data <br>
php artisan migrate --seed (terminal)

- Start the Server <br>
Turn on XAMPP Control Panel, Start Apache and MySQL <br>
On terminal, write php artisan serve --host=0.0.0.0 --port=8000 and enter


## Frontend Setup

cd Frontend -> npm install -> npx expo start (Run on expo go)




