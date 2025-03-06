# Meta Ads Manager

This project is a Meta Ads Management System that allows users to manage ad campaigns, ad groups, and ads through the Meta Ads Marketing API. It includes both a backend built with Flask and a frontend developed with React.

## Requirements

- Docker (for containerization)
- Python 3.x (for the Flask backend)
- Node.js (for the React frontend)
- Flask and required Python packages (for the backend)
- SQLite (for the database)

## Project Setup

### 1. Clone the Repository


git clone https://github.com/adrfinance/meta-ads-manager.git
cd meta-ads-manager



### 2. Set Up Environment Variables



Create a .env file in the root of the project directory and add the following environment variables:


FLASK_APP=app.py
SECRET_KEY=your_secret_key
JWT_SECRET_KEY=your_jwt_secret_key
META_ACCESS_TOKEN=your_meta_access_token
DATABASE_URL=sqlite:///path_to_your_database
JWT_TOKEN_LOCATION=headers
AD_ACCOUNT_ID=your_ad_account_id
PAGE_ID=your_page_id


### 3. Docker Setup (Optional)
If you want to run the application using Docker, make sure Docker is installed, and then run the following command to build and start the containers:

docker-compose up --build


This will build both the backend and frontend containers and start them.



### 4. Install Backend Dependencies
To install the required Python packages for the Flask backend, you can use pip:

pip install -r requirements.txt


### 5. Database Migrations
Flask-Migrate is used to handle database migrations. To set up and apply migrations:

Initialize the database:


flask db init



Create migration scripts:

flask db migrate -m "Initial migration"


Apply the migrations:


flask db upgrade



### 6. Running the Backend Locally


To run the backend locally, execute:


flask run

This will start the backend server at http://localhost:5000.

### 7. Running the Frontend Locally
Navigate to the frontend folder and run:

npm install  # Install dependencies
npm start    # Start the React development server



The frontend will be available at http://localhost:3000.




### Contributing
Fork the repository.
Create a new branch (git checkout -b feature-branch).
Commit your changes (git commit -am 'Add feature').
Push to the branch (git push origin feature-branch).
Create a new Pull Request.



### License

This project is licensed under the MIT License

